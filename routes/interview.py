"""
Interview routes
  POST /api/interview/start          → create new interview context, return first question
  POST /api/interview/answer         → submit answer, get next question + feedback
  POST /api/interview/end            → close session, return final report
"""

import json
import logging
import re

from flask import Blueprint, request, jsonify, session, current_app
from groq import Groq

from models import User

logger = logging.getLogger(__name__)
interview_bp = Blueprint("interview", __name__)

# ──────────────────────────────────────────────────────────────────────────────
# Prompt engineering
# ──────────────────────────────────────────────────────────────────────────────

def _build_system_prompt(resume: dict, company: str, job_role: str) -> str:
    """
    Constructs a rich, role-aware system prompt.

    Design principles
    -----------------
    • Persona: a real interviewer at the target company — not a generic bot.
    • Depth: questions adapt to the candidate's actual background.
    • Variability: company culture, role expectations, and interview style all
      shape the tone and question types.
    • Realism: includes natural follow-ups, slight challenges, and silence
      management — just like a live panel.
    """

    company_profiles = {
        "google": {
            "style": "highly structured; uses the STAR method; heavy on behavioral and systems-design",
            "focus": "scalability, data structures & algorithms, code quality, Googleyness (collaboration, ownership)",
            "rounds": "phone screen → technical x 2 → systems design → Googleyness",
        },
        "amazon": {
            "style": "leadership-principle-driven; every answer must map to an LP",
            "focus": "customer obsession, ownership, dive deep, deliver results, frugality",
            "rounds": "LP behavioral → bar-raiser technical → system design",
        },
        "microsoft": {
            "style": "growth-mindset focus; mix of coding, design, and culture-fit",
            "focus": "problem-solving clarity, communication, impact, inclusive collaboration",
            "rounds": "recruiter screen → technical x 2 → design → as-appropriate loop",
        },
        "meta": {
            "style": "fast-paced; emphasises impact and moving fast; direct feedback culture",
            "focus": "building impactful products, data-driven decisions, cross-functional work",
            "rounds": "technical screen → coding x 2 → systems design → behavioral",
        },
        "startup": {
            "style": "informal but thorough; values ownership and versatility",
            "focus": "full-stack breadth, shipping quickly, wearing many hats, cultural add",
            "rounds": "culture fit → technical take-home or live coding → founder chat",
        },
    }

    company_lower = company.lower() if company else ""
    profile_key = next((k for k in company_profiles if k in company_lower), None)
    profile = company_profiles.get(profile_key, {
        "style": "professional and structured; mix of behavioral and technical questions",
        "focus": "relevant technical skills, problem solving, communication, cultural fit",
        "rounds": "phone screen → technical interview → behavioral round",
    })

    candidate_summary = _summarize_candidate(resume)

    return f"""You are a seasoned Senior Hiring Manager and Lead Interviewer at **{company or 'a top tech company'}**, 
conducting a real-time job interview for the role of **{job_role or 'Software Engineer'}**.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERVIEW STYLE & COMPANY CULTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Interview style : {profile['style']}
• Key focus areas : {profile['focus']}
• Typical rounds  : {profile['rounds']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANDIDATE PROFILE (from resume)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{candidate_summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR RULES AS THE INTERVIEWER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. **Stay in character.** You are a real interviewer, not an AI assistant.
2. **Ask ONE question at a time.** Never dump a list of questions.
3. **React naturally.** If the candidate gives a great answer, say so briefly 
   before moving on. If they miss something, probe with a follow-up.
4. **Adapt depth.** For technical roles, dig into implementation details. 
   For PM/design roles, focus on product thinking and trade-offs.
5. **Reference their resume.** Tie questions to their actual projects, skills, 
   and experiences — don't ask generic questions when specific ones are available.
6. **Mix question types** across the conversation:
   - Behavioral (STAR-based) — situational, past behavior
   - Technical / domain-specific — coding concepts, design, tools they listed
   - Company-specific — how they align with {company or "the company"}'s mission/values
   - Curveball — one intentionally tough or unexpected question
7. **Provide brief inline feedback** after each answer (1-2 sentences) 
   so the candidate can learn in real time.
8. **Do NOT reveal** that you are an AI or that this is a simulation.
9. **JSON output only** — respond in the exact schema below, no extra text.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE SCHEMA  (strict JSON, no markdown fences)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{
  "interviewer_message": "Your spoken words to the candidate (greeting, reaction, or follow-up)",
  "question": "The single interview question you are asking now",
  "question_type": "behavioral | technical | company_fit | curveball | closing",
  "feedback_on_previous": "Brief constructive feedback on the candidate's last answer (null for first question)",
  "interview_complete": false
}}

When it is time to wrap up (after 8-10 exchanges or candidate says 'end interview'), 
set interview_complete to true and add a final_report field:
{{
  "interviewer_message": "Thank you message",
  "question": null,
  "question_type": "closing",
  "feedback_on_previous": "...",
  "interview_complete": true,
  "final_report": {{
    "overall_score": 0-100,
    "strengths": ["..."],
    "areas_for_improvement": ["..."],
    "hiring_recommendation": "Strong Yes | Yes | Maybe | No",
    "summary": "2-3 sentence overall assessment"
  }}
}}
"""


