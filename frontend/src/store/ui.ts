"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LayoutWidths {
  leftSidebar: number;
  rightSidebar: number;
  mapHeight: number;
}

const DEFAULT_LAYOUT: LayoutWidths = {
  leftSidebar: 460,
  rightSidebar: 320,
  mapHeight: 200,
};

interface UIState {
  detailDoc: { collection: string; id: string } | null;
  hideTransitOnMap: boolean;
  targetCurrency: "EUR" | "USD" | "CNY" | "GBP" | "CHF";
  layout: LayoutWidths;
  leftCollapsed: boolean;
  rightCollapsed: boolean;

  openDetail: (collection: string, id: string) => void;
  closeDetail: () => void;
  setHideTransitOnMap: (hide: boolean) => void;
  setTargetCurrency: (currency: "EUR" | "USD" | "CNY" | "GBP" | "CHF") => void;
  setLayout: (partial: Partial<LayoutWidths>) => void;
  resetLayout: () => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      detailDoc: null,
      hideTransitOnMap: true,
      targetCurrency: "EUR",
      layout: DEFAULT_LAYOUT,
      leftCollapsed: false,
      rightCollapsed: false,

      openDetail: (collection, id) => set({ detailDoc: { collection, id } }),
      closeDetail: () => set({ detailDoc: null }),
      setHideTransitOnMap: (hide) => set({ hideTransitOnMap: hide }),
      setTargetCurrency: (targetCurrency) => set({ targetCurrency }),
      setLayout: (partial) => set((s) => ({ layout: { ...s.layout, ...partial } })),
      resetLayout: () => set({ layout: DEFAULT_LAYOUT }),
      toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
      toggleRightCollapsed: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
    }),
    {
      name: "trip-ui-settings",
      merge: (persisted, current) => {
        const state = persisted as Partial<UIState> | undefined;
        const layout: Partial<LayoutWidths> = state?.layout || {};
        const persistedLeftSidebar =
          typeof layout.leftSidebar === "number" ? layout.leftSidebar : current.layout.leftSidebar;

        return {
          ...current,
          hideTransitOnMap: state?.hideTransitOnMap ?? current.hideTransitOnMap,
          targetCurrency: state?.targetCurrency ?? current.targetCurrency,
          layout: {
            ...current.layout,
            ...layout,
            leftSidebar: Math.max(persistedLeftSidebar, DEFAULT_LAYOUT.leftSidebar),
          },
          leftCollapsed: state?.leftCollapsed ?? current.leftCollapsed,
          rightCollapsed: state?.rightCollapsed ?? current.rightCollapsed,
        };
      },
      partialize: (state) => ({
        hideTransitOnMap: state.hideTransitOnMap,
        targetCurrency: state.targetCurrency,
        layout: state.layout,
        leftCollapsed: state.leftCollapsed,
        rightCollapsed: state.rightCollapsed,
      }),
    }
  )
);
