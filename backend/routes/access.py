
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timezone

access_bp = Blueprint("access", __name__)

mongo = None


def init_access(database):
    global mongo
    mongo = database


# Request access to another division's document
@access_bp.route("/request", methods=["POST"])
@jwt_required()
def request_access():
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        doc_id = data.get("doc_id")

        if not doc_id or not ObjectId.is_valid(doc_id):
            return jsonify({"message": "Valid doc_id is required"}), 400

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        document = mongo.db.documents.find_one({
            "_id": ObjectId(doc_id)
        })

        if not document:
            return jsonify({"message": "Document not found"}), 404

        # Same division users already have access
        if user["division"] == document["division"]:
            return jsonify({
                "message": "You already have access to this document"
            }), 400

        # Check for an existing request
        existing = mongo.db.access_requests.find_one({
            "doc_id": doc_id,
            "requester_id": user_id,
            "status": "pending"
        })

        if existing:
            return jsonify({
                "message": "Access request is already pending",
                "request_id": str(existing["_id"])
            }), 409

        access_request = {
            "doc_id": doc_id,
            "requester_id": user_id,
            "requester_name": user["name"],
            "requester_division": user["division"],
            "owner_division": document["division"],
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "reviewed_by": None,
            "reviewed_at": None
        }

        result = mongo.db.access_requests.insert_one(access_request)

        return jsonify({
            "message": "Access request submitted successfully",
            "request_id": str(result.inserted_id),
            "status": "pending"
        }), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# View incoming requests for your division
@access_bp.route("/inbox", methods=["GET"])
@jwt_required()
def get_inbox():
    try:
        user_id = get_jwt_identity()

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        requests = mongo.db.access_requests.find({
            "owner_division": user["division"]
        })

        result = []

        for req in requests:
            result.append({
                "request_id": str(req["_id"]),
                "doc_id": req["doc_id"],
                "requester_id": req["requester_id"],
                "requester_name": req["requester_name"],
                "requester_division": req["requester_division"],
                "status": req["status"],
                "created_at": req["created_at"].isoformat()
            })

        return jsonify({
            "requests": result,
            "count": len(result)
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# Approve access request
@access_bp.route("/approve", methods=["POST"])
@jwt_required()
def approve_request():
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        request_id = data.get("request_id")

        if not request_id or not ObjectId.is_valid(request_id):
            return jsonify({"message": "Valid request_id is required"}), 400

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        access_request = mongo.db.access_requests.find_one({
            "_id": ObjectId(request_id)
        })

        if not access_request:
            return jsonify({"message": "Request not found"}), 404

        # Only users in the document owner's division can approve
        if user["division"] != access_request["owner_division"]:
            return jsonify({
                "message": "You cannot approve requests for another division"
            }), 403

        if access_request["status"] != "pending":
            return jsonify({
                "message": "This request has already been reviewed"
            }), 400

        mongo.db.access_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": {
                "status": "approved",
                "reviewed_by": user_id,
                "reviewed_at": datetime.now(timezone.utc)
            }}
        )

        return jsonify({
            "message": "Access request approved successfully",
            "status": "approved"
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# Reject access request
@access_bp.route("/reject", methods=["POST"])
@jwt_required()
def reject_request():
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        request_id = data.get("request_id")

        if not request_id or not ObjectId.is_valid(request_id):
            return jsonify({"message": "Valid request_id is required"}), 400

        user = mongo.db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({"message": "User not found"}), 404

        access_request = mongo.db.access_requests.find_one({
            "_id": ObjectId(request_id)
        })

        if not access_request:
            return jsonify({"message": "Request not found"}), 404

        if user["division"] != access_request["owner_division"]:
            return jsonify({
                "message": "You cannot reject requests for another division"
            }), 403

        if access_request["status"] != "pending":
            return jsonify({
                "message": "This request has already been reviewed"
            }), 400

        mongo.db.access_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": {
                "status": "rejected",
                "reviewed_by": user_id,
                "reviewed_at": datetime.now(timezone.utc)
            }}
        )

        return jsonify({
            "message": "Access request rejected successfully",
            "status": "rejected"
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500
