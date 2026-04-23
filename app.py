from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from extensions import db, session_ext
from routes.auth import auth_bp
from routes.resume import resume_bp
from routes.interview import interview_bp
from routes.user import user_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # 👇 ADD THIS LINE BEFORE init_app calls
    app.config["SESSION_SQLALCHEMY"] = db

    # Extensions
    db.init_app(app)
    session_ext.init_app(app)

    CORS(app, supports_credentials=True, origins=Config.ALLOWED_ORIGINS)

    # Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(resume_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(user_bp)

    with app.app_context():
        db.create_all()

    return app


app = create_app()

@app.route("/", methods=["GET"])
def health():
    return jsonify({"health": "OK", "status" : 200 }), 200

if __name__ == "__main__":
    app.run(debug=True, port=8080)
