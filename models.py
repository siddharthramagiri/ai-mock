from datetime import datetime, timezone
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.Text, nullable=True)
    provider = db.Column(db.String(50), nullable=False)   # "google" | "github"
    provider_id = db.Column(db.String(255), nullable=False)
    pro = db.Column(db.Boolean, default=False, nullable=False)
    trials = db.Column(db.Integer, default=3, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # one-to-one relationship
    resume = db.relationship("Resume", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "provider": self.provider,
            "pro": self.pro,
            "trials": self.trials,
            "resume": self.resume.to_dict() if self.resume else None,
        }


class Resume(db.Model):
    __tablename__ = "resumes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    # Parsed JSON stored as JSONB — full structured data extracted by LLM
    resume_json = db.Column(db.JSON, nullable=True)
    # Raw extracted text (for re-processing or debug)
    raw_text = db.Column(db.Text, nullable=True)
    original_filename = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User", back_populates="resume")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "resume_json": self.resume_json,
            "original_filename": self.original_filename,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
