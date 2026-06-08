"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "trip-column-widths";

export interface ColumnWidths {
  date: number;
  location: number;
  detail: number;
  stay: number;
}

export const MIN_COLUMN_WIDTHS: ColumnWidths = {
  date: 40,
  location: 72,
  detail: 160,
  stay: 72,
};

const DEFAULTS: ColumnWidths = {
  date: 56,
  location: 130,
  detail: 520,
  stay: 120,
};

function load(): ColumnWidths {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? { ...DEFAULTS, ...JSON.parse(data) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

function save(widths: ColumnWidths) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
}

export function useColumnWidths() {
  const [widths, setWidths] = useState<ColumnWidths>(load);

  const setWidth = useCallback((column: keyof ColumnWidths, width: number) => {
    setWidths((prev) => {
      const next = { ...prev, [column]: Math.max(MIN_COLUMN_WIDTHS[column], width) };
      save(next);
      return next;
    });
  }, []);

  const gridTemplate = `
    minmax(${MIN_COLUMN_WIDTHS.date}px, ${widths.date}px)
    minmax(${MIN_COLUMN_WIDTHS.location}px, ${widths.location}px)
    minmax(${MIN_COLUMN_WIDTHS.detail}px, ${widths.detail}fr)
    minmax(${MIN_COLUMN_WIDTHS.stay}px, ${widths.stay}px)
  `;

  return { widths, setWidth, gridTemplate };
}
