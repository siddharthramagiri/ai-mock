"""
Resume routes
  POST /api/resume/upload   → upload PDF, extract text, parse with GROQ, store in DB
  GET  /api/resume          → return current user's parsed resume JSON
  DELETE /api/resume        → delete current user's resume
"""

import io
import json
import re
import logging

from flask import Blueprint, request, jsonify, session, current_app
from groq import Groq

from extensions import db
from models import User, Resume

try:
    import pdfplumber
    _PDF_BACKEND = "pdfplumber"
except ImportError:
    pdfplumber = None
    _PDF_BACKEND = None

try:
    import pymupdf  # PyMuPDF (fitz)
    _PDF_BACKEND = _PDF_BACKEND or "pymupdf"
except ImportError:
    pymupdf = None

logger = logging.getLogger(__name__)

resume_bp = Blueprint("resume", __name__)

# ── auth guard decorator ───────────────────────────────────────────────────────

def _current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    return User.query.get(uid)


# ── PDF text extraction ────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Try pdfplumber first, then PyMuPDF as fallback."""
    text = ""

    if pdfplumber:
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages = [p.extract_text() or "" for p in pdf.pages]
                text = "\n".join(pages).strip()
        except Exception as e:
            logger.warning("pdfplumber failed: %s", e)

    if not text and pymupdf:
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            pages = [doc[i].get_text() for i in range(len(doc))]
            text = "\n".join(pages).strip()
        except Exception as e:
            logger.warning("PyMuPDF failed: %s", e)

    return text


# ── GROQ resume parsing ────────────────────────────────────────────────────────

RESUME_PARSE_SYSTEM = """\
You are an expert resume parser. Your sole job is to extract structured data from raw resume text.

Return ONLY valid JSON — no markdown fences, no prose, no explanation.

Schema (all fields optional — use null if not present):
{
  "candidate_name": "string",
  "location": "string",
  "contact_details": ["string"],         // emails, phones, LinkedIn, GitHub, portfolio URLs
  "career_objective": "string",
  "skills": ["string"],                   // flat list of individual skills
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "duration": "string",
      "cgpa_or_percentage": "string"
    }
  ],
  "work_experience": [
    {
      "role": "string",
      "company": "string",
      "duration": "string",
      "responsibilities": ["string"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "tech_stack": ["string"],
      "description": "string",
      "links": ["string"]
    }
  ],
  "achievements": ["string"],
  "certifications": ["string"],
  "languages": ["string"],
  "extra_curricular": ["string"]
}
"""


def parse_resume_with_groq(raw_text: str, groq_client: Groq) -> dict:
    completion = groq_client.chat.completions.create(
        model=current_app.config["GROQ_MODEL"],
        messages=[
            {"role": "system", "content": RESUME_PARSE_SYSTEM},
            {
                "role": "user",
                "content": f"Parse the following resume:\n\n{raw_text[:12000]}",
            },
        ],
        temperature=0.1,
        max_tokens=2048,
    )
    raw = completion.choices[0].message.content.strip()
    # Strip possible accidental markdown fences
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


# ── routes ─────────────────────────────────────────────────────────────────────

@resume_bp.route("/api/resume/upload", methods=["POST"])
def upload_resume():
    user = _current_user()
    print(user)
    
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are accepted"}), 400

    file_bytes = file.read()
    if len(file_bytes) > 5 * 1024 * 1024:   # 5 MB guard
        return jsonify({"error": "File too large (max 5 MB)"}), 413

    # Extract text
    raw_text = extract_text_from_pdf(file_bytes)
    if not raw_text:
        return jsonify({"error": "Could not extract text from the PDF"}), 422

    # Parse with GROQ
    groq_client = Groq(api_key=current_app.config["GROQ_API_KEY"])
    try:
        parsed = parse_resume_with_groq(raw_text, groq_client)
    except Exception as e:
        logger.error("GROQ resume parse error: %s", e)
        return jsonify({"error": "Failed to parse resume with AI"}), 502

    # Upsert in DB
    resume = user.resume
    if resume is None:
        resume = Resume(user_id=user.id)
        db.session.add(resume)

    resume.resume_json = parsed
    resume.raw_text = raw_text[:50000]          # store first 50 k chars
    resume.original_filename = file.filename
    db.session.commit()

    return jsonify({"message": "Resume uploaded and parsed", "resume": resume.to_dict()}), 200


@resume_bp.route("/api/resume", methods=["GET"])
def get_resume():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not user.resume:
        return jsonify({"error": "No resume found"}), 404
    return jsonify(user.resume.to_dict()), 200


@resume_bp.route("/api/resume", methods=["DELETE"])
def delete_resume():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if user.resume:
        db.session.delete(user.resume)
        db.session.commit()
    return jsonify({"message": "Resume deleted"}), 200
