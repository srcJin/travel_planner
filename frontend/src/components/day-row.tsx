"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Train, GripVertical, Eraser, ChevronRight, ChevronDown, FolderPlus } from "lucide-react";
import { useTrip } from "@/hooks/use-trip-store";
import { useDocuments } from "@/hooks/use-trip-store";
import { TransportCard } from "@/components/transport-card";
import { ActivityCard } from "@/components/activity-card";
import { DayDocument, Document } from "@/lib/types";
import { sumDocumentsCost } from "@/lib/currency";
import { compareItineraryDocs } from "@/lib/itinerary-meta";
import { ColumnWidths, MIN_COLUMN_WIDTHS } from "@/hooks/use-column-widths";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface DayRowProps {
  day: DayDocument;
  countryColor: string;
  showCitySeparator: boolean;
  onClear: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  gridTemplate: string;
  widths: ColumnWidths;
}

interface SortableActivityProps {
  doc: Document;
  idx: number;
  fromDay: string;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  colorScheme?: "amber" | "teal";
}

function SortableActivity({ doc, idx, fromDay, selectMode, isSelected, onToggleSelect, colorScheme = "amber" }: SortableActivityProps) {
  const sortOrder = typeof (doc as Record<string, unknown>).sort_order === "number"
    ? (doc as Record<string, unknown>).sort_order as number
    : idx;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: doc._id,
    data: {
      docId: doc._id,
      collection: doc._collection,
      fromDay,
      sortOrder,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${selectMode ? "pl-8" : "pl-5"} ${isSelected ? "bg-amber-50" : ""} py-1`}
      draggable={!selectMode}
      onDragStart={(e) => {
        // Set native dataTransfer for group drop zones
        e.dataTransfer.setData("application/json", JSON.stringify({
          docId: doc._id,
          collection: doc._collection,
          fromDay,
        }));
      }}
    >
      {selectMode ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(doc._id)}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer"
        />
      ) : (
        <GripVertical
          className="absolute left-0 top-1/2 -translate-y-1/2 cursor-grab text-gray-300 hover:text-gray-500 w-3.5 h-3.5"
          {...attributes}
          {...listeners}
        />
      )}
      <ActivityCard document={doc} colorScheme={colorScheme} />
    </div>
  );
}

// Grouped activities with drag-in/out, rename, reorder
function GroupedActivities({ docs, day, selectMode, selected, onToggleSelect, update, segmentLabel }: {
  docs: Document[];
  day: string;
  selectMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  update: (collection: string, id: string, data: Record<string, unknown>) => Promise<unknown>;
  segmentLabel?: string;
}) {
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  // Build 2-level group tree from "/" paths
  interface GroupNode {
    name: string;
    path: string;
    docs: Document[];
    children: Record<string, { name: string; path: string; docs: Document[] }>;
  }
  const groupTree: Record<string, GroupNode> = {};
  const ungrouped: Document[] = [];

  for (const doc of docs) {
    const g = ((doc as Record<string, unknown>).group || "") as string;
    if (!g) { ungrouped.push(doc); continue; }
    const parts = g.split("/").map((s) => s.trim()).filter(Boolean);
    const topName = parts[0];
    if (!groupTree[topName]) {
      groupTree[topName] = { name: topName, path: topName, docs: [], children: {} };
    }
    if (parts.length >= 2) {
      const subName = parts[1];
      const subPath = `${topName}/${subName}`;
      if (!groupTree[topName].children[subName]) {
        groupTree[topName].children[subName] = { name: subName, path: subPath, docs: [] };
      }
      groupTree[topName].children[subName].docs.push(doc);
    } else {
      groupTree[topName].docs.push(doc);
    }
  }
  const groupNames = Object.keys(groupTree);

  // Get all docs in a top-level group (including sub-groups)
  const allGroupDocs = (node: GroupNode): Document[] => [
    ...node.docs,
    ...Object.values(node.children).flatMap((c) => c.docs),
  ];

  const handleRename = async (oldPath: string, isSubGroup = false) => {
    if (!renameValue.trim() || renameValue.trim() === oldPath) { setRenamingGroup(null); return; }
    // Find all docs with this group path and update
    for (const doc of docs) {
      const g = ((doc as Record<string, unknown>).group || "") as string;
      if (isSubGroup) {
        // Renaming a sub-group: update the sub-part only
        if (g === oldPath) {
          const parent = oldPath.split("/")[0];
          await update(doc._collection, doc._id, { group: `${parent}/${renameValue.trim()}` });
        }
      } else {
        // Renaming a top-level group: update all items starting with this prefix
        if (g === oldPath || g.startsWith(oldPath + "/")) {
          const newG = g.replace(oldPath, renameValue.trim());
          await update(doc._collection, doc._id, { group: newG });
        }
      }
    }
    setRenamingGroup(null);
    setRenameValue("");
  };

  const handleDropOnGroup = async (groupName: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGroup(null);
    const json = e.dataTransfer.getData("application/json");
    if (!json) return;
    try {
      const data = JSON.parse(json);
      if (data.docId && data.collection) {
        await update(data.collection, data.docId, { group: groupName });
      }
    } catch { /* ignore */ }
  };

  const handleDropOnUngrouped = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGroup(null);
    const json = e.dataTransfer.getData("application/json");
    if (!json) return;
    try {
      const data = JSON.parse(json);
      if (data.docId && data.collection) {
        await update(data.collection, data.docId, { group: "" });
      }
    } catch { /* ignore */ }
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(groupNames));

  const toggleExpand = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Color schemes for groups
  const LOGISTICS_KEYWORDS = /^(logistics|transport|transfer|pickup|drop.?off|rental|car|taxi|shuttle|check.?in|check.?out|pack)/i;

  type GroupColorScheme = {
    bg: string; bgSub: string; border: string; borderSub: string;
    text: string; textSub: string;
    grip: string; chevron: string; ring: string;
    stackBg1: string; stackBorder1: string; stackBg2: string; stackBorder2: string;
    cardBorder: string;
  };

  const ACTIVITY_COLORS: GroupColorScheme = {
    bg: "bg-amber-50", bgSub: "bg-orange-50/50",
    border: "border-amber-200", borderSub: "border-orange-200",
    text: "text-amber-800", textSub: "text-orange-700",
    grip: "text-amber-400", chevron: "text-amber-500",
    ring: "ring-amber-400",
    stackBg1: "bg-amber-100", stackBorder1: "border-amber-300",
    stackBg2: "bg-amber-50", stackBorder2: "border-amber-200",
    cardBorder: "border-amber-300",
  };

  const LOGISTICS_COLORS: GroupColorScheme = {
    bg: "bg-teal-50", bgSub: "bg-cyan-50/50",
    border: "border-teal-200", borderSub: "border-cyan-200",
    text: "text-teal-800", textSub: "text-cyan-700",
    grip: "text-teal-400", chevron: "text-teal-500",
    ring: "ring-teal-400",
    stackBg1: "bg-teal-100", stackBorder1: "border-teal-300",
    stackBg2: "bg-teal-50", stackBorder2: "border-teal-200",
    cardBorder: "border-teal-300",
  };

  function getGroupColors(name: string): GroupColorScheme {
    return LOGISTICS_KEYWORDS.test(name) ? LOGISTICS_COLORS : ACTIVITY_COLORS;
  }

  const displayTopLabel = groupNames.length === 1 && segmentLabel ? `${groupNames[0]} ${segmentLabel}` : null;

  // Render a group header (reused for both levels)
  function GroupHeader({ path, label, depth, allDocsInGroup, colors }: {
    path: string; label: string; depth: number; allDocsInGroup: Document[]; colors: GroupColorScheme;
  }) {
    const isExpanded = expandedGroups.has(path);
    const bgColor = depth === 0 ? colors.bg : colors.bgSub;
    const borderColor = depth === 0 ? colors.border : colors.borderSub;
    return (
      <div
        className={`flex items-center gap-1.5 py-1 px-2 ${bgColor} cursor-pointer group/grp border-b ${borderColor}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("application/json", JSON.stringify({
            fromDay: day, groupName: path, isGroup: true,
            docIds: allDocsInGroup.map((d) => ({ _id: d._id, _collection: d._collection })),
          }));
        }}
        onClick={(e) => { e.stopPropagation(); toggleExpand(path); }}
      >
        <GripVertical className={`w-3 h-3 ${colors.grip} cursor-grab flex-shrink-0`} />
        <ChevronRight className={`w-3 h-3 ${colors.chevron} transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        {renamingGroup === path ? (
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => handleRename(path, depth > 0)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(path, depth > 0); if (e.key === "Escape") setRenamingGroup(null); }}
            className={`text-xs font-semibold bg-white border ${colors.border} px-1 h-5 flex-1 ${depth === 0 ? colors.text : colors.textSub}`}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`text-xs font-semibold cursor-text flex-1 ${depth === 0 ? colors.text : colors.textSub}`}
            onDoubleClick={(e) => { e.stopPropagation(); setRenamingGroup(path); setRenameValue(label); }}
          >{depth === 0 && displayTopLabel ? displayTopLabel : label}</span>
        )}
        <button
          className={`text-[10px] ${colors.grip} hover:text-red-500 opacity-0 group-hover/grp:opacity-100 ml-1`}
          onClick={async (e) => {
            e.stopPropagation();
            for (const d of allDocsInGroup) await update(d._collection, d._id, { group: "" });
          }}
        >ungroup</button>
      </div>
    );
  }

  return (
    <>
      {groupNames.map((topName) => {
        const node = groupTree[topName];
        const allDocs = allGroupDocs(node);
        const isExpanded = expandedGroups.has(topName);
        const subGroupNames = Object.keys(node.children);
        const totalCount = allDocs.length;
        const colors = getGroupColors(topName);
        const cardColor = colors === LOGISTICS_COLORS ? "teal" as const : "amber" as const;

        return (
          <div
            key={topName}
            className={`relative mt-2 transition-all ${
              dragOverGroup === topName ? `ring-2 ${colors.ring}` :
              dragOverGroup === "__ungrouped" ? "opacity-60" : ""
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOverGroup(topName); }}
            onDragLeave={() => setDragOverGroup(null)}
            onDrop={(e) => handleDropOnGroup(topName, e)}
          >
            {/* Stacked card shadows when collapsed */}
            {!isExpanded && totalCount > 1 && (
              <>
                <div className={`absolute inset-0 ${colors.stackBg1} border ${colors.stackBorder1} translate-x-[4px] translate-y-[4px]`} style={{ zIndex: 0 }} />
                {totalCount > 2 && (
                  <div className={`absolute inset-0 ${colors.stackBg2} border ${colors.stackBorder2} translate-x-[8px] translate-y-[8px]`} style={{ zIndex: -1 }} />
                )}
              </>
            )}

            <div className={`relative bg-white border ${colors.cardBorder} ${!isExpanded ? "shadow-sm" : ""}`} style={{ zIndex: 1 }}>
              {/* Level 1 header */}
              <GroupHeader path={topName} label={topName} depth={0} allDocsInGroup={allDocs} colors={colors} />

              {isExpanded ? (
                <div className="space-y-1 py-1 pr-1">
                  {/* Direct items in this top-level group */}
                  {node.docs.map((doc, idx) => (
                    <SortableActivity key={doc._id} doc={doc} idx={idx} fromDay={day}
                      selectMode={selectMode} isSelected={selected.has(doc._id)} onToggleSelect={onToggleSelect} colorScheme={cardColor} />
                  ))}

                  {/* Level 2 sub-groups */}
                  {subGroupNames.map((subName) => {
                    const sub = node.children[subName];
                    const subExpanded = expandedGroups.has(sub.path);
                    return (
                      <div
                        key={sub.path}
                        className={`ml-3 border-l-2 ${colors.borderSub} ${
                          dragOverGroup === sub.path ? `ring-1 ${colors.ring}` : ""
                        }`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverGroup(sub.path); }}
                        onDragLeave={(e) => { e.stopPropagation(); setDragOverGroup(null); }}
                        onDrop={(e) => handleDropOnGroup(sub.path, e)}
                      >
                        <GroupHeader path={sub.path} label={subName} depth={1} allDocsInGroup={sub.docs} colors={colors} />
                        {subExpanded && (
                          <div className="space-y-1 py-1 pr-1">
                            {sub.docs.map((doc, idx) => (
                              <SortableActivity key={doc._id} doc={doc} idx={idx} fromDay={day}
                                selectMode={selectMode} isSelected={selected.has(doc._id)} onToggleSelect={onToggleSelect} colorScheme={cardColor} />
                            ))}
                          </div>
                        )}
                        {!subExpanded && (
                        <div className="px-3 py-0.5 text-[10px] leading-tight text-orange-500 whitespace-normal break-words">
                          {sub.docs.map((d) => ((d as Record<string, unknown>).title || "") as string).filter(Boolean).join(" · ")}
                        </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-0.5 text-[10px] leading-tight text-amber-600 whitespace-normal break-words border-t border-amber-100">
                  {allDocs.map((d) => ((d as Record<string, unknown>).title || "") as string).filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            {!isExpanded && totalCount > 1 && <div style={{ height: totalCount > 2 ? 8 : 4 }} />}
          </div>
        );
      })}

      {/* Ungrouped items — drop zone to remove from group */}
      <div
        className={`transition-all space-y-1 ${
          dragOverGroup === "__ungrouped"
            ? "bg-blue-50 border-2 border-dashed border-blue-300 py-3 min-h-[40px]"
            : groupNames.length > 0 ? "min-h-[12px] py-1" : ""
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOverGroup("__ungrouped"); }}
        onDragLeave={() => setDragOverGroup(null)}
        onDrop={handleDropOnUngrouped}
      >
        {dragOverGroup === "__ungrouped" && ungrouped.length === 0 && (
          <div className="text-center text-[11px] text-blue-500 py-2 font-medium">
            Drop here to ungroup
          </div>
        )}
        {ungrouped.map((doc, idx) => (
          <SortableActivity key={doc._id} doc={doc} idx={idx} fromDay={day}
            selectMode={selectMode} isSelected={selected.has(doc._id)} onToggleSelect={onToggleSelect} />
        ))}
      </div>
    </>
  );
}

export function DayRow({ day, countryColor, showCitySeparator, onClear, collapsed, onToggleCollapse, gridTemplate, widths }: DayRowProps) {
  const { selectedDay, selectDay, getDocumentsForDay, currency, currencyCode } = useTrip() as ReturnType<typeof useTrip> & { currencyCode: "EUR" | "USD" | "CNY" | "GBP" | "CHF" };
  const { create, update } = useDocuments();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");

  const dayDocs = getDocumentsForDay(day.date);
  const dayCost = sumDocumentsCost(dayDocs, currencyCode, { prorateMultiDay: true });
  const isSelected = selectedDay === day.date;

  const accomDocs = dayDocs.filter((d) => d._collection === "accommodation");
  const timelineDocs = dayDocs.filter((d) => d._collection !== "accommodation").sort(compareItineraryDocs);
  const draggableDocs = dayDocs.filter((d) => d._collection !== "accommodation" && d._collection !== "transportation");

  type TimelineEntry =
    | { key: string; kind: "transport"; time: string; sortOrder: number; doc: Document }
    | { key: string; kind: "activity"; time: string; sortOrder: number; doc: Document; groupName?: string }
    | { key: string; kind: "group"; time: string; sortOrder: number; groupName: string; docs: Document[]; segmentLabel?: string };

  const timeForDoc = (doc: Document): string => (((doc as Record<string, unknown>).time || "") as string);
  const sortOrderForDoc = (doc: Document): number =>
    typeof (doc as Record<string, unknown>).sort_order === "number"
      ? ((doc as Record<string, unknown>).sort_order as number)
      : Number.MAX_SAFE_INTEGER;

  const topLevelGroupForDoc = (doc: Document): string => {
    const group = (((doc as Record<string, unknown>).group || "") as string).trim();
    return group ? group.split("/")[0].trim() : "";
  };

  const rawGroupRuns = new Map<string, Array<{ firstDocId: string; docs: Document[]; time: string; sortOrder: number }>>();
  const timelineEntries: TimelineEntry[] = [];
  for (let i = 0; i < timelineDocs.length; i += 1) {
    const current = timelineDocs[i];
    if (current._collection === "transportation") {
      timelineEntries.push({
        key: `transport-${current._id}`,
        kind: "transport",
        time: timeForDoc(current),
        sortOrder: sortOrderForDoc(current),
        doc: current,
      });
      continue;
    }

    const topLevelGroup = topLevelGroupForDoc(current);
    if (!topLevelGroup) {
      timelineEntries.push({
        key: `activity-${current._id}`,
        kind: "activity",
        time: timeForDoc(current),
        sortOrder: sortOrderForDoc(current),
        doc: current,
      });
      continue;
    }

    const runDocs = [current];
    let j = i + 1;
    while (j < timelineDocs.length) {
      const next = timelineDocs[j];
      if (next._collection === "transportation") break;
      if (topLevelGroupForDoc(next) !== topLevelGroup) break;
      runDocs.push(next);
      j += 1;
    }

    const firstDocId = current._id;
    const existingRuns = rawGroupRuns.get(topLevelGroup) || [];
    existingRuns.push({
      firstDocId,
      docs: runDocs,
      time: timeForDoc(current),
      sortOrder: sortOrderForDoc(current),
    });
    rawGroupRuns.set(topLevelGroup, existingRuns);

    if (runDocs.length === 1) {
      timelineEntries.push({
        key: `activity-${current._id}`,
        kind: "activity",
        time: timeForDoc(current),
        sortOrder: sortOrderForDoc(current),
        doc: current,
        groupName: topLevelGroup,
      });
    } else {
      timelineEntries.push({
        key: `group-${topLevelGroup}-${current._id}`,
        kind: "group",
        groupName: topLevelGroup,
        docs: runDocs,
        time: timeForDoc(current),
        sortOrder: sortOrderForDoc(current),
      });
    }

    i = j - 1;
  }

  const groupSegmentLabels = new Map<string, string>();
  for (const [groupName, runs] of rawGroupRuns.entries()) {
    if (runs.length <= 1) continue;
    runs.forEach((run, index) => {
      groupSegmentLabels.set(`${groupName}:${run.firstDocId}`, `(${index + 1}/${runs.length})`);
    });
  }

  const normalizedTimelineEntries: TimelineEntry[] = timelineEntries.map((entry) => {
    if (entry.kind === "group") {
      return {
        ...entry,
        segmentLabel: groupSegmentLabels.get(`${entry.groupName}:${entry.docs[0]?._id}`) || undefined,
      };
    }

    if (entry.kind === "activity" && entry.groupName) {
      const runs = rawGroupRuns.get(entry.groupName) || [];
      if (runs.length > 1) {
        return {
          key: `group-${entry.groupName}-${entry.doc._id}`,
          kind: "group",
          groupName: entry.groupName,
          docs: [entry.doc],
          time: entry.time,
          sortOrder: entry.sortOrder,
          segmentLabel: groupSegmentLabels.get(`${entry.groupName}:${entry.doc._id}`) || undefined,
        };
      }
    }

    return entry;
  });

  // Find accommodation for this day
  // Make the whole row a drop target for cross-day moves
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `day-${day.date}`,
    data: {
      isDay: true,
      dayDate: day.date,
    },
  });

  // Smart defaults — next available hour slot based on existing activities
  const lastTime = timelineDocs.reduce((latest, doc) => {
    const t = (doc as Record<string, unknown>).time as string;
    const et = (doc as Record<string, unknown>).end_time as string;
    if (et && et > latest) return et;
    if (t && t > latest) return t.slice(0, 2) === "23" ? t : `${String(Number(t.slice(0, 2)) + 1).padStart(2, "0")}:00`;
    return latest;
  }, "09:00");

  const nextHour = lastTime;
  const nextEndHour = `${String(Math.min(Number(nextHour.slice(0, 2)) + 1, 23)).padStart(2, "0")}:00`;

  const FIELD_DEFAULTS: Record<string, Record<string, unknown>> = {
    activities: {
      day: day.date, title: "New activity", time: nextHour, end_time: nextEndHour,
      duration: "1h", cost: 0, booking_status: "unbooked",
      location: { lat: 0, lng: 0 }, show_on_map: true, notes: "",
    },
    transportation: {
      day: day.date, title: "New transport", type: "train", from: day.location.split("→")[0]?.trim() || day.location,
      to: "", time: "09:00", end_time: "12:00", duration: "3h",
      carrier: "", booking_ref: "", cost: 0, booking_status: "unbooked",
      location: { lat: 0, lng: 0 },
    },
    accommodation: {
      start_date: day.date, end_date: day.date, name: "Hotel",
      address: day.location, confirmation: "", cost: 0,
      location: { lat: 0, lng: 0 }, notes: "",
    },
  };

  const handleQuickAdd = async (collection: string) => {
    await create(collection, FIELD_DEFAULTS[collection] || { day: day.date, title: "" });
  };

  const dateObj = new Date(day.date + "T12:00:00");
  const dateMonth = dateObj.toLocaleString("en-US", { month: "short" });
  const dateDay = dateObj.getDate();
  const dateDow = dateObj.toLocaleString("en-US", { weekday: "short" });

  const nonAccomCount = dayDocs.filter((d) => d._collection !== "accommodation").length;
  const hideDateContent = widths.date <= MIN_COLUMN_WIDTHS.date;
  const hideLocationContent = widths.location <= MIN_COLUMN_WIDTHS.location;
  const hideDetailContent = widths.detail <= MIN_COLUMN_WIDTHS.detail;
  const hideStayContent = widths.stay <= MIN_COLUMN_WIDTHS.stay;

  return (
    <>
      {showCitySeparator && (
        <div className="border-t-2 border-gray-400" />
      )}
      <div
        ref={setDropRef}
        style={{ display: "grid", gridTemplateColumns: gridTemplate }}
        className={`group gap-0 border-b border-gray-300 transition-colors cursor-pointer ${
          isSelected ? "bg-blue-50/50 border-blue-300" :
          isOver ? "bg-blue-50/30 border-blue-300" :
          "hover:bg-gray-50/50"
        }`}
        onClick={() => selectDay(day.date)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          const json = e.dataTransfer.getData("application/json");
          if (!json) return;
          try {
            const data = JSON.parse(json);
            // Handle group drag to another day
            if (data.isGroup && data.docIds && data.fromDay !== day.date) {
              e.preventDefault();
              e.stopPropagation();
              for (const item of data.docIds) {
                await update(item._collection, item._id, { day: day.date });
              }
              return;
            }
          } catch { /* ignore unsupported drops */ }
        }}
      >
        {/* Date column */}
        <div className="group/date py-2 text-xs font-medium text-gray-900 border-r border-gray-300 relative">
          <div className="flex items-start">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
              className="w-4 flex-shrink-0 flex items-center justify-center pt-0.5 text-gray-400 hover:text-gray-700"
            >
              {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {!hideDateContent && (
              <div>
                <div className="leading-tight">{dateMonth} {dateDay}</div>
                <div className="text-[10px] text-gray-400 font-normal leading-tight">{dateDow}</div>
              </div>
            )}
          </div>
          {!hideDateContent && (
            <button
              className="absolute top-0.5 right-0.5 opacity-0 group-hover/date:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              title="Clear day activities"
            >
              <Eraser className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Location column — editable country + city */}
        <LocationCell day={day} countryColor={countryColor} hidden={hideLocationContent} />

        {/* Details column — collapsible (before Stay) */}
        <div className={`px-2 min-w-0 ${collapsed ? "py-0.5" : "space-y-1"} ${!collapsed && dayDocs.length === 0 ? "py-0.5" : collapsed ? "" : "py-1.5"}`}>
          {hideDetailContent ? null : collapsed ? (
            <div className="text-[10px] leading-tight text-gray-400 whitespace-normal break-words">
              {nonAccomCount > 0 ? `${nonAccomCount} item${nonAccomCount > 1 ? "s" : ""}${dayCost > 0 ? ` · ${currency}${dayCost}` : ""}` : "—"}
            </div>
          ) : (<>

          <SortableContext items={draggableDocs.map((d) => d._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {normalizedTimelineEntries.map((entry) => {
                if (entry.kind === "transport") {
                  return (
                    <div key={entry.key}>
                      <TransportCard document={entry.doc} />
                    </div>
                  );
                }
                if (entry.kind === "activity") {
                  return (
                    <SortableActivity
                      key={entry.key}
                      doc={entry.doc}
                      idx={0}
                      fromDay={day.date}
                      selectMode={selectMode}
                      isSelected={selected.has(entry.doc._id)}
                      onToggleSelect={(id) => setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })}
                    />
                  );
                }
                return (
                  <GroupedActivities
                    key={entry.key}
                    docs={entry.docs}
                    day={day.date}
                    selectMode={selectMode}
                    selected={selected}
                    segmentLabel={entry.segmentLabel}
                    onToggleSelect={(id) => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })}
                    update={update}
                  />
                );
              })}
            </div>
          </SortableContext>

          {/* Action row — all hidden by default, shown on row hover */}
          <div className="flex flex-wrap items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-1.5"
              onClick={(e) => { e.stopPropagation(); handleQuickAdd("activities"); }}>
              <MapPin className="w-3 h-3" /> Activity
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-1.5"
              onClick={(e) => { e.stopPropagation(); handleQuickAdd("transportation"); }}>
              <Train className="w-3 h-3" /> Transport
            </Button>
            {draggableDocs.length >= 1 && (
              <Button variant="outline" size="sm" className={`h-6 text-[10px] gap-1 px-1.5 ${selectMode ? "bg-amber-100 border-amber-300" : ""}`}
                onClick={(e) => { e.stopPropagation(); setSelectMode(!selectMode); if (selectMode) { setSelected(new Set()); setGroupName(""); } }}>
                <FolderPlus className="w-3 h-3" /> {selectMode ? "Cancel" : "Select"}
              </Button>
            )}
          </div>

          {/* Group toolbar — shows when items are selected */}
          {selectMode && selected.size > 0 && (
            <div className="flex items-center gap-1.5 pl-4 pt-1 bg-amber-50 py-1.5 -mx-2 px-3 border-t border-amber-200" onClick={(e) => e.stopPropagation()}>
              <span className="text-[11px] text-amber-700 font-medium">{selected.size} selected</span>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name..."
                className="h-7 text-xs border border-amber-300 px-2 flex-1"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && groupName.trim()) {
                    for (const id of selected) {
                      const doc = draggableDocs.find((d) => d._id === id);
                      if (doc) await update(doc._collection, doc._id, { group: groupName.trim() });
                    }
                    setGroupName("");
                    setSelected(new Set());
                    setSelectMode(false);
                  }
                }}
              />
              <Button size="sm" className="h-7 text-xs px-2" disabled={!groupName.trim()} onClick={async () => {
                if (!groupName.trim()) return;
                for (const id of selected) {
                  const doc = draggableDocs.find((d) => d._id === id);
                  if (doc) await update(doc._collection, doc._id, { group: groupName.trim() });
                }
                setGroupName("");
                setSelected(new Set());
                setSelectMode(false);
              }}>Group</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={async () => {
                // Ungroup selected items
                for (const id of selected) {
                  const doc = draggableDocs.find((d) => d._id === id);
                  if (doc) await update(doc._collection, doc._id, { group: "" });
                }
                setSelected(new Set());
              }}>Ungroup</Button>
            </div>
          )}

          {dayCost > 0 && (
            <div className="text-right text-[10px] text-gray-400">{currency}{dayCost.toLocaleString()}</div>
          )}
          </>)}
        </div>

        {/* Stay column (last) — deduplicate by _id */}
        <div className={`border-l border-gray-300 min-w-0 px-2 ${collapsed ? "py-0.5" : "py-1.5"}`} onClick={(e) => e.stopPropagation()}>
          {hideStayContent ? null : accomDocs.length > 0 ? (
            [...new Map(accomDocs.map((d) => [d._id, d])).values()].map((doc) => {
              const d = doc as Record<string, unknown>;
              const name = (d.name || d.title || "") as string;
              const address = (d.address || "") as string;
              const startDate = (d.start_date || d.day || "") as string;
              const endDate = (d.end_date || d.day || "") as string;
              const isFirstDay = startDate === day.date || !startDate;
              const isMultiDay = startDate !== endDate && startDate && endDate;

              // Calculate nights
              let nights = 1;
              if (isMultiDay) {
                const s = new Date(startDate);
                const e = new Date(endDate);
                nights = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
              }

              const bookingStatus = (d.booking_status || "") as string;

              // Collapsed: show name only in one line
              if (collapsed) {
                return (
                  <div key={doc._id} className="text-[10px] leading-tight text-gray-400 whitespace-normal break-words">
                    {isFirstDay ? (name || "—") : `↑ ${name}`}
                  </div>
                );
              }

              return (
                <div
                  key={doc._id}
                  className="cursor-pointer hover:bg-gray-100 px-1 -mx-1 py-0.5"
                  onClick={() => { import("@/store/ui").then((m) => m.useUIStore.getState().openDetail(doc._collection, doc._id)); }}
                >
                  {isFirstDay ? (
                    <>
                      <div className="flex items-start gap-1">
                        <span className="min-w-0 flex-1 text-xs font-medium leading-tight text-gray-800 whitespace-normal break-words">
                          {name || "—"}
                        </span>
                        {bookingStatus && (
                          <span className={`text-[9px] px-1 flex-shrink-0 ${
                            bookingStatus === "booked" ? "text-green-700 bg-green-100" :
                            bookingStatus === "pending" ? "text-yellow-700 bg-yellow-100" :
                            bookingStatus === "unbooked" ? "text-orange-600 bg-orange-50" :
                            "text-gray-500 bg-gray-100"
                          }`}>{bookingStatus}</span>
                        )}
                      </div>
                      {address && (
                        <div className="text-[10px] leading-tight text-gray-500 whitespace-normal break-words">
                          {address}
                        </div>
                      )}
                      {isMultiDay && (
                        <div className="text-[10px] text-gray-400">{nights} night{nights > 1 ? "s" : ""}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-[10px] text-gray-400 italic">↑ {name}</div>
                  )}
                </div>
              );
            })
          ) : (
            !collapsed && (
              <button
                className="text-xs text-gray-400 hover:text-blue-500"
                onClick={() => handleQuickAdd("accommodation")}
              >
                + stay
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}

function LocationCell({ day, countryColor, hidden = false }: { day: DayDocument; countryColor: string; hidden?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; country: string; lat: number; lng: number }>>([]);
  const { update } = useDocuments();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&types=place,locality,region,country&limit=5`
        );
        const data = await res.json();
        setResults(
          (data.features || []).map((f: { place_name: string; center: [number, number]; context?: Array<{ id: string; text: string }> }) => {
            const countryCtx = f.context?.find((c: { id: string }) => c.id.startsWith("country"));
            return {
              name: f.place_name.split(",")[0],
              country: countryCtx?.text || "",
              lat: f.center[1],
              lng: f.center[0],
            };
          })
        );
      } catch { setResults([]); }
    }, 300);
  };

  const handleSelect = async (result: { name: string; country: string; lat: number; lng: number }) => {
    await update("days", day._id, {
      location: result.name,
      country: result.country || day.country,
      location_coords: { lat: result.lat, lng: result.lng },
    });
    setEditing(false);
    setQuery("");
    setResults([]);
  };

  const handleManualSave = async () => {
    if (query.trim()) {
      await update("days", day._id, { location: query.trim() });
    }
    setEditing(false);
    setQuery("");
    setResults([]);
  };

  if (editing) {
    return (
      <div className="px-1 py-1 border-r border-gray-300 relative" onClick={(e) => e.stopPropagation()}>
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleManualSave();
            if (e.key === "Escape") { setEditing(false); setQuery(""); setResults([]); }
          }}
          placeholder="Search city..."
          className="w-full h-5 text-xs bg-white border border-blue-300 px-1 outline-none"
          autoFocus
        />
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 bg-white border border-gray-200 shadow-lg max-h-[150px] overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                className="block w-full px-2 py-1 text-left text-[11px] hover:bg-blue-50 border-b border-gray-50 last:border-0"
                onClick={() => handleSelect(r)}
              >
                <span className="text-gray-900">{r.name}</span>
                {r.country && <span className="text-gray-400 ml-1">{r.country}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="px-2 py-1.5 border-r border-gray-300 min-w-0 cursor-text hover:bg-gray-50"
      onClick={(e) => { e.stopPropagation(); setEditing(true); setQuery(day.location); }}
    >
      {!hidden && (
        <>
          {day.country && (
            <span className={`text-[10px] font-semibold uppercase ${countryColor}`}>{day.country}</span>
          )}
          {!day.country && <span className="text-[10px] text-gray-400">—</span>}
          <div className="text-xs leading-tight text-gray-700 whitespace-normal break-words">
            {day.location}
          </div>
        </>
      )}
    </div>
  );
}
