
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

auth_bp = Blueprint("auth", __name__)

mongo = None


def init_auth(database):
    global mongo
    mongo = database
    mongo.db.users.create_index("email", unique=True)


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"message": "JSON data is required"}), 400

        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        division = data.get("division", "").strip()

        if not all([name, email, password, division]):
            return jsonify({
                "message": "Name, email, password and division are required"
            }), 400

        if len(password) < 6:
            return jsonify({
                "message": "Password must contain at least 6 characters"
            }), 400

        if mongo.db.users.find_one({"email": email}):
            return jsonify({
                "message": "Email already registered"
            }), 409

        hashed_password = generate_password_hash(password)

        user = {
            "name": name,
            "email": email,
            "password": hashed_password,
            "division": division,
            "role": "user"
        }

        result = mongo.db.users.insert_one(user)

        return jsonify({
            "message": "User registered successfully",
            "user_id": str(result.inserted_id),
            "name": name,
            "email": email,
            "division": division,
            "role": "user"
        }), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"message": "JSON data is required"}), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({
                "message": "Email and password are required"
            }), 400

        user = mongo.db.users.find_one({"email": email})

        if not user or not check_password_hash(
            user["password"], password
        ):
            return jsonify({
                "message": "Invalid email or password"
            }), 401

        access_token = create_access_token(
            identity=str(user["_id"]),
            expires_delta=timedelta(hours=24)
        )

        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "division": user["division"],
                "role": user["role"]
            }
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500
