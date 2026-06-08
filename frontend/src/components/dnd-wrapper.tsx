"use client";

import { ReactNode, useRef, useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useTripStore } from "@/store";
import { api } from "@/lib/api";

interface DndWrapperProps {
  children: ReactNode;
}

const GROUP_HOVER_MS = 600; // hold over another item for 600ms to auto-group

export function DndWrapper({ children }: DndWrapperProps) {
  const updateDocument = useTripStore((s) => s.updateDocument);
  const getDocumentsForDay = useTripStore((s) => s.getDocumentsForDay);
  const refreshAll = useTripStore((s) => s.refreshAll);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOverId = useRef<string | null>(null);
  const [mergePreview, setMergePreview] = useState<string | null>(null); // ID of item being hovered for merge
  const didMerge = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const clearHover = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    lastOverId.current = null;
    setMergePreview(null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) { clearHover(); return; }

    const activeData = active.data.current as Record<string, unknown> | undefined;
    const overData = over.data.current as Record<string, unknown> | undefined;
    if (!activeData || !overData) { clearHover(); return; }

    // Only auto-group if both are activities on the same day
    if (activeData.fromDay !== overData.fromDay || overData.isDay) { clearHover(); return; }

    if (lastOverId.current === over.id) return; // already timing this one

    clearHover();
    lastOverId.current = over.id as string;

    // Start timer — if held for GROUP_HOVER_MS, merge into group
    hoverTimer.current = setTimeout(async () => {
      const activeDocId = activeData.docId as string;
      const overDocId = overData.docId as string;
      const activeCollection = activeData.collection as string;
      const overCollection = overData.collection as string;

      if (!activeDocId || !overDocId) return;

      // Get both docs to check their groups
      const [activeDoc, overDoc] = await Promise.all([
        api.getDocument(activeCollection, activeDocId),
        api.getDocument(overCollection, overDocId),
      ]);

      const overGroup = (overDoc as Record<string, unknown>)?.group as string || "";
      const overTitle = (overDoc as Record<string, unknown>)?.title as string || "Group";

      if (overGroup) {
        // Target already in a group — add dragged item to same group
        await updateDocument(activeCollection, activeDocId, { group: overGroup });
      } else {
        // Neither in a group — create new group named after the target
        const groupName = overTitle || "Group";
        await updateDocument(activeCollection, activeDocId, { group: groupName });
        await updateDocument(overCollection, overDocId, { group: groupName });
      }

      didMerge.current = true;
      setMergePreview(null);
      await refreshAll();
    }, GROUP_HOVER_MS);

    // Show preview immediately
    setMergePreview(over.id as string);
  }, [clearHover, updateDocument, refreshAll]);

  const handleDragEnd = async (event: DragEndEvent) => {
    clearHover();

    // If we just merged via hover, skip normal reorder
    if (didMerge.current) { didMerge.current = false; return; }

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as {
      docId: string;
      collection: string;
      fromDay: string;
      sortOrder: number;
    } | undefined;

    const overData = over.data.current as {
      docId?: string;
      collection?: string;
      fromDay?: string;
      sortOrder?: number;
      isDay?: boolean;
      dayDate?: string;
    } | undefined;

    if (!activeData) return;

    const { docId, collection, fromDay, sortOrder: activeOrder } = activeData;

    // Cross-day move
    const targetDay = overData?.isDay ? overData.dayDate : overData?.fromDay;
    if (targetDay && targetDay !== fromDay) {
      const targetDocs = getDocumentsForDay(targetDay);
      const draggableCount = targetDocs.filter(
        (d) => d._collection !== "transportation" && d._collection !== "accommodation"
      ).length;
      await updateDocument(collection, docId, { day: targetDay, sort_order: draggableCount });
      return;
    }

    // Same-day reorder
    if (!overData?.docId || !overData.fromDay || overData.fromDay !== fromDay) return;

    const overOrder = overData.sortOrder ?? 0;
    if (activeOrder === overOrder) return;

    const dayDocs = getDocumentsForDay(fromDay);
    const draggableDocs = dayDocs.filter(
      (d) => d._collection !== "transportation" && d._collection !== "accommodation"
    );
    const sorted = [...draggableDocs].sort((a, b) => {
      const ao = (a as Record<string, unknown>).sort_order;
      const bo = (b as Record<string, unknown>).sort_order;
      if (typeof ao === "number" && typeof bo === "number") return ao - bo;
      if (typeof ao === "number") return -1;
      if (typeof bo === "number") return 1;
      return 0;
    });

    const fromIndex = sorted.findIndex((d) => d._id === docId);
    const toIndex = sorted.findIndex((d) => d._id === overData.docId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    for (let i = 0; i < reordered.length; i++) {
      const doc = reordered[i];
      if ((doc as Record<string, unknown>).sort_order !== i) {
        await updateDocument(doc._collection, doc._id, { sort_order: i });
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
