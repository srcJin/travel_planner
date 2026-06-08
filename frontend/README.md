# Travel Planner Frontend

Next.js frontend for the shareable travel planner.

## Run

```bash
npm install
npm run dev
```

By default, this uses the built-in Next API and writes to `src/lib/seed-data.json`.

To use the restored Flask backend:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:5847 npm run dev
```

Optional environment variable:

- `NEXT_PUBLIC_MAPBOX_TOKEN=...` for map display and geocoding

## Scope

Included:

- Basic CRUD
- JSON import/export
- Two-day mock seed data
- Map display and geocoding when a Mapbox token is provided

Intentionally excluded:

- AI chat/control
- Live transport search
- Todo/wishlist
- Version compare and multi-tab planning
- File attachments
