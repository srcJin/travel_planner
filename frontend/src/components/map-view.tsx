"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTrip } from "@/hooks/use-trip-store";
import { useUIStore } from "@/store/ui";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const CITY_COORDS: Record<string, [number, number]> = {
  "New York": [-74.006, 40.7128],
  Barcelona: [2.1734, 41.3851],
  Valencia: [-0.3763, 39.4699],
  Seville: [-5.9845, 37.3891],
  Madrid: [-3.7038, 40.4168],
  Marseille: [5.3698, 43.2965],
  Athens: [23.7275, 37.9838],
  Boston: [-71.0589, 42.3601],
};

const COLLECTION_MARKER_COLORS: Record<string, string> = {
  transportation: "#3b82f6",
  activities: "#f59e0b",
  accommodation: "#10b981",
};

function getCityFromLocation(location: string): string {
  if (location.includes("→")) {
    return location.split("→").pop()!.trim();
  }
  return location.trim();
}

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { selectedDay, days, getDocumentsForDay, documents, selectDay } = useTrip();
  const hideTransit = useUIStore((s) => s.hideTransitOnMap);
  const openDetail = useUIStore((s) => s.openDetail);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [2.1734, 41.3851],
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (selectedDay) {
      const day = days.find((d) => d.date === selectedDay);
      if (day) {
        // First try location_coords from geocoded day location
        const dayCoords = (day as Record<string, unknown>).location_coords as { lat: number; lng: number } | undefined;
        if (dayCoords && dayCoords.lat && dayCoords.lng) {
          map.current.flyTo({ center: [dayCoords.lng, dayCoords.lat], zoom: 13, duration: 1000 });
        } else {
          // Fallback to hardcoded CITY_COORDS
          const city = getCityFromLocation(day.location);
          const coords = CITY_COORDS[city];
          if (coords) {
            map.current.flyTo({ center: coords, zoom: 13, duration: 1000 });
          }
        }
      }

      const dayDocs = getDocumentsForDay(selectedDay);
      for (const doc of dayDocs) {
        if ((doc as Record<string, unknown>).show_on_map === false) continue;
        const loc = doc.location as { lat: number; lng: number } | undefined;
        if (!loc || !loc.lat || !loc.lng) continue;

        const color = COLLECTION_MARKER_COLORS[doc._collection] || "#6b7280";
        const el = document.createElement("div");
        el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;position:relative;`;
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          openDetail(doc._collection, doc._id);
        });
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map.current!);

        markersRef.current.push(marker);
      }
    } else {
      const filteredDays = hideTransit ? days.filter((d) => d.country) : days;
      // Build city markers from day data (prefer location_coords, fallback to CITY_COORDS)
      const seenCities = new Set<string>();
      const bounds = new mapboxgl.LngLatBounds();
      let hasBounds = false;

      for (const d of filteredDays) {
        const city = getCityFromLocation(d.location);
        if (seenCities.has(city)) continue;
        seenCities.add(city);

        const dayCoords = (d as Record<string, unknown>).location_coords as { lat: number; lng: number } | undefined;
        const coords: [number, number] | null = dayCoords && dayCoords.lat && dayCoords.lng
          ? [dayCoords.lng, dayCoords.lat]
          : CITY_COORDS[city] || null;
        if (!coords) continue;

        bounds.extend(coords);
        hasBounds = true;

        const el = document.createElement("div");
        el.style.cssText = "width:10px;height:10px;border-radius:50%;background:#374151;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;";
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          selectDay(d.date);
        });
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map.current!);

        markersRef.current.push(marker);
      }

      // Show all activities/transport with locations
      for (const col of ["activities", "transportation"] as const) {
        const colDocs = (documents[col] || []) as Array<Record<string, unknown>>;
        for (const doc of colDocs) {
          if (doc.show_on_map === false) continue;
          const loc = doc.location as { lat: number; lng: number } | undefined;
          if (!loc || !loc.lat || !loc.lng) continue;
          bounds.extend([loc.lng, loc.lat]);
          hasBounds = true;
          const color = COLLECTION_MARKER_COLORS[col] || "#6b7280";
          const el = document.createElement("div");
          el.style.cssText = `width:8px;height:8px;border-radius:50%;background:${color};border:1.5px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.2);cursor:pointer;`;
          el.addEventListener("click", (event) => {
            event.stopPropagation();
            openDetail(String(doc._collection), String(doc._id));
          });
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([loc.lng, loc.lat])
            .addTo(map.current!);
          markersRef.current.push(marker);
        }
      }

      if (hasBounds) {
        map.current.fitBounds(bounds, { padding: 60, duration: 1000, maxZoom: 10 });
      }
    }
  }, [selectedDay, days, getDocumentsForDay, hideTransit, documents, openDetail, selectDay]);

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
