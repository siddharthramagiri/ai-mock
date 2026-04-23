"""
User routes
  GET   /api/user          → current user profile
  PATCH /api/user          → update name
  POST  /api/user/upgrade  → mock upgrade to Pro (wire to real payment later)
"""

from flask import Blueprint, jsonify, request, session
from extensions import db
from models import User

user_bp = Blueprint("user", __name__)


def _current_user():
    uid = session.get("user_id")
    return User.query.get(uid) if uid else None


@user_bp.route("/api/user", methods=["GET"])
def get_user():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(user.to_dict()), 200


@user_bp.route("/api/user", methods=["PATCH"])
def update_user():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    body = request.get_json(silent=True) or {}
    if "name" in body:
        user.name = body["name"].strip() or user.name
    db.session.commit()
    return jsonify(user.to_dict()), 200


@user_bp.route("/api/user/upgrade", methods=["POST"])
def upgrade_to_pro():
    """
    Placeholder endpoint — integrate Stripe/Razorpay webhook here.
    Call this after successful payment verification on the server.
    """
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    user.pro = True
    db.session.commit()
    return jsonify({"message": "Upgraded to Pro", "user": user.to_dict()}), 200
