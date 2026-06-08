import { Document } from "@/lib/types";

type D = Record<string, unknown>;

export type ActivityHierarchy = "anchor" | "semi_flexible" | "flexible";

const HIERARCHY_RANK: Record<ActivityHierarchy, number> = {
  anchor: 0,
  semi_flexible: 1,
  flexible: 2,
};

export function getHierarchy(doc: Document): ActivityHierarchy | "" {
  const value = ((doc as D).hierarchy || "") as string;
  if (value === "anchor" || value === "semi_flexible" || value === "flexible") return value;
  return "";
}

export function getTopLevelGroup(doc: Document): string | null {
  const group = (((doc as D).group || "") as string).trim();
  if (!group) return null;
  const topLevel = group.split("/")[0]?.trim();
  return topLevel || null;
}

export function getEffectiveHierarchy(doc: Document): ActivityHierarchy {
  return getHierarchy(doc) || "semi_flexible";
}

export function getHierarchyRank(doc: Document): number {
  return HIERARCHY_RANK[getEffectiveHierarchy(doc)];
}

export function getNumericCost(doc: Document): number {
  const d = doc as D;
  for (const key of ["cost", "amount", "price"]) {
    const value = d[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

export function isPaidBooked(doc: Document): boolean {
  const d = doc as D;
  return d.booking_status === "booked" && getNumericCost(doc) > 0;
}

export function isAnchorDocument(doc: Document): boolean {
  const d = doc as D;
  return d.ui_highlight === "anchor" || getHierarchy(doc) === "anchor" || isPaidBooked(doc);
}

export function compareItineraryDocs(a: Document, b: Document): number {
  const aTime = (((a as D).time || "") as string);
  const bTime = (((b as D).time || "") as string);
  if (aTime && bTime && aTime !== bTime) return aTime.localeCompare(bTime);
  if (aTime && !bTime) return -1;
  if (!aTime && bTime) return 1;

  const ao = (a as D).sort_order;
  const bo = (b as D).sort_order;
  if (typeof ao === "number" && typeof bo === "number" && ao !== bo) return ao - bo;
  if (typeof ao === "number") return -1;
  if (typeof bo === "number") return 1;

  const hierarchyDiff = getHierarchyRank(a) - getHierarchyRank(b);
  if (hierarchyDiff !== 0) return hierarchyDiff;

  const aTitle = (((a as D).title || (a as D).name || a._id) as string);
  const bTitle = (((b as D).title || (b as D).name || b._id) as string);
  return aTitle.localeCompare(bTitle);
}

export function getHierarchyBadgeLabel(doc: Document): string | null {
  const hierarchy = getEffectiveHierarchy(doc);
  if (hierarchy === "anchor") return "anchor";
  if (hierarchy === "semi_flexible") return "semi-flex";
  return "flex";
}

export function getHierarchySectionClasses(hierarchy: ActivityHierarchy): {
  container: string;
  rail: string;
} {
  if (hierarchy === "anchor") {
    return {
      container: "border-l-4 border-amber-400 bg-amber-50/35",
      rail: "bg-amber-400",
    };
  }
  if (hierarchy === "semi_flexible") {
    return {
      container: "border-l-4 border-blue-300 bg-blue-50/25",
      rail: "bg-blue-300",
    };
  }
  return {
    container: "",
    rail: "bg-transparent",
  };
}
