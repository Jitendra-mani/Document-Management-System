from flask import Flask, jsonify
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from gridfs import GridFS
from routes.auth import auth_bp, init_auth
from routes.documents import documents_bp, init_documents
from routes.access import access_bp, init_access
from routes.metadata import metadata_bp, init_metadata
from routes.search import search_bp, init_search
from config import Config

app = Flask(__name__)

app.config.from_object(Config)

CORS(app)

mongo = PyMongo(app)

jwt = JWTManager(app)

# Initialize GridFS
fs = GridFS(mongo.db)


# Initialize authentication
init_auth(mongo)

# Register authentication routes
app.register_blueprint(auth_bp, url_prefix="/api/auth")

# Documents
init_documents(mongo, fs)
app.register_blueprint(documents_bp, url_prefix="/api/documents")

# Initialize access control
init_access(mongo)

# Register access routes
app.register_blueprint(access_bp, url_prefix="/api/access")

init_metadata(mongo)
app.register_blueprint(metadata_bp, url_prefix="/api/metadata")

init_search(mongo)
app.register_blueprint(search_bp, url_prefix="/api/search")

@app.route("/")
def home():
    return jsonify({
        "message": "TRIAD AI DMS API is running"
    })


@app.route("/api/health")
def health():
    try:
        mongo.db.command("ping")

        return jsonify({
            "status": "success",
            "database": "MongoDB connected"
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)