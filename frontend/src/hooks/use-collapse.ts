"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "trip-collapsed-days";

function loadCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch { return new Set(); }
}

function saveCollapsed(collapsed: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
}

export function useCollapse() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed());

  const toggle = useCallback((date: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      saveCollapsed(next);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsed(new Set());
    saveCollapsed(new Set());
  }, []);

  const collapseAll = useCallback((dates: string[]) => {
    const all = new Set(dates);
    setCollapsed(all);
    saveCollapsed(all);
  }, []);

  const isCollapsed = useCallback((date: string) => collapsed.has(date), [collapsed]);

  return { isCollapsed, toggle, expandAll, collapseAll, collapsedCount: collapsed.size };
}
