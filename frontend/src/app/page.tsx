"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/top-bar";
import { Timeline } from "@/components/timeline";
import { DetailPanel } from "@/components/detail-panel";
import { useUIStore } from "@/store/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const MapView = dynamic(() => import("@/components/map-view").then((m) => m.MapView), {
  ssr: false,
});

function ResizableLayout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layout = useUIStore((s) => s.layout);
  const setLayout = useUIStore((s) => s.setLayout);
  const detailDoc = useUIStore((s) => s.detailDoc);
  const leftCollapsed = useUIStore((s) => s.leftCollapsed);
  const dragging = useRef(false);
  const draggingLeft = useRef(false);
  const draggingMapH = useRef(false);
  const startDrag = useCallback((which: "left" | "right" | "mapH") => (e: React.MouseEvent) => {
    e.preventDefault();
    if (which === "left") draggingLeft.current = true;
    else if (which === "mapH") draggingMapH.current = true;
    else dragging.current = true;
    document.body.style.cursor = which === "mapH" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (dragging.current) {
        const w = Math.max(200, Math.min(rect.right - e.clientX, rect.width - 400));
        setLayout({ rightSidebar: w });
      }
      if (draggingLeft.current) {
        const timelineEnd = e.clientX - rect.left;
        const w = Math.max(200, Math.min(rect.width - timelineEnd - 4, rect.width - 400));
        setLayout({ leftSidebar: w });
      }
      if (draggingMapH.current) {
        // Get the left sidebar element position
        const sidebar = containerRef.current.querySelector("[data-sidebar='left']");
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          const h = Math.max(100, Math.min(e.clientY - sidebarRect.top, 500));
          setLayout({ mapHeight: h });
        }
      }
    };

    const onMouseUp = () => {
      dragging.current = false;
      draggingLeft.current = false;
      draggingMapH.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [layout.rightSidebar, setLayout]);

  return (
    <div ref={containerRef} className="hidden md:flex flex-1 overflow-hidden">
      {/* Main timeline */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <Timeline />
      </div>

      {/* Detail sidebar: map on top, selected record editor below */}
      {!leftCollapsed && (
        <>
          <div
            onMouseDown={startDrag("left")}
            className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors flex-shrink-0"
          />
          <div
            data-sidebar="left"
            className="flex-shrink-0 flex flex-col border-l border-gray-300"
            style={{ width: layout.leftSidebar, maxWidth: "45vw" }}
          >
            <div className="flex-shrink-0 relative" style={{ height: layout.mapHeight }}>
              <MapView />
            </div>
            {/* Map height drag handle */}
            <div
              onMouseDown={startDrag("mapH")}
              className="h-1 cursor-row-resize bg-gray-200 hover:bg-blue-400 transition-colors flex-shrink-0"
            />
            <div className="flex-1 overflow-y-auto">
              {detailDoc ? (
                <DetailPanel />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">
                  Click an item to view details
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const detailDoc = useUIStore((s) => s.detailDoc);
  const [mobileTab, setMobileTab] = useState("timeline");

  useEffect(() => {
    if (detailDoc) setMobileTab("detail");
  }, [detailDoc]);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <TopBar />

      {/* Desktop layout: resizable side-by-side */}
      <ResizableLayout />

      {/* Mobile layout: tab toggle */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="w-full rounded-none border-b bg-white px-4">
            <TabsTrigger value="timeline" className="flex-1">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="map" className="flex-1">
              Map
            </TabsTrigger>
            <TabsTrigger value="detail" className="flex-1">
              Detail
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="flex-1 overflow-hidden m-0 p-0">
            <Timeline />
          </TabsContent>
          <TabsContent value="map" className="flex-1 relative m-0 p-0">
            <MapView />
          </TabsContent>
          <TabsContent value="detail" className="flex-1 overflow-y-auto m-0 p-0 bg-white">
            {detailDoc ? (
              <DetailPanel />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400">
                Click an item to view details
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
