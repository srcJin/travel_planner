"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ChevronsDown, ChevronsUp } from "lucide-react";
import { useTrip } from "@/hooks/use-trip-store";
import { useDocuments } from "@/hooks/use-trip-store";
import { useCollapse } from "@/hooks/use-collapse";

import { DayRow } from "@/components/day-row";
import { DayCardMobile } from "@/components/day-card-mobile";
import { DndWrapper } from "@/components/dnd-wrapper";
import { ResizableHeader } from "@/components/resizable-header";
import { MIN_COLUMN_WIDTHS, useColumnWidths } from "@/hooks/use-column-widths";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDocumentDisplayCost } from "@/lib/currency";

const COUNTRY_COLORS: Record<string, string> = {
  Spain: "text-red-700",
  France: "text-blue-700",
  Greece: "text-indigo-700",
};

export function Timeline() {
  const { days, loading, refreshAll, getDocumentsForDay, documents, currency, currencyCode } = useTrip() as ReturnType<typeof useTrip> & { currencyCode: "EUR" | "USD" | "CNY" | "GBP" | "CHF" };
  const { create, remove } = useDocuments();
  const { widths, setWidth, gridTemplate } = useColumnWidths();
  const { isCollapsed, toggle, expandAll, collapseAll, collapsedCount } = useCollapse();
  // Compute total cost across all documents
  const totalCost = Object.entries(documents).reduce((sum, [col, docs]) => {
    if (col === "meta" || col === "days") return sum;
    return sum + docs.reduce((s, doc) => s + getDocumentDisplayCost(doc, currencyCode), 0);
  }, 0);

  const [showAddDay, setShowAddDay] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!loading || bootstrappedRef.current || days.length > 0) return;
    bootstrappedRef.current = true;
    void refreshAll();
  }, [days.length, loading, refreshAll]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-400">Loading trip data...</div>;
  }

  const handleAddDay = async () => {
    if (!newDate) return;
    const existing = days.find((d) => d.date === newDate);
    if (existing) return;

    const allDates = [...days.map((d) => d.date), newDate].sort();
    const dayNumber = allDates.indexOf(newDate) + 1;

    await create("days", {
      _id: newDate,
      date: newDate,
      day_number: dayNumber,
      country: null,
      location: newLocation || "TBD",
      status: "unplanned",
    });

    await refreshAll();
    setNewDate("");
    setNewLocation("");
    setShowAddDay(false);
  };

  const handleClearDay = async (date: string) => {
    const dayDocs = getDocumentsForDay(date);
    // Use store's deleteDocument so each deletion is recorded for undo
    for (const doc of dayDocs) {
      await remove(doc._collection, doc._id);
    }
  };

  const allExpanded = collapsedCount === 0;

  return (
    <ScrollArea className="h-full">
      <div className="min-w-0">
        {/* Toolbar — uses same grid as data rows for alignment */}
        <div className="hidden md:grid bg-gray-100 border-b-2 border-gray-400 sticky top-0 z-20 text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-1" style={{ gridTemplateColumns: gridTemplate }}>
          <ResizableHeader label="Date" width={widths.date} onResize={(w) => setWidth("date", w)} className="px-2" />
          <ResizableHeader label="Location" width={widths.location} onResize={(w) => setWidth("location", w)} className="px-2" />
          <div className="relative px-2 select-none overflow-hidden">
            <div className="flex items-center justify-between pr-2">
              <span>Details</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => allExpanded ? collapseAll(days.map((d) => d.date)) : expandAll()}
                title={allExpanded ? "Collapse all" : "Expand all"}
              >
                {allExpanded ? <ChevronsUp className="w-3 h-3 text-gray-500" /> : <ChevronsDown className="w-3 h-3 text-gray-500" />}
              </Button>
            </div>
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = widths.detail;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";

                const onMouseMove = (ev: MouseEvent) => setWidth("detail", Math.max(MIN_COLUMN_WIDTHS.detail, startWidth + ev.clientX - startX));
                const onMouseUp = () => {
                  document.body.style.cursor = "";
                  document.body.style.userSelect = "";
                  window.removeEventListener("mousemove", onMouseMove);
                  window.removeEventListener("mouseup", onMouseUp);
                };

                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
              }}
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
            />
          </div>
          <ResizableHeader label="Stay" width={widths.stay} onResize={(w) => setWidth("stay", w)} className="px-2 border-l border-gray-300" />
        </div>
        <div className="md:hidden flex items-center px-3 py-1 bg-gray-100 border-b-2 border-gray-400 sticky top-0 z-20">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-1">Timeline</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => allExpanded ? collapseAll(days.map((d) => d.date)) : expandAll()}
            title={allExpanded ? "Collapse all" : "Expand all"}
          >
            {allExpanded ? <ChevronsUp className="w-3 h-3 text-gray-500" /> : <ChevronsDown className="w-3 h-3 text-gray-500" />}
          </Button>
        </div>

        {/* Desktop: table row layout */}
        <div className="hidden md:block">
          <DndWrapper>
            {days.map((day, i) => {
              const prevDay = i > 0 ? days[i - 1] : null;
              const cityChanged = !prevDay || prevDay.location !== day.location;
              const countryColor = COUNTRY_COLORS[day.country || ""] || "text-gray-500";

              return (
                <DayRow
                  key={day.date}
                  day={day}
                  countryColor={countryColor}
                  showCitySeparator={cityChanged && i > 0}
                  onClear={() => handleClearDay(day.date)}
                  collapsed={isCollapsed(day.date)}
                  onToggleCollapse={() => toggle(day.date)}
                  gridTemplate={gridTemplate}
                  widths={widths}
                />
              );
            })}
          </DndWrapper>
        </div>

        {/* Mobile: stacked card layout */}
        <div className="md:hidden">
          {days.map((day) => {
            const countryColor = COUNTRY_COLORS[day.country || ""] || "text-gray-500";
            return (
              <DayCardMobile
                key={day.date}
                day={day}
                countryColor={countryColor}
                onClear={() => handleClearDay(day.date)}
              />
            );
          })}
        </div>

        {/* Add day */}
        <div className="px-3 py-2 border-t border-gray-200">
          {showAddDay ? (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-7 text-xs w-[140px]"
                autoFocus
              />
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Location..."
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddDay()}
              />
              <Button size="sm" className="h-7 text-xs px-2" onClick={handleAddDay}>Add</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setShowAddDay(false)}>Cancel</Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-blue-600"
              onClick={() => {
                const lastDay = days[days.length - 1];
                if (lastDay) {
                  const next = new Date(lastDay.date + "T12:00:00");
                  next.setDate(next.getDate() + 1);
                  setNewDate(next.toISOString().slice(0, 10));
                }
                setShowAddDay(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add day
            </Button>
          )}
        </div>

        {/* Total cost at bottom */}
        {totalCost > 0 && (
          <div className="px-3 py-2 border-t border-gray-300 bg-gray-50 text-right">
            <span className="text-sm font-semibold text-gray-900">Total: {currency}{totalCost.toLocaleString()}</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
