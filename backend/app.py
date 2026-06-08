from __future__ import annotations

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from store import JsonStore, resolve_data_file

load_dotenv()


def create_app(data_file: str | None = None) -> Flask:
    app = Flask(__name__)
    CORS(app)
    store = JsonStore(data_file or resolve_data_file())

    @app.get("/health")
    def health():
        return jsonify({"ok": True})

    @app.get("/api/collections")
    def list_collections():
        return jsonify(store.list_collections())

    @app.get("/api/export")
    def export_all():
        return jsonify(store.export_all())

    @app.post("/api/import")
    def import_all():
        imported = request.get_json(silent=True) or {}
        return jsonify({"imported": store.import_all(imported)})

    @app.get("/api/<collection>")
    def list_documents(collection: str):
        filters = {key: value for key, value in request.args.items() if not key.startswith("_")}
        return jsonify(store.list(collection, filters or None))

    @app.post("/api/<collection>")
    def create_document(collection: str):
        body = request.get_json(silent=True) or {}
        return jsonify(store.create(collection, body)), 201

    @app.get("/api/<collection>/<doc_id>")
    def get_document(collection: str, doc_id: str):
        doc = store.get(collection, doc_id)
        if doc is None:
            return jsonify({"error": "not found"}), 404
        return jsonify(doc)

    @app.patch("/api/<collection>/<doc_id>")
    def update_document(collection: str, doc_id: str):
        body = request.get_json(silent=True) or {}
        doc = store.update(collection, doc_id, body)
        if doc is None:
            return jsonify({"error": "not found"}), 404
        return jsonify(doc)

    @app.delete("/api/<collection>/<doc_id>")
    def delete_document(collection: str, doc_id: str):
        if store.delete(collection, doc_id):
            return jsonify({"ok": True})
        return jsonify({"error": "not found"}), 404

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5847")), debug=True)
