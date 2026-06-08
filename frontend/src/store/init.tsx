"use client";

import { useEffect } from "react";
import { useTripStore } from "@/store";
import { useUndoStore } from "@/store/undo";

export function StoreInit() {
  const refreshAll = useTripStore((s) => s.refreshAll);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Keyboard shortcuts: Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z for redo
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          await useUndoStore.getState().redo();
        } else {
          await useUndoStore.getState().undo();
        }
        await useTripStore.getState().refreshAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}
