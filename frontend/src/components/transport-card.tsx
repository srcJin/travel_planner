"use client";

import { Plane, TrainFront, Bus, Ship, Car, Trash2, Check } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { Document } from "@/lib/types";
import { useDocuments } from "@/hooks/use-trip-store";
import { isAnchorDocument } from "@/lib/itinerary-meta";

interface TransportCardProps {
  document: Document;
}

const TYPE_ICONS: Record<string, typeof Plane> = {
  flight: Plane,
  train: TrainFront,
  bus: Bus,
  ferry: Ship,
  car: Car,
  taxi: Car,
};

const TYPE_COLORS: Record<string, string> = {
  flight: "text-blue-600 bg-blue-50",
  train: "text-emerald-600 bg-emerald-50",
  bus: "text-orange-600 bg-orange-50",
  ferry: "text-cyan-600 bg-cyan-50",
  car: "text-gray-600 bg-gray-50",
  taxi: "text-yellow-600 bg-yellow-50",
};

function formatDuration(startTime: string, endTime: string): string | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;

  let diffMins = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMins < 0) diffMins += 24 * 60; // crosses midnight

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function TransportCard({ document: doc }: TransportCardProps) {
  const { remove, update } = useDocuments();
  const d = doc as Record<string, unknown>;
  const ready = d.ready === true;

  const type = (d.type || "train") as string;
  const from = (d.from || "") as string;
  const to = (d.to || "") as string;
  const time = (d.time || "") as string;
  const endTime = (d.end_time || "") as string;
  const duration = (d.duration || "") as string;
  const carrier = (d.carrier || "") as string;
  const flightNum = (d.flight_number || d.booking_ref || "") as string;
  const bookingStatus = (d.booking_status || "") as string;
  const needsBooking = (d.booking_required === true || bookingStatus === "unbooked") && bookingStatus !== "booked";

  const Icon = TYPE_ICONS[type] || TrainFront;
  const colorClass = TYPE_COLORS[type] || "text-gray-600 bg-gray-50";

  const computedDuration = duration || formatDuration(time, endTime);
  const isAnchor = isAnchorDocument(doc);
  const startTimeDisplay = time || "";
  const endTimeDisplay = endTime || "";
  const routeTitle = from && to ? `${from} → ${to}` : from || to || carrier || type;
  const metaLabel = [carrier, flightNum, computedDuration].filter(Boolean).join(" · ");

  return (
    <div
      className={`group/card border px-2 py-0.5 cursor-pointer transition-colors relative flex items-center gap-1.5 ${
        !ready ? "opacity-75" : ""
      } ${
        isAnchor
          ? "border-2 border-blue-500 bg-blue-50 hover:border-blue-600"
          : ready
            ? "border-blue-200 bg-blue-50/50 hover:border-blue-300"
            : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
      }`}
      onClick={(e) => { e.stopPropagation(); useUIStore.getState().openDetail(doc._collection, doc._id); }}
    >
      <button
        className="opacity-0 group-hover/card:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); remove(doc._collection, doc._id); }}
        title="Delete"
      >
        <Trash2 className="w-3 h-3" />
      </button>
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
      <div className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="w-2.5 h-2.5" />
      </div>
      <span className="min-w-0 flex-1 text-xs font-medium leading-tight text-gray-900 whitespace-normal break-words">{routeTitle}</span>
      {metaLabel && (
        <span className="hidden sm:inline max-w-[220px] text-[10px] leading-tight text-gray-500 whitespace-normal break-words">
          {metaLabel}
        </span>
      )}
      {bookingStatus && (
        <span className={`text-[9px] px-1 flex-shrink-0 ${
          bookingStatus === "booked" ? "text-green-700 bg-green-100" :
          bookingStatus === "pending" ? "text-yellow-700 bg-yellow-100" :
          bookingStatus === "cancelled" ? "text-red-700 bg-red-100" :
          "text-gray-500 bg-gray-100"
        }`}>
          {bookingStatus}
        </span>
      )}
    </div>
  );
}
