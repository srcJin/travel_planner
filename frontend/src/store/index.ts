"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import { recordOperation } from "@/store/undo";
import { Document, DayDocument, TripMeta, VisaMeta } from "@/lib/types";

// ── Types ──

interface TripState {
  // Data
  trip: TripMeta | null;
  visa: VisaMeta | null;
  days: DayDocument[];
  documents: Record<string, Document[]>;
  selectedDay: string | null;
  loading: boolean;

  // Computed
  currency: string;

  // Actions
  selectDay: (date: string | null) => void;
  refreshCollection: (collection: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  getDocumentsForDay: (date: string) => Document[];

  // Document mutations (tracked by zundo for undo/redo)
  createDocument: (collection: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  updateDocument: (collection: string, id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  deleteDocument: (collection: string, id: string) => Promise<void>;
}

// ── Store ──

export const useTripStore = create<TripState>()(
    (set, get) => ({
      // Initial state
      trip: null,
      visa: null,
      days: [],
      documents: {},
      selectedDay: null,
      loading: true,
      currency: "€",

      // Select a day
      selectDay: (date) => set({ selectedDay: date }),

      // Refresh a single collection
      refreshCollection: async (collection) => {
        const docs = await api.listDocuments(collection);
        set((state) => ({
          documents: { ...state.documents, [collection]: docs as Document[] },
        }));
      },

      // Refresh all data
      refreshAll: async () => {
        set({ loading: true });

        try {
          const [collections, meta, days] = await Promise.all([
            api.listCollections(),
            api.listDocuments("meta"),
            api.listDocuments("days"),
          ]);

          const docs: Record<string, Document[]> = {
            meta: meta as Document[],
            days: days as Document[],
          };
          const otherCollections = collections.filter((c) => c !== "meta" && c !== "days");
          const otherDocs = await Promise.all(otherCollections.map((c) => api.listDocuments(c)));
          otherCollections.forEach((c, i) => {
            docs[c] = otherDocs[i] as Document[];
          });

          const trip = (meta.find((m) => m._id === "trip") as TripMeta) || null;
          const visa = (meta.find((m) => m._id === "visa") as VisaMeta) || null;

          set({
            trip,
            visa,
            days: (days as DayDocument[]).sort((a, b) => a.date.localeCompare(b.date)),
            documents: docs,
            currency: trip?.currency || "€",
          });
        } catch {
          set({ trip: null, visa: null, days: [], documents: {} });
        } finally {
          set({ loading: false });
        }
      },

      // Get documents for a specific day
      getDocumentsForDay: (date) => {
        const { documents } = get();
        const allDocs: Document[] = [];
        for (const [collection, docs] of Object.entries(documents)) {
          if (collection === "meta" || collection === "days") continue;
          for (const doc of docs) {
            const d = doc as Record<string, unknown>;
            if (d.day === date) {
              allDocs.push(doc);
              continue;
            }
            if (d.start_date && d.end_date) {
              if (date >= (d.start_date as string) && date < (d.end_date as string)) {
                allDocs.push(doc);
              }
            }
          }
        }
        return allDocs;
      },

      // Document mutations — recorded for per-plan undo/redo
      createDocument: async (collection, data) => {
        const doc = await api.createDocument(collection, data);
        const op = {
          action: "create" as const,
          collection,
          id: (doc as Record<string, unknown>)._id as string,
          after: doc as Record<string, unknown>,
        };
        recordOperation(op);
        await get().refreshCollection(collection);
        return doc;
      },

      updateDocument: async (collection, id, data) => {
        // Capture before state for undo
        const before = await api.getDocument(collection, id);
        const doc = await api.updateDocument(collection, id, data);
        const beforeFields: Record<string, unknown> = {};
        if (before) {
          for (const key of Object.keys(data)) {
            beforeFields[key] = before[key];
          }
        }
        const updateOp = { action: "update" as const, collection, id, before: beforeFields, after: data };
        recordOperation(updateOp);
        await get().refreshCollection(collection);
        return doc;
      },

      deleteDocument: async (collection, id) => {
        // Capture full doc for undo
        const before = await api.getDocument(collection, id);
        await api.deleteDocument(collection, id);
        if (before) {
          const deleteOp = { action: "delete" as const, collection, id, before: before as Record<string, unknown> };
          recordOperation(deleteOp);
        }
        await get().refreshCollection(collection);
      },
    })
);

// ── Initialize on first load ──

if (typeof window !== "undefined") {
  useTripStore.getState().refreshAll();
}
