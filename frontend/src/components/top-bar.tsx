"use client";

import { useTrip } from "@/hooks/use-trip-store";
import { useUndoRedo } from "@/hooks/use-trip-store";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2, PanelLeft, Download } from "lucide-react";
import { TripSettings } from "@/components/trip-settings";
import { useUIStore } from "@/store/ui";
import { downloadCsv, formatItineraryCsv } from "@/lib/export-itinerary";

export function TopBar() {
  const { trip, visa, days, getDocumentsForDay } = useTrip();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const leftCollapsed = useUIStore((s) => s.leftCollapsed);
  const toggleLeftCollapsed = useUIStore((s) => s.toggleLeftCollapsed);

  if (!trip) return null;

  // Auto-calculate visa days
  void visa;

  return (
    <div className="border-b bg-white px-3 md:px-5 py-2 md:py-3">
      <div className="hidden md:flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-sm md:text-base font-semibold text-gray-900">{trip.name}</span>
          <span className="text-xs text-gray-500">
            {new Date(trip.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(trip.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
              <Undo2 className={`w-4 h-4 ${canUndo ? "text-gray-700" : "text-gray-300"}`} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
              <Redo2 className={`w-4 h-4 ${canRedo ? "text-gray-700" : "text-gray-300"}`} />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 px-2"
              onClick={() => {
                const csv = formatItineraryCsv(days, getDocumentsForDay);
                const datePart = trip.start_date.replace(/-/g, "");
                downloadCsv(csv, `${trip.name}-${datePart}.csv`);
              }}
              title="Download itinerary as CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <TripSettings />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 text-xs gap-1 px-2 ${!leftCollapsed ? "bg-gray-100" : ""}`}
            onClick={toggleLeftCollapsed}
            title={leftCollapsed ? "Show panels" : "Hide panels"}
          >
            <PanelLeft className="w-3.5 h-3.5" />
            Panels
          </Button>
        </div>
      </div>

      <div className="md:hidden space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-tight text-gray-900 break-words">{trip.name}</div>
            <div className="mt-0.5 text-xs text-gray-500">
              {new Date(trip.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(trip.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={undo} disabled={!canUndo} title="Undo">
            <Undo2 className={`w-4 h-4 ${canUndo ? "text-gray-700" : "text-gray-300"}`} />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={redo} disabled={!canRedo} title="Redo">
            <Redo2 className={`w-4 h-4 ${canRedo ? "text-gray-700" : "text-gray-300"}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 text-xs gap-1 px-2"
            onClick={() => {
              const csv = formatItineraryCsv(days, getDocumentsForDay);
              const datePart = trip.start_date.replace(/-/g, "");
              downloadCsv(csv, `${trip.name}-${datePart}.csv`);
            }}
            title="Download itinerary as CSV"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <div className="shrink-0">
            <TripSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
