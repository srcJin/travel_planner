import { DayDocument, Document } from "@/lib/types";
import { compareItineraryDocs } from "@/lib/itinerary-meta";

type D = Record<string, unknown>;

function csvValue(value: unknown): string {
  const text = value == null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvTitle(doc: Document): string {
  const d = doc as D;
  if (doc._collection === "transportation") {
    const from = (d.from || "") as string;
    const to = (d.to || "") as string;
    if (from || to) return [from, to].filter(Boolean).join(" -> ");
  }
  return (d.title || d.name || doc._id) as string;
}

export function formatItineraryCsv(
  days: DayDocument[],
  getDocumentsForDay: (date: string) => Document[],
): string {
  const rows: unknown[][] = [[
    "day_number",
    "date",
    "day_location",
    "day_country",
    "collection",
    "time",
    "end_time",
    "title",
    "from",
    "to",
    "duration",
    "cost",
    "currency",
    "booking_status",
    "notes",
  ]];

  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const docs = [...getDocumentsForDay(day.date)].sort(compareItineraryDocs);
    if (docs.length === 0) {
      rows.push([day.day_number, day.date, day.location, day.country || "", "", "", "", "", "", "", "", "", "", "", day.notes || ""]);
      continue;
    }

    for (const doc of docs) {
      const d = doc as D;
      rows.push([
        day.day_number,
        day.date,
        day.location,
        day.country || "",
        doc._collection,
        d.time || d.check_in_time || "",
        d.end_time || d.check_out_time || "",
        csvTitle(doc),
        d.from || "",
        d.to || "",
        d.duration || "",
        d.cost || d.amount || d.price || "",
        d.currency || "",
        d.booking_status || "",
        d.notes || "",
      ]);
    }
  }

  return rows.map((row) => row.map(csvValue).join(",")).join("\n");
}

export function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
