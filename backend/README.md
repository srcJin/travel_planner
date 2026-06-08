# Travel Planner Backend

Shareable JSON-backed API for the travel planner.

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API listens on `http://127.0.0.1:5847` by default.

## Data

Records live in `backend/data/planner.json`. Agents can edit that file directly, then the frontend can reload data from Trip Settings.

Supported API surface:

- `GET /health`
- `GET /api/collections`
- `GET /api/export`
- `POST /api/import`
- `GET /api/:collection`
- `POST /api/:collection`
- `GET /api/:collection/:id`
- `PATCH /api/:collection/:id`
- `DELETE /api/:collection/:id`

This backend intentionally excludes AI, live transport search, version/workspace snapshots, auth, and private booking data.
