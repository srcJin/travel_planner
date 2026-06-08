from __future__ import annotations

import copy
import json
import os
import uuid
from pathlib import Path
from typing import Any


Document = dict[str, Any]
StoreData = dict[str, list[Document]]


class JsonStore:
    def __init__(self, data_file: str):
        self.data_file = Path(data_file)

    def _read(self) -> StoreData:
        if not self.data_file.exists():
            return {}
        with self.data_file.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return self._normalize(data)

    def _write(self, data: StoreData) -> None:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        with self.data_file.open("w", encoding="utf-8") as f:
            json.dump(self._normalize(data), f, indent=2, ensure_ascii=False)
            f.write("\n")

    @staticmethod
    def _normalize(data: StoreData) -> StoreData:
        normalized: StoreData = {}
        for collection, docs in data.items():
            if not isinstance(docs, list):
                normalized[collection] = []
                continue
            normalized[collection] = [
                {
                    **doc,
                    "_id": str(doc.get("_id") or uuid.uuid4().hex[:8]),
                    "_collection": collection,
                }
                for doc in docs
                if isinstance(doc, dict)
            ]
        return normalized

    @staticmethod
    def _clone(value: Any) -> Any:
        return copy.deepcopy(value)

    def list_collections(self) -> list[str]:
        return list(self._read().keys())

    def export_all(self) -> StoreData:
        return self._clone(self._read())

    def import_all(self, imported: StoreData) -> int:
        data = self._read()
        imported_count = 0
        for collection, docs in imported.items():
            if not isinstance(docs, list):
                continue
            by_id = {str(doc.get("_id")): doc for doc in data.get(collection, [])}
            for raw_doc in docs:
                if not isinstance(raw_doc, dict):
                    continue
                doc_id = str(raw_doc.get("_id") or uuid.uuid4().hex[:8])
                by_id[doc_id] = {
                    **raw_doc,
                    "_id": doc_id,
                    "_collection": collection,
                }
                imported_count += 1
            data[collection] = list(by_id.values())
        self._write(data)
        return imported_count

    def list(self, collection: str, filters: dict[str, str] | None = None) -> list[Document]:
        docs = self._read().get(collection, [])
        if filters:
            docs = [
                doc
                for doc in docs
                if all(str(doc.get(key, "")) == value for key, value in filters.items())
            ]
        return self._clone(docs)

    def get(self, collection: str, doc_id: str) -> Document | None:
        for doc in self._read().get(collection, []):
            if str(doc.get("_id")) == doc_id:
                return self._clone(doc)
        return None

    def create(self, collection: str, raw_doc: Document) -> Document:
        data = self._read()
        doc_id = str(raw_doc.get("_id") or uuid.uuid4().hex[:8])
        doc = {
            **raw_doc,
            "_id": doc_id,
            "_collection": collection,
        }
        data[collection] = [*data.get(collection, []), doc]
        self._write(data)
        return self._clone(doc)

    def update(self, collection: str, doc_id: str, updates: Document) -> Document | None:
        data = self._read()
        docs = data.get(collection, [])
        for index, current in enumerate(docs):
            if str(current.get("_id")) != doc_id:
                continue
            next_doc = {
                **current,
                **updates,
                "_id": doc_id,
                "_collection": collection,
            }
            docs[index] = next_doc
            data[collection] = docs
            self._write(data)
            return self._clone(next_doc)
        return None

    def delete(self, collection: str, doc_id: str) -> bool:
        data = self._read()
        docs = data.get(collection, [])
        next_docs = [doc for doc in docs if str(doc.get("_id")) != doc_id]
        if len(next_docs) == len(docs):
            return False
        data[collection] = next_docs
        self._write(data)
        return True


def resolve_data_file() -> str:
    default = Path(__file__).parent / "data" / "planner.json"
    return os.environ.get("DATA_FILE", str(default))
