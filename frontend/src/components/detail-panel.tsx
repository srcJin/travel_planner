"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useTripStore } from "@/store";
import { useDocuments } from "@/hooks/use-trip-store";
import { api } from "@/lib/api";
import { Document } from "@/lib/types";

// Field display config
const HIDDEN_FIELDS = new Set(["_id", "_collection"]);
const COST_FIELDS = new Set(["cost", "amount", "price"]);
const TIME_FIELDS = new Set(["time", "end_time", "check_in", "check_out", "departure", "arrival"]);
const DROPDOWN_OPTIONS: Record<string, string[]> = {
  booking_status: ["unbooked", "booked", "cancelled", "pending"],
  hierarchy: ["anchor", "semi_flexible", "flexible"],
  type: ["flight", "train", "bus", "ferry", "car", "taxi", "metro", "walk"],
  status: ["unplanned", "in_progress", "planned"],
};

const COLLECTION_STYLES: Record<string, { label: string; bg: string; border: string }> = {
  activities: { label: "Activity", bg: "bg-amber-50", border: "border-amber-200" },
  transportation: { label: "Transport", bg: "bg-blue-50", border: "border-blue-200" },
  accommodation: { label: "Stay", bg: "bg-green-50", border: "border-green-200" },
  costs: { label: "Cost", bg: "bg-purple-50", border: "border-purple-200" },
};

