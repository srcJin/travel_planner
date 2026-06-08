"use client";

import { Trash2, Check } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useDocuments } from "@/hooks/use-trip-store";
import { Document } from "@/lib/types";
import { getHierarchyBadgeLabel, isAnchorDocument } from "@/lib/itinerary-meta";

interface ActivityCardProps {
  document: Document;
  colorScheme?: "amber" | "teal";
}

export function ActivityCard({ document: doc, colorScheme = "amber" }: ActivityCardProps) {
  const { remove, update } = useDocuments();
  const d = doc as Record<string, unknown>;
  const ready = d.ready === true;

  const title = (d.title || d.name || "") as string;
  const time = (d.time || "") as string;
  const endTime = (d.end_time || "") as string;
  const duration = (d.duration || "") as string;
  const bookingStatus = (d.booking_status || "") as string;
  const needsBooking = (d.booking_required === true || bookingStatus === "unbooked") && bookingStatus !== "booked";
  const notes = (d.notes || "") as string;
  const hierarchyLabel = getHierarchyBadgeLabel(doc);
  const isAnchor = isAnchorDocument(doc);
  const hierarchy = ((d.hierarchy || "") as string);

  // Warning detection: cancelled bookings, TBD times, action-needed notes
  const TBD_RE = /\bTBD\b|pending|needed|rebook|TODO/i;
  const hasWarning = bookingStatus === "cancelled"
    || TBD_RE.test(time)
    || TBD_RE.test(title)
    || TBD_RE.test(notes);

  // Compute end time from duration if not set
  let computedEnd = endTime;
  if (time && !endTime && duration) {
    const [h, m] = time.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const hMatch = duration.match(/(\d+)h/);
      const mMatch = duration.match(/(\d+)m/);
      const durMins = (hMatch ? parseInt(hMatch[1]) * 60 : 0) + (mMatch ? parseInt(mMatch[1]) : 0);
      if (durMins > 0) {
        const endMins = h * 60 + m + durMins;
        computedEnd = `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;
      }
    }
  }

  const startTimeDisplay = time || "";
  const endTimeDisplay = computedEnd || "";

  return (
    <div
      className={`group/card border px-2 py-0.5 cursor-pointer transition-colors relative flex items-center gap-1.5 ${
        !ready ? "opacity-75" : ""
      } ${
        hasWarning && !ready
          ? "border-red-300 bg-red-50 hover:border-red-400"
          : isAnchor
            ? colorScheme === "teal"
              ? "border-2 border-teal-500 bg-teal-50 hover:border-teal-600"
              : "border-2 border-amber-500 bg-amber-50 hover:border-amber-600"
            : ready
              ? colorScheme === "teal"
                ? "border-teal-200 bg-teal-50/50 hover:border-teal-300"
                : "border-amber-200 bg-amber-50/50 hover:border-amber-300"
              : hierarchy === "semi_flexible"
                ? "border-blue-200 bg-blue-50/60 hover:border-blue-300"
                : hierarchy === "flexible"
                  ? "border-gray-200 bg-gray-50/40 hover:border-gray-300"
              : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
      }`}
      onClick={(e) => { e.stopPropagation(); useUIStore.getState().openDetail(doc._collection, doc._id); }}
    >
      <button
        className={`w-3.5 h-3.5 flex-shrink-0 border rounded-sm flex items-center justify-center transition-colors ${
          ready ? "bg-green-500 border-green-500 text-white"
            : needsBooking ? "border-amber-400 bg-amber-50 text-amber-600"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={(e) => { e.stopPropagation(); update(doc._collection, doc._id, { ready: !ready }); }}
        title={needsBooking && !ready ? "Booking needed" : undefined}
      >
        {ready ? <Check className="w-2.5 h-2.5" /> : needsBooking ? <span className="text-[9px] font-bold leading-none">!</span> : null}
      </button>
      {startTimeDisplay && (
        <span className="flex flex-col items-center justify-center flex-shrink-0 text-gray-800 bg-white/70 border border-gray-200 px-1.5 py-0.5 w-[60px] leading-[1.05]">
          <span className="text-[11px] font-mono font-semibold">{startTimeDisplay}</span>
          {endTimeDisplay && (
            <span className="text-[11px] font-mono font-normal text-gray-500">{endTimeDisplay}</span>
          )}
        </span>
      )}
      {hasWarning && <span className="text-[10px] flex-shrink-0">⚠️</span>}
      <span className={`min-w-0 flex-1 text-xs font-medium leading-tight whitespace-normal break-words ${hasWarning && !ready ? "text-red-800" : "text-gray-900"}`}>{title}</span>
      {hierarchyLabel && isAnchor && (
        <span className={`text-[9px] px-1 flex-shrink-0 ${
          isAnchor
            ? colorScheme === "teal"
              ? "text-teal-700 bg-teal-100"
              : "text-amber-800 bg-amber-100"
            : "text-gray-600 bg-gray-100"
        }`}>{hierarchyLabel}</span>
      )}
      {bookingStatus && bookingStatus !== "unbooked" && (
        <span className={`text-[9px] px-1 flex-shrink-0 ${
          bookingStatus === "booked" ? "text-green-700 bg-green-100" :
          bookingStatus === "pending" ? "text-yellow-700 bg-yellow-100" :
          bookingStatus === "cancelled" ? "text-red-700 bg-red-100" :
          "text-gray-500 bg-gray-100"
        }`}>{bookingStatus}</span>
      )}
      <button
        className="opacity-0 group-hover/card:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); remove(doc._collection, doc._id); }}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
