# Travel Planner

Shareable travel planner with a Next.js frontend and a small JSON-backed Flask backend.


## What Is Included

- Two-day mock travel plan, with no real bookings or personal records.
- Basic CRUD for days, activities, transportation, accommodation, costs, and metadata.
- JSON import/export for backup and handoff.
- A restored backend that persists to `backend/data/planner.json`.
- A built-in Next API fallback that persists to `frontend/src/lib/seed-data.json`.

The shared project intentionally excludes AI control, live transport search, todo/wishlist, version comparison, multi-tab planning, private docs, and private booking data.

## Run With Backend

Terminal 1:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Terminal 2:

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://127.0.0.1:5847 npm run dev
```

## Run Frontend Only

```bash
cd frontend
npm install
npm run dev
```

Frontend-only mode uses the built-in Next API and writes to `frontend/src/lib/seed-data.json`.

## Agent Data Workflow

- With backend: agents edit `backend/data/planner.json`.
- Frontend-only: agents edit `frontend/src/lib/seed-data.json`.
- Use Trip Settings -> Reload JSON after direct agent edits if the app is already open.


## Copyright

Copyright (c) 2026 Jin Gao. All rights reserved.