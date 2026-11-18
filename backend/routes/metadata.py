
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError

metadata_bp = Blueprint("metadata", __name__)

mongo = None

ALLOWED_TYPES = ["text", "number", "date", "dropdown", "checkbox"]


def init_metadata(database):
    global mongo
    mongo = database
    mongo.db.metadata_fields.create_index("name", unique=True)


def get_current_user():
    user_id = get_jwt_identity()
    return mongo.db.users.find_one({"_id": ObjectId(user_id)})


def admin_required():
    user = get_current_user()
    return user if user and user.get("role") == "admin" else None


# GET: View all metadata fields
@metadata_bp.route("", methods=["GET"])
@jwt_required()
def get_metadata():
    fields = list(mongo.db.metadata_fields.find())

    result = []
    for field in fields:
        result.append({
            "id": str(field["_id"]),
            "name": field["name"],
            "label": field["label"],
            "type": field["type"],
            "options": field.get("options", []),
            "required": field.get("required", False)
        })

    return jsonify({"fields": result}), 200


# POST: Create a new metadata field
@metadata_bp.route("", methods=["POST"])
@jwt_required()
def create_metadata():
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json() or {}

    name = data.get("name", "").strip().lower().replace(" ", "_")
    label = data.get("label", "").strip()
    field_type = data.get("type", "").strip().lower()
    options = data.get("options", [])
    required = data.get("required", False)

    if not name or not label or field_type not in ALLOWED_TYPES:
        return jsonify({"error": "Valid name, label and type are required"}), 400

    if field_type == "dropdown":
        if not isinstance(options, list) or len(options) == 0:
            return jsonify({"error": "Dropdown fields require options"}), 400
    else:
        options = []

    if not isinstance(required, bool):
        return jsonify({"error": "Required must be true or false"}), 400

    field = {
        "name": name,
        "label": label,
        "type": field_type,
        "options": options,
        "required": required,
        "created_at": datetime.now(timezone.utc)
    }

    try:
        result = mongo.db.metadata_fields.insert_one(field)
        return jsonify({
            "message": "Metadata field created successfully",
            "id": str(result.inserted_id)
        }), 201

    except DuplicateKeyError:
        return jsonify({"error": "A field with this name already exists"}), 409


# PUT: Update an existing metadata field
@metadata_bp.route("/<field_id>", methods=["PUT"])
@jwt_required()
def update_metadata(field_id):
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403

    if not ObjectId.is_valid(field_id):
        return jsonify({"error": "Invalid field ID"}), 400

    data = request.get_json() or {}

    updates = {}

    if "label" in data:
        label = data["label"].strip()
        if not label:
            return jsonify({"error": "Label cannot be empty"}), 400
        updates["label"] = label

    if "type" in data:
        field_type = data["type"].lower()
        if field_type not in ALLOWED_TYPES:
            return jsonify({"error": "Invalid field type"}), 400
        updates["type"] = field_type

    if "options" in data:
        options = data["options"]
        if not isinstance(options, list):
            return jsonify({"error": "Options must be a list"}), 400
        updates["options"] = options

    if "required" in data:
        if not isinstance(data["required"], bool):
            return jsonify({"error": "Required must be true or false"}), 400
        updates["required"] = data["required"]

    if not updates:
        return jsonify({"error": "No valid updates provided"}), 400

    result = mongo.db.metadata_fields.update_one(
        {"_id": ObjectId(field_id)},
        {"$set": updates}
    )

    if result.matched_count == 0:
        return jsonify({"error": "Metadata field not found"}), 404

    return jsonify({"message": "Metadata field updated successfully"}), 200


# DELETE: Delete a metadata field
@metadata_bp.route("/<field_id>", methods=["DELETE"])
@jwt_required()
def delete_metadata(field_id):
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403

    if not ObjectId.is_valid(field_id):
        return jsonify({"error": "Invalid field ID"}), 400

    result = mongo.db.metadata_fields.delete_one(
        {"_id": ObjectId(field_id)}
    )

    if result.deleted_count == 0:
        return jsonify({"error": "Metadata field not found"}), 404

    return jsonify({"message": "Metadata field deleted successfully"}), 200