def _summarize_candidate(resume: dict) -> str:
    if not resume:
        return "No resume data provided."

    lines = []
    if resume.get("candidate_name"):
        lines.append(f"Name       : {resume['candidate_name']}")
    if resume.get("career_objective"):
        lines.append(f"Objective  : {resume['career_objective'][:300]}")
    if resume.get("skills"):
        lines.append(f"Skills     : {', '.join(resume['skills'][:20])}")
    if resume.get("education"):
        edu = resume["education"][0]
        lines.append(f"Education  : {edu.get('degree')} @ {edu.get('institution')} ({edu.get('duration')})")
    if resume.get("work_experience"):
        for exp in resume["work_experience"][:2]:
            lines.append(f"Experience : {exp.get('role')} @ {exp.get('company')} ({exp.get('duration')})")
    if resume.get("projects"):
        for proj in resume["projects"][:3]:
            lines.append(f"Project    : {proj.get('title')} — {proj.get('description', '')[:150]}")
    if resume.get("achievements"):
        lines.append(f"Achievements: {'; '.join(resume['achievements'][:5])}")
    return "\n".join(lines) if lines else "No structured data available."


def _opening_user_prompt(company: str, job_role: str) -> str:
    return (
        f"Please begin the interview for the {job_role or 'Software Engineer'} position "
        f"at {company or 'the company'}. "
        "Start with a warm professional greeting, a brief agenda, and your first question."
    )


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

def _current_user():
    uid = session.get("user_id")
    return User.query.get(uid) if uid else None


def _call_groq(messages: list, system_prompt: str) -> dict:
    client = Groq(api_key=current_app.config["GROQ_API_KEY"])
    completion = client.chat.completions.create(
        model=current_app.config["GROQ_MODEL"],
        messages=[{"role": "system", "content": system_prompt}] + messages,
        temperature=0.75,
        max_tokens=1024,
    )
    raw = completion.choices[0].message.content.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


@interview_bp.route("/api/interview/start", methods=["POST"])
def start_interview():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    # Check trial / pro gate
    if user.trials <= 0 and not user.pro:
        return jsonify({"error": "No trials remaining. Please upgrade to Pro."}), 403

    body = request.get_json(silent=True) or {}
    company = (body.get("company") or "").strip()
    job_role = (body.get("jobRole") or "").strip()
    resume_data = body.get("resumeData") or (user.resume.resume_json if user.resume else {})

    system_prompt = _build_system_prompt(resume_data, company, job_role)
    opening_msg = _opening_user_prompt(company, job_role)

    try:
        response = _call_groq(
            messages=[{"role": "user", "content": opening_msg}],
            system_prompt=system_prompt,
        )
    except Exception as e:
        logger.error("GROQ start error: %s", e)
        return jsonify({"error": "AI service unavailable"}), 502

    # Store interview context in server-side session
    session["interview"] = {
        "company": company,
        "job_role": job_role,
        "resume_data": resume_data,
        "system_prompt": system_prompt,
        "history": [
            {"role": "user", "content": opening_msg},
            {"role": "assistant", "content": json.dumps(response)},
        ],
        "exchange_count": 1,
    }

    return jsonify(response), 200


@interview_bp.route("/api/interview/answer", methods=["POST"])
def submit_answer():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    interview = session.get("interview")
    if not interview:
        return jsonify({"error": "No active interview session"}), 400

    body = request.get_json(silent=True) or {}
    answer_text = (body.get("answer") or "").strip()
    if not answer_text:
        return jsonify({"error": "Answer is required"}), 400

    history = interview["history"]
    history.append({"role": "user", "content": answer_text})

    try:
        response = _call_groq(
            messages=history,
            system_prompt=interview["system_prompt"],
        )
    except Exception as e:
        logger.error("GROQ answer error: %s", e)
        return jsonify({"error": "AI service unavailable"}), 502

    history.append({"role": "assistant", "content": json.dumps(response)})
    interview["exchange_count"] += 1
    session["interview"] = interview   # persist updated session
    session.modified = True

    # If interview wrapped up → deduct trial
    if response.get("interview_complete"):
        _finalize_interview(user)

    return jsonify(response), 200


@interview_bp.route("/api/interview/end", methods=["POST"])
def end_interview():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    interview = session.get("interview")
    if not interview:
        return jsonify({"message": "No active interview to end"}), 200

    history = interview["history"]
    history.append({"role": "user", "content": "end interview"})

    try:
        response = _call_groq(
            messages=history,
            system_prompt=interview["system_prompt"],
        )
    except Exception as e:
        logger.error("GROQ end error: %s", e)
        response = {"interview_complete": True, "interviewer_message": "Thank you for your time!"}

    _finalize_interview(user)
    session.pop("interview", None)

    return jsonify(response), 200


def _finalize_interview(user: User):
    """Deduct one trial if the user is not on Pro."""
    from extensions import db
    if not user.pro and user.trials > 0:
        user.trials -= 1
        db.session.commit()
    session.pop("interview", None)
