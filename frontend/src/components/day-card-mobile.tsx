"use client";
import { Button } from "@/components/ui/button";
import { MapPin, Train, Hotel, ChevronRight, ChevronDown, Eraser } from "lucide-react";
import { useTrip, useDocuments } from "@/hooks/use-trip-store";
import { useCollapse } from "@/hooks/use-collapse";
import { ActivityCard } from "@/components/activity-card";
import { TransportCard } from "@/components/transport-card";
import { DayDocument, Document } from "@/lib/types";
import { sumDocumentsCost } from "@/lib/currency";
import { compareItineraryDocs } from "@/lib/itinerary-meta";
import { useUIStore } from "@/store/ui";

interface DayCardMobileProps {
  day: DayDocument;
  countryColor: string;
  onClear: () => void;
}

function StayCard({ doc }: { doc: Document }) {
  const d = doc as Record<string, unknown>;
  const name = (d.name || d.title || "Stay") as string;
  const address = (d.address || "") as string;
  const checkIn = (d.check_in || d.start_date || "") as string;
  const checkOut = (d.check_out || d.end_date || "") as string;
  const confirmation = (d.confirmation || d.booking_ref || "") as string;
  const bookingStatus = (d.booking_status || "") as string;

  return (
    <div
      className="group/card border border-green-200 bg-green-50/60 px-2 py-1.5 cursor-pointer transition-colors hover:border-green-300"
      onClick={() => useUIStore.getState().openDetail(doc._collection, doc._id)}
    >
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-green-700 bg-white/80 border border-green-200">
          <Hotel className="w-3 h-3" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-900 break-words">{name}</div>
          {address && <div className="mt-0.5 text-[11px] leading-tight text-gray-600 break-words">{address}</div>}
          {(checkIn || checkOut || confirmation) && (
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-gray-500">
              {checkIn && <span>{checkIn}</span>}
              {checkOut && <span>{checkOut}</span>}
              {confirmation && <span className="break-all">{confirmation}</span>}
            </div>
          )}
        </div>
        {bookingStatus && bookingStatus !== "unbooked" && (
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
    </div>
  );
}

export function DayCardMobile({ day, countryColor, onClear }: DayCardMobileProps) {
  const { getDocumentsForDay, currency, currencyCode } = useTrip() as ReturnType<typeof useTrip> & { currencyCode: "EUR" | "USD" | "CNY" | "GBP" | "CHF" };
  const { create } = useDocuments();
  const { isCollapsed, toggle } = useCollapse();

  const collapsed = isCollapsed(day.date);
  const dayDocs = getDocumentsForDay(day.date);
  const dayCost = sumDocumentsCost(dayDocs, currencyCode, { prorateMultiDay: true });

  const accommodationDocs = dayDocs.filter((d) => d._collection === "accommodation");
  const timelineDocs = dayDocs
    .filter((d) => d._collection !== "accommodation")
    .sort(compareItineraryDocs);

  const dateObj = new Date(day.date + "T12:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });

  const activityCount = dayDocs.length;

  const FIELD_DEFAULTS: Record<string, Record<string, unknown>> = {
    activities: {
      day: day.date, title: "New Activity", time: "09:00", end_time: "10:00",
      duration: "1h", cost: 0, booking_status: "unbooked", notes: "",
    },
    transportation: {
      day: day.date, type: "train", from: day.location.split("→")[0]?.trim() || day.location,
      to: "", time: "09:00", end_time: "12:00", duration: "3h",
      carrier: "", booking_ref: "", cost: 0, booking_status: "unbooked",
    },
    accommodation: {
      start_date: day.date, end_date: day.date, name: "Hotel",
      address: day.location, confirmation: "", cost: 0, notes: "",
    },
  };

  const handleQuickAdd = async (collection: string) => {
    await create(collection, FIELD_DEFAULTS[collection] || { day: day.date, title: "" });
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Card header — always visible */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => toggle(day.date)}
      >
        {/* Collapse chevron */}
        <span className="text-gray-400 flex-shrink-0">
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
        </span>

        {/* Date */}
        <div className="flex-shrink-0 w-[52px]">
          <div className="text-xs font-semibold text-gray-900">{dateLabel}</div>
          <div className="text-[10px] text-gray-400">{weekday}</div>
        </div>

        {/* Location */}
        <div className="flex-1 min-w-0">
          {day.country && (
            <div className={`text-[10px] font-semibold uppercase ${countryColor}`}>{day.country}</div>
          )}
          <div className="text-sm text-gray-800 truncate leading-tight">{day.location}</div>
        </div>

        {/* Summary badge */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {activityCount > 0 && (
            <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
              {activityCount} item{activityCount !== 1 ? "s" : ""}
              {dayCost > 0 ? ` · ${currency}${dayCost.toLocaleString()}` : ""}
            </span>
          )}
          <button
            className="text-gray-300 hover:text-red-400 p-0.5"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            title="Clear day"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
          {/* Timeline docs */}
          {timelineDocs.map((doc) => (
            <div key={doc._id}>
              {doc._collection === "transportation" ? (
                <TransportCard document={doc} />
              ) : (
                <ActivityCard document={doc} />
              )}
            </div>
          ))}

          {/* Stay docs */}
          {accommodationDocs.map((doc) => (
            <div key={doc._id}>
              <StayCard doc={doc} />
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 px-2"
              onClick={() => handleQuickAdd("activities")}
            >
              <MapPin className="w-3.5 h-3.5" /> Activity
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 px-2"
              onClick={() => handleQuickAdd("transportation")}
            >
              <Train className="w-3.5 h-3.5" /> Transport
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 px-2"
              onClick={() => handleQuickAdd("accommodation")}
            >
              <Hotel className="w-3.5 h-3.5" /> Stay
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
