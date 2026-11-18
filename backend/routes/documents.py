
import json
from datetime import datetime, timezone, date
from io import BytesIO

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from werkzeug.utils import secure_filename

from services.ocr_service import extract_text_from_file


documents_bp = Blueprint("documents", __name__)

mongo = None
fs = None

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}


def init_documents(database, gridfs_storage):
    global mongo, fs
    mongo = database
    fs = gridfs_storage


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# Validate metadata using administrator-defined fields
def validate_metadata(metadata):
    fields = list(mongo.db.metadata_fields.find())

    definitions = {
        field["name"]: field
        for field in fields
    }

    # Reject metadata fields that are not configured
    unknown_fields = set(metadata.keys()) - set(definitions.keys())

    if unknown_fields:
        return False, (
            f"Unknown metadata fields: {', '.join(unknown_fields)}"
        )

    for name, definition in definitions.items():

        value = metadata.get(name)

        # Check required fields
        if definition.get("required", False):
            if value is None or value == "":
                return False, f"{definition['label']} is required"

        if value is None or value == "":
            continue

        field_type = definition["type"]

        if field_type == "text":
            if not isinstance(value, str):
                return False, f"{definition['label']} must be text"

        elif field_type == "number":
            if isinstance(value, bool) or not isinstance(
                value, (int, float)
            ):
                return False, f"{definition['label']} must be a number"

        elif field_type == "date":
            if not isinstance(value, str):
                return False, f"{definition['label']} must be a date"

            try:
                date.fromisoformat(value)
            except ValueError:
                return False, (
                    f"{definition['label']} must use YYYY-MM-DD format"
                )

        elif field_type == "dropdown":
            if value not in definition.get("options", []):
                return False, (
                    f"Invalid option for {definition['label']}. "
                    f"Allowed options: {definition.get('options', [])}"
                )

        elif field_type == "checkbox":
            if not isinstance(value, bool):
                return False, (
                    f"{definition['label']} must be true or false"
                )

    return True, None


# Upload document
@documents_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_document():
    try:
        user_id = get_jwt_identity()

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        if "file" not in request.files:
            return jsonify({"message": "No file provided"}), 400

        file = request.files["file"]

        if not file.filename:
            return jsonify({"message": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({
                "message": "Only PDF and image files are allowed"
            }), 400

        # Read metadata supplied with the upload
        metadata_string = request.form.get("metadata", "{}")

        try:
            metadata = json.loads(metadata_string)
        except json.JSONDecodeError:
            return jsonify({
                "message": "Invalid metadata JSON"
            }), 400

        if not isinstance(metadata, dict):
            return jsonify({
                "message": "Metadata must be a JSON object"
            }), 400

        # Validate metadata against dynamic definitions
        is_valid, error_message = validate_metadata(metadata)

        if not is_valid:
            return jsonify({"message": error_message}), 400

        # Division comes from authenticated user
        division = user["division"]

        filename = secure_filename(file.filename)

        # Read original file bytes
        file_bytes = file.read()

        if not file_bytes:
            return jsonify({"message": "Uploaded file is empty"}), 400

        # Extract text from PDF or image using OCR
        ocr_text = extract_text_from_file(
            file_bytes,
            filename
        )

        # Store original file in GridFS
        file_id = fs.put(
            file_bytes,
            filename=filename,
            content_type=(
                file.content_type or "application/octet-stream"
            )
        )

        # Prepare document information
        document = {
            "title": request.form.get("title", filename),
            "filename": filename,
            "file_id": file_id,
            "content_type": file.content_type,
            "division": division,
            "uploaded_by": user_id,
            "metadata": metadata,
            "ocr_text": ocr_text,
            "created_at": datetime.now(timezone.utc)
        }

        result = mongo.db.documents.insert_one(document)

        return jsonify({
            "message": "Document uploaded successfully",
            "document_id": str(result.inserted_id),
            "filename": filename,
            "division": division,
            "metadata": metadata,
            "ocr_text_extracted": bool(ocr_text.strip())
        }), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# List documents belonging to user's division
@documents_bp.route("", methods=["GET"])
@jwt_required()
def get_documents():
    try:
        user_id = get_jwt_identity()

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        # Restrict documents to user's division
        query = {
            "division": user["division"]
        }

        # Apply dynamic metadata filters
        for key, value in request.args.items():
            if key not in ["page", "limit"]:
                query[f"metadata.{key}"] = value

        documents = mongo.db.documents.find(query).sort(
            "created_at", -1
        )

        result = []

        for doc in documents:
            result.append({
                "id": str(doc["_id"]),
                "title": doc["title"],
                "filename": doc["filename"],
                "division": doc["division"],
                "metadata": doc.get("metadata", {}),
                "uploaded_by": doc["uploaded_by"],
                "created_at": doc["created_at"].isoformat()
            })

        return jsonify({
            "documents": result,
            "count": len(result)
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# Get details of a single document
@documents_bp.route("/<doc_id>", methods=["GET"])
@jwt_required()
def get_document_details(doc_id):
    try:
        user_id = get_jwt_identity()

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        if not ObjectId.is_valid(doc_id):
            return jsonify({"message": "Invalid document ID"}), 400

        document = mongo.db.documents.find_one({
            "_id": ObjectId(doc_id),
            "division": user["division"]
        })

        if not document:
            return jsonify({
                "message": "Document not found or access denied"
            }), 404

        uploader = mongo.db.users.find_one({
            "_id": ObjectId(document["uploaded_by"])
        })

        return jsonify({
            "id": str(document["_id"]),
            "title": document.get("title", ""),
            "filename": document.get("filename", ""),
            "division": document.get("division", ""),
            "uploaded_by": (
                uploader.get("name", "Unknown")
                if uploader else "Unknown"
            ),
            "metadata": document.get("metadata", {}),
            "ocr_text": document.get("ocr_text", ""),
            "created_at": (
                document["created_at"].isoformat()
                if document.get("created_at") else None
            )
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

# Download document
@documents_bp.route("/<doc_id>/download", methods=["GET"])
@jwt_required()
def download_document(doc_id):
    try:
        user_id = get_jwt_identity()

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        if not ObjectId.is_valid(doc_id):
            return jsonify({
                "message": "Invalid document ID"
            }), 400

        document = mongo.db.documents.find_one({
            "_id": ObjectId(doc_id)
        })

        if not document:
            return jsonify({
                "message": "Document not found"
            }), 404

        # Same-division users have access automatically
        if document["division"] != user["division"]:

            # Other divisions need an approved access request
            approved_request = mongo.db.access_requests.find_one({
                "doc_id": doc_id,
                "requester_id": user_id,
                "status": "approved"
            })

            if not approved_request:
                return jsonify({
                    "message": (
                        "Access denied. Request permission first."
                    )
                }), 403

        # Retrieve original file from GridFS
        stored_file = fs.get(document["file_id"])

        return send_file(
            BytesIO(stored_file.read()),
            mimetype=(
                document.get("content_type")
                or "application/octet-stream"
            ),
            as_attachment=True,
            download_name=document["filename"]
        )

    except Exception as e:
        return jsonify({"message": str(e)}), 500
