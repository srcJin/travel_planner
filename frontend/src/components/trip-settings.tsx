"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, X, Download, Upload, RotateCcw } from "lucide-react";
import { useTrip } from "@/hooks/use-trip-store";
import { useUIStore } from "@/store/ui";
import { api } from "@/lib/api";

export function TripSettings() {
  const { trip, visa, refreshAll } = useTrip();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState<"EUR" | "USD" | "CNY" | "GBP" | "CHF">("EUR");
  const [visaEntry, setVisaEntry] = useState("");
  const [visaExit, setVisaExit] = useState("");

  const handleOpen = () => {
    setTripName(trip?.name || "");
    setStartDate(trip?.start_date || "");
    setEndDate(trip?.end_date || "");
    setDisplayCurrency(useUIStore.getState().targetCurrency);
    setVisaEntry(visa?.entry_date || "");
    setVisaExit(visa?.exit_date || "");
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateDocument("meta", "trip", {
        name: tripName,
        start_date: startDate,
        end_date: endDate,
      });
      await api.updateDocument("meta", "visa", {
        entry_date: visaEntry,
        exit_date: visaExit,
      });
      useUIStore.getState().setTargetCurrency(displayCurrency);
      await refreshAll();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const data = await api.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip?.name || "trip"}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await api.importAll(data);
    await refreshAll();
    if (importRef.current) importRef.current.value = "";
  };

  const handleResetToSeed = async () => {
    await refreshAll();
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Trip Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-lg shadow-xl w-[420px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Trip Settings</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</h3>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={tripName} onChange={(e) => setTripName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Visa Window</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Entry Date</Label>
                <Input type="date" value={visaEntry} onChange={(e) => setVisaEntry(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Exit Limit</Label>
                <Input type="date" value={visaExit} onChange={(e) => setVisaExit(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <p className="text-[11px] text-gray-400">Days used and max days are auto-calculated from trip dates and visa window.</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Display</h3>
            <div className="space-y-1">
              <Label className="text-xs">Target Currency</Label>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as "EUR" | "USD" | "CNY" | "GBP" | "CHF")}
                className="h-8 text-sm w-full border border-gray-200 px-2"
              >
                <option value="EUR">€ Euro</option>
                <option value="USD">$ US Dollar</option>
                <option value="CNY">¥ Chinese Yuan</option>
                <option value="GBP">£ Pound Sterling</option>
                <option value="CHF">CHF Swiss Franc</option>
              </select>
              <p className="text-[11px] text-gray-400">Display-only setting. Source records keep their original paid currency.</p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={useUIStore.getState().hideTransitOnMap}
                onChange={(e) => useUIStore.getState().setHideTransitOnMap(e.target.checked)}
                className="h-4 w-4"
              />
              Hide transit days (no country) on map
            </label>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => { useUIStore.getState().resetLayout(); }}
            >
              Reset panel layout
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Data</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                <Download className="w-3.5 h-3.5" /> Export JSON
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => importRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Import JSON
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResetToSeed}>
                <RotateCcw className="w-3.5 h-3.5" /> Reload JSON
              </Button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
            <p className="text-[11px] text-gray-400">Export saves all trip data. Import merges records. Reload reads the canonical JSON file again.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
