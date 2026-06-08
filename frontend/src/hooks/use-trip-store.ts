"use client";

import { useTripStore } from "@/store";
import { useUndoStore } from "@/store/undo";
import { useUIStore } from "@/store/ui";
import { getCurrencySymbol } from "@/lib/currency";

export function useTrip() {
  const targetCurrency = useUIStore((s) => s.targetCurrency);
  const currencySymbol = getCurrencySymbol(targetCurrency);
  const trip = useTripStore((s) => s.trip);
  const visa = useTripStore((s) => s.visa);
  const days = useTripStore((s) => s.days);
  const documents = useTripStore((s) => s.documents);
  const selectedDay = useTripStore((s) => s.selectedDay);
  const loading = useTripStore((s) => s.loading);
  const selectDay = useTripStore((s) => s.selectDay);
  const refreshCollection = useTripStore((s) => s.refreshCollection);
  const refreshAll = useTripStore((s) => s.refreshAll);
  const getDocumentsForDay = useTripStore((s) => s.getDocumentsForDay);

  return {
    trip,
    visa,
    days,
    documents,
    selectedDay,
    loading,
    currency: currencySymbol,
    currencyCode: targetCurrency,
    selectDay,
    refreshCollection,
    refreshAll,
    getDocumentsForDay,
  };
}

/**
 */
export function useDocuments() {
  const createDocument = useTripStore((s) => s.createDocument);
  const updateDocument = useTripStore((s) => s.updateDocument);
  const deleteDocument = useTripStore((s) => s.deleteDocument);
  const refreshAll = useTripStore((s) => s.refreshAll);

  return {
    create: createDocument,
    update: updateDocument,
    remove: deleteDocument,
    refreshAll,
  };
}

/**
 * Plan-scoped undo/redo.
 */
export function useUndoRedo() {
  const undoStore = useUndoStore();
  return {
    undo: async () => {
      await undoStore.undo();
      await useTripStore.getState().refreshAll();
    },
    redo: async () => {
      await undoStore.redo();
      await useTripStore.getState().refreshAll();
    },
    canUndo: undoStore.past.length > 0,
    canRedo: undoStore.future.length > 0,
  };
}
