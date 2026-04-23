"""
OAuth2 routes
  GET  /oauth2/authorization/google   → redirect to Google consent
  GET  /oauth2/authorization/github   → redirect to GitHub consent
  GET  /oauth2/callback/google        → Google callback
  GET  /oauth2/callback/github        → GitHub callback
  GET  /api/me                        → return current session user
  POST /api/logout                    → clear session
"""

import secrets
import requests
from flask import Blueprint, redirect, request, session, jsonify, current_app
from urllib.parse import urlencode

from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__)

# ── helpers ────────────────────────────────────────────────────────────────────

def _upsert_user(email: str, name: str, avatar_url: str, provider: str, provider_id: str) -> User:
    """Create or update a user record and return it."""
    user = User.query.filter_by(email=email).first()
    if user is None:
        user = User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            provider=provider,
            provider_id=provider_id,
            trials=current_app.config["DEFAULT_TRIAL_COUNT"],
        )
        db.session.add(user)
    else:
        # Update mutable fields in case they changed on the provider side
        user.name = name
        user.avatar_url = avatar_url
    db.session.commit()
    return user


def _frontend_redirect(success: bool) -> str:
    origins = current_app.config["ALLOWED_ORIGINS"]
    base = origins[0].rstrip("/")
    return f"{base}" if success else f"{base}/login?error=auth_failed"


# ── Google ─────────────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@auth_bp.route("/oauth2/authorization/google")
def google_authorize():
    state = secrets.token_urlsafe(32)
    session["oauth_state"] = state
    params = {
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return redirect(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@auth_bp.route("/oauth2/callback/google")
def google_callback():
    # CSRF check
    if request.args.get("state") != session.pop("oauth_state", None):
        return redirect(_frontend_redirect(False))

    code = request.args.get("code")
    if not code:
        return redirect(_frontend_redirect(False))

    # Exchange code for token
    token_resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if not token_resp.ok:
        return redirect(_frontend_redirect(False))

    access_token = token_resp.json().get("access_token")

    # Fetch user info
    user_resp = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if not user_resp.ok:
        return redirect(_frontend_redirect(False))

    info = user_resp.json()
    user = _upsert_user(
        email=info["email"],
        name=info.get("name", info["email"]),
        avatar_url=info.get("picture", ""),
        provider="google",
        provider_id=info["sub"],
    )

    session["user_id"] = user.id
    session.permanent = False
    return redirect(_frontend_redirect(True))


# ── GitHub ─────────────────────────────────────────────────────────────────────

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USERINFO_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


@auth_bp.route("/oauth2/authorization/github")
def github_authorize():
    state = secrets.token_urlsafe(32)
    session["oauth_state"] = state
    params = {
        "client_id": current_app.config["GITHUB_CLIENT_ID"],
        "redirect_uri": current_app.config["GITHUB_REDIRECT_URI"],
        "scope": "read:user user:email",
        "state": state,
    }
    return redirect(f"{GITHUB_AUTH_URL}?{urlencode(params)}")


@auth_bp.route("/oauth2/callback/github")
def github_callback():
    if request.args.get("state") != session.pop("oauth_state", None):
        return redirect(_frontend_redirect(False))

    code = request.args.get("code")
    if not code:
        return redirect(_frontend_redirect(False))

    token_resp = requests.post(
        GITHUB_TOKEN_URL,
        data={
            "client_id": current_app.config["GITHUB_CLIENT_ID"],
            "client_secret": current_app.config["GITHUB_CLIENT_SECRET"],
            "code": code,
            "redirect_uri": current_app.config["GITHUB_REDIRECT_URI"],
        },
        headers={"Accept": "application/json"},
        timeout=10,
    )
    if not token_resp.ok:
        return redirect(_frontend_redirect(False))

    access_token = token_resp.json().get("access_token")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }

    # Fetch profile
    profile_resp = requests.get(GITHUB_USERINFO_URL, headers=headers, timeout=10)
    if not profile_resp.ok:
        return redirect(_frontend_redirect(False))

    profile = profile_resp.json()

    # Email may be null on the profile if the user set it private — fetch separately
    email = profile.get("email")
    if not email:
        emails_resp = requests.get(GITHUB_EMAILS_URL, headers=headers, timeout=10)
        if emails_resp.ok:
            primary = next(
                (e for e in emails_resp.json() if e.get("primary") and e.get("verified")),
                None,
            )
            email = primary["email"] if primary else None

    if not email:
        return redirect(_frontend_redirect(False))

    user = _upsert_user(
        email=email,
        name=profile.get("name") or profile.get("login", email),
        avatar_url=profile.get("avatar_url", ""),
        provider="github",
        provider_id=str(profile["id"]),
    )

    session["user_id"] = user.id
    session.permanent = False
    return redirect(_frontend_redirect(True))


# ── Session endpoints ──────────────────────────────────────────────────────────

@auth_bp.route("/api/me")
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({}), 200   # frontend treats empty object as unauthenticated
    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({}), 200
    return jsonify(user.to_dict()), 200


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"}), 200
