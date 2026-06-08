"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

/**
 * Persistent operation-based undo/redo.
 *
 * Unlike state-snapshot undo (zundo), this records API operations
 * and replays/reverses them. Persists to localStorage so it survives
 * page refresh.
 *
 * Each operation stores enough info to reverse:
 * - create: stores the full document (undo = delete it)
 * - update: stores before/after field values (undo = apply before)
 * - delete: stores the full document (undo = re-create it)
 */

interface Operation {
  action: "create" | "update" | "delete";
  collection: string;
  id: string;
  before?: Record<string, unknown>;  // for update undo + delete undo
  after?: Record<string, unknown>;   // for create redo + update redo
  timestamp: string;
}

interface UndoStore {
  past: Operation[];
  future: Operation[];
  push: (op: Operation) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
}

const MAX_HISTORY = 100;

export const useUndoStore = create<UndoStore>()(
  persist(
    (set, get) => ({
      past: [],
      future: [],

      push: (op) => set((s) => ({
        past: [...s.past.slice(-MAX_HISTORY + 1), op],
        future: [], // new action clears redo
      })),

      undo: async () => {
        const { past } = get();
        if (past.length === 0) return;

        const op = past[past.length - 1];
        try {
          if (op.action === "create" && op.after) {
            await api.deleteDocument(op.collection, op.id);
          } else if (op.action === "update" && op.before) {
            await api.updateDocument(op.collection, op.id, op.before);
          } else if (op.action === "delete" && op.before) {
            await api.createDocument(op.collection, op.before);
          }
        } catch { /* best effort */ }

        set((s) => ({
          past: s.past.slice(0, -1),
          future: [...s.future, op],
        }));
      },

      redo: async () => {
        const { future } = get();
        if (future.length === 0) return;

        const op = future[future.length - 1];
        try {
          if (op.action === "create" && op.after) {
            await api.createDocument(op.collection, op.after);
          } else if (op.action === "update" && op.after) {
            await api.updateDocument(op.collection, op.id, op.after);
          } else if (op.action === "delete") {
            await api.deleteDocument(op.collection, op.id);
          }
        } catch { /* best effort */ }

        set((s) => ({
          past: [...s.past, op],
          future: s.future.slice(0, -1),
        }));
      },

      clear: () => set({ past: [], future: [] }),
    }),
    {
      name: "trip-undo-history",
      // Only persist past/future arrays, not functions
      partialize: (state) => ({
        past: state.past,
        future: state.future,
      }),
    }
  )
);

/**
 * Helper to record an operation. Call after successful API mutation.
 */
export function recordOperation(op: Omit<Operation, "timestamp">) {
  useUndoStore.getState().push({
    ...op,
    timestamp: new Date().toISOString(),
  });
}
