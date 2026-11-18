
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import re

search_bp = Blueprint("search", __name__)

mongo = None


def init_search(database):
    global mongo
    mongo = database


@search_bp.route("", methods=["GET"])
@jwt_required()
def search_documents():
    try:
        user_id = get_jwt_identity()

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        search_query = request.args.get("q", "").strip()

        if not search_query:
            return jsonify({
                "message": "Please provide a search query"
            }), 400

        # Escape special regex characters
        search_pattern = re.escape(search_query)

        # Search only documents belonging to user's division
        query = {
            "division": user["division"],
            "$or": [
                {"title": {"$regex": search_pattern, "$options": "i"}},
                {"filename": {"$regex": search_pattern, "$options": "i"}},
                {"ocr_text": {"$regex": search_pattern, "$options": "i"}}
            ]
        }

        documents = mongo.db.documents.find(query).sort(
            "created_at", -1
        )

        results = []

        for doc in documents:
            results.append({
                "id": str(doc["_id"]),
                "title": doc["title"],
                "filename": doc["filename"],
                "division": doc["division"],
                "metadata": doc.get("metadata", {}),
                "created_at": doc["created_at"].isoformat()
            })

        return jsonify({
            "query": search_query,
            "count": len(results),
            "results": results
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500