function formatFieldName(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DetailPanel() {
  const detailDoc = useUIStore((s) => s.detailDoc);
  const closeDetail = useUIStore((s) => s.closeDetail);
  const { update, remove } = useDocuments();
  const [doc, setDoc] = useState<Document | null>(null);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [showAddField, setShowAddField] = useState(false);

  // Load fresh doc whenever detailDoc changes
  useEffect(() => {
    if (!detailDoc) { setDoc(null); return; }
    api.getDocument(detailDoc.collection, detailDoc.id)
      .then((d) => setDoc(d as Document))
      .catch(() => setDoc(null));
  }, [detailDoc]);

  // Also refresh when store documents change
  const documents = useTripStore((s) => s.documents);
  useEffect(() => {
    if (!detailDoc) return;
    const col = documents[detailDoc.collection];
    if (col) {
      const found = col.find((d) => d._id === detailDoc.id);
      if (found) setDoc(found);
    }
  }, [documents, detailDoc]);

  if (!detailDoc || !doc) return null;

  const style = COLLECTION_STYLES[doc._collection] || { label: doc._collection, bg: "bg-gray-50", border: "border-gray-200" };

  const FIELD_ORDER = ["title", "name", "group", "hierarchy", "ui_highlight", "day", "start_date", "end_date", "time", "end_time", "duration", "opening_hours", "type", "from", "to", "carrier", "flight_number", "booking_ref", "cost", "booking_required", "booking_status", "booking_link", "exterior_only", "address", "confirmation", "country", "region", "want_to_go", "location", "show_on_map", "notes"];

  const fields = Object.entries(doc)
    .filter(([key]) => !HIDDEN_FIELDS.has(key))
    .sort((a, b) => {
      const ai = FIELD_ORDER.indexOf(a[0]);
      const bi = FIELD_ORDER.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  const handleSave = async (key: string, value: string | number) => {
    const parsed = COST_FIELDS.has(key) ? (parseFloat(String(value)) || 0) : value;
    await update(doc._collection, doc._id, { [key]: parsed });
  };

  const handleDelete = async () => {
    await remove(doc._collection, doc._id);
    closeDetail();
  };

  const handleAddField = async () => {
    if (!newFieldKey.trim() || newFieldKey in doc) return;
    let val: string | number = newFieldValue;
    if (val && !isNaN(Number(val))) val = Number(val);
    await update(doc._collection, doc._id, { [newFieldKey.trim()]: val || "" });
    setNewFieldKey("");
    setNewFieldValue("");
    setShowAddField(false);
  };

  const d = doc as Record<string, unknown>;
  const title = (
    d.title || d.name ||
    (d.from && d.to ? `${d.from} → ${d.to}` : null) ||
    (d.type ? `${d.type}` : null) ||
    doc._id
  ) as string;

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${style.bg} ${style.border}`}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{style.label}</div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
        </div>
        <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Title/name field first */}
        {fields.filter(([k]) => k === "title" || k === "name").slice(0, 1).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{formatFieldName(key)}</label>
            <input
              defaultValue={String(value ?? "")}
              onBlur={(e) => handleSave(key, e.target.value)}
              key={`${doc._id}-${key}`}
              className="w-full h-8 text-sm border border-gray-200 px-2"
            />
          </div>
        ))}

        {/* Remaining fields */}
        {fields.filter(([k]) => k !== "title" && k !== "name").map(([key, value]) => {
          const isDropdown = key in DROPDOWN_OPTIONS;
          const isTime = TIME_FIELDS.has(key);
          const isCost = COST_FIELDS.has(key);
          const isUrl = typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"));
          const isObject = typeof value === "object" && value !== null && !Array.isArray(value);
          const isArray = Array.isArray(value);
          const isBool = typeof value === "boolean";

          return (
            <div key={key} className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{formatFieldName(key)}</label>

              {isDropdown ? (
                <select
                  value={String(value ?? "")}
                  onChange={(e) => handleSave(key, e.target.value)}
                  className="w-full h-8 text-sm border border-gray-200 px-2 bg-white"
                >
                  <option value="">—</option>
                  {DROPDOWN_OPTIONS[key].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : isTime ? (
                <input
                  type="time"
                  value={String(value ?? "")}
                  onChange={(e) => handleSave(key, e.target.value)}
                  className="w-full h-8 text-sm border border-gray-200 px-2"
                />
              ) : isCost ? (
                <input
                  type="number"
                  value={String(value ?? 0)}
                  onChange={(e) => handleSave(key, parseFloat(e.target.value) || 0)}
                  className="w-full h-8 text-sm border border-gray-200 px-2"
                />
              ) : isBool ? (
                <input
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => handleSave(key, e.target.checked as unknown as string)}
                  className="h-4 w-4"
                />
              ) : isUrl ? (
                <div className="flex items-center gap-2">
                  <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline truncate flex-1">
                    {String(value)}
                  </a>
                  <input
                    defaultValue={String(value)}
                    onBlur={(e) => handleSave(key, e.target.value)}
                    className="flex h-8 w-full text-sm border border-gray-200 px-2"
                  />
                </div>
              ) : key === "show_on_map" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value !== false}
                    onChange={(e) => handleSave(key, e.target.checked as unknown as string)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Visible on map</span>
                </label>
              ) : key === "location" && isObject && "lat" in (value as Record<string, unknown>) ? (
                <div className="space-y-1">
                  {/* Geocode search */}
                  <LocationSearch onSelect={(lat, lng) => {
                    update(doc._collection, doc._id, { location: { lat, lng } });
                  }} />
                  {/* Manual lat/lng */}
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-[10px] text-gray-500">Lat</span>
                      <input
                        type="number"
                        step="0.0001"
                        defaultValue={(value as Record<string, unknown>).lat as number}
                        onBlur={(e) => {
                          const loc = value as Record<string, unknown>;
                          update(doc._collection, doc._id, { location: { lat: parseFloat(e.target.value) || 0, lng: loc.lng || 0 } });
                        }}
                        className="flex h-7 w-full text-sm border border-gray-200 px-1"
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-[10px] text-gray-500">Lng</span>
                      <input
                        type="number"
                        step="0.0001"
                        defaultValue={(value as Record<string, unknown>).lng as number}
                        onBlur={(e) => {
                          const loc = value as Record<string, unknown>;
                          update(doc._collection, doc._id, { location: { lat: loc.lat || 0, lng: parseFloat(e.target.value) || 0 } });
                        }}
                        className="flex h-7 w-full text-sm border border-gray-200 px-1"
                      />
                    </div>
                  </div>
                </div>
              ) : isObject ? (
                <pre className="text-xs bg-gray-50 p-2 border border-gray-100 overflow-x-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : isArray ? (
                <div className="text-sm text-gray-700">{(value as unknown[]).join(", ")}</div>
              ) : (
                <input
                  defaultValue={String(value ?? "")}
                  onBlur={(e) => handleSave(key, e.target.value)}
                  key={`${doc._id}-${key}`}
                  className="w-full h-8 text-sm border border-gray-200 px-2"
                />
              )}
            </div>
          );
        })}

        {/* Add field */}
        {showAddField && (
          <div className="flex items-center gap-2">
            <Input
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              placeholder="Field name"
              className="h-8 text-sm w-[120px]"
              autoFocus
            />
            <Input
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              placeholder="Value"
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddField()}
            />
            <Button size="sm" className="h-8 text-xs" onClick={handleAddField}>Add</Button>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50">
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowAddField(!showAddField)}>
          <Plus className="w-3.5 h-3.5" /> Field
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1 text-red-500 ml-auto"
          onClick={handleDelete}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}

function LocationSearch({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=4`
    );
    const data = await res.json();
    setResults(
      (data.features || []).map((f: { place_name: string; center: [number, number] }) => ({
        name: f.place_name,
        lat: f.center[1],
        lng: f.center[0],
      }))
    );
  };

  return (
    <div>
      <div className="flex gap-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search place..."
          className="flex-1 h-7 text-xs border border-gray-200 px-2"
        />
        <button onClick={handleSearch} className="text-xs text-blue-500 px-2 h-7 border border-gray-200">Go</button>
      </div>
      {results.length > 0 && (
        <div className="border border-gray-200 mt-1 max-h-[100px] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              className="block w-full px-2 py-1 text-left text-[11px] hover:bg-blue-50 border-b border-gray-50 last:border-0"
              onClick={() => { onSelect(r.lat, r.lng); setResults([]); setQuery(r.name.split(",")[0]); }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
