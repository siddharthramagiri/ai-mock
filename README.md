# AI Mock Interview

## Stack

| Layer | Technology |
|---|---|
| Framework | Flask 3, React.JSś |
| Database | PostgreSQL on **Neon** (serverless) |
| ORM | Flask-SQLAlchemy |
| Sessions | Flask-Session (server-side, stored in DB) |
| OAuth2 | Custom (**Google** + **GitHub**) |
| LLM | **GROQ** — `llama-3.3-70b-versatile` |
| PDF parsing | pdfplumber + PyMuPDF (fallback) |

---

## Project structure

```
root/
├── Frontend-v1/
│   └── ...
├── app.py              # Factory + entry point
├── config.py           # All env-based config
├── extensions.py       # db, session singletons
├── models.py           # User, Resume models
├── requirements.txt
├── .env.example        # Copy → .env and fill in
└── routes/
    ├── auth.py         # OAuth2 + /api/me + /api/logout
    ├── resume.py       # PDF upload, parse, store
    ├── interview.py    # Interview session (start/answer/end)
    └── user.py         # Profile + upgrade
```

---

## Quick start

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env          # fill in real values

python app.py                 # dev server on :8080
```

---

## API reference

### Auth

| Method | Path | Description |
|---|---|---|
| GET | `/oauth2/authorization/google` | Redirect to Google consent |
| GET | `/oauth2/authorization/github` | Redirect to GitHub consent |
| GET | `/oauth2/callback/google` | Google callback → sets session |
| GET | `/oauth2/callback/github` | GitHub callback → sets session |
| GET | `/api/me` | Returns current user JSON (or `{}`) |
| POST | `/api/logout` | Clears server session |

### Resume

| Method | Path | Body / Notes |
|---|---|---|
| POST | `/api/resume/upload` | `multipart/form-data` with `file` (PDF ≤ 5 MB) |
| GET | `/api/resume` | Returns stored `resume_json` |
| DELETE | `/api/resume` | Deletes resume |

### Interview

| Method | Path | Body |
|---|---|---|
| POST | `/api/interview/start` | `{ company, jobRole, resumeData? }` |
| POST | `/api/interview/answer` | `{ answer: "candidate's spoken reply" }` |
| POST | `/api/interview/end` | `{}` — triggers final report |

**Interview response schema:**
```json
{
  "interviewer_message": "string",
  "question": "string | null",
  "question_type": "behavioral | technical | company_fit | curveball | closing",
  "feedback_on_previous": "string | null",
  "interview_complete": false,
  "final_report": null
}
```

### User

| Method | Path | Description |
|---|---|---|
| GET | `/api/user` | Current user |
| PATCH | `/api/user` | Update name |
| POST | `/api/user/upgrade` | Grant Pro (wire to payment webhook) |

---

## OAuth2 setup

### Google
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Authorised redirect URI: `http://localhost:8080/oauth2/callback/google`
4. Copy Client ID + Secret → `.env`

### GitHub
1. Go to GitHub → Settings → Developer Settings → OAuth Apps → New
2. Callback URL: `http://localhost:8080/oauth2/callback/github`
3. Copy Client ID + Secret → `.env`


## Neon PostgreSQL setup

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled connection string** from the dashboard
3. Paste into `DATABASE_URL` in `.env`  
   *(format: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)*
4. Tables are auto-created on first run (`db.create_all()`)


## GROQ setup

1. Sign up at [console.groq.com](https://console.groq.com)
2. Generate an API key → paste into `GROQ_API_KEY` in `.env`
3. Default model: `llama-3.3-70b-versatile` (fast + capable)
