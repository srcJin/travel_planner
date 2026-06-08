/**
 * Calendar-style time lane layout for concurrent events.
 * Detects overlapping time ranges and assigns column positions.
 */

export interface TimeBlock {
  id: string;
  startMin: number; // minutes from midnight
  endMin: number;
}

export interface LaneAssignment {
  id: string;
  column: number;    // 0-based column index
  totalColumns: number; // total columns in this overlap group
}

/**
 * Parse "HH:MM" to minutes from midnight. Returns -1 if invalid.
 */
export function parseTime(t: string): number {
  if (!t || typeof t !== "string") return -1;
  const parts = t.split(":");
  if (parts.length < 2) return -1;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

/**
 * Given a list of time blocks, assign each to a column so that
 * overlapping blocks are side-by-side. Returns a map of id -> LaneAssignment.
 */
export function assignLanes(blocks: TimeBlock[]): Map<string, LaneAssignment> {
  if (blocks.length === 0) return new Map();

  // Sort by start time, then by end time (longer events first)
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  // Find overlap groups: connected components where events share time
  const groups: TimeBlock[][] = [];
  let currentGroup: TimeBlock[] = [sorted[0]];
  let groupEnd = sorted[0].endMin;

  for (let i = 1; i < sorted.length; i++) {
    const block = sorted[i];
    if (block.startMin < groupEnd) {
      // Overlaps with current group
      currentGroup.push(block);
      groupEnd = Math.max(groupEnd, block.endMin);
    } else {
      // New group
      groups.push(currentGroup);
      currentGroup = [block];
      groupEnd = block.endMin;
    }
  }
  groups.push(currentGroup);

  // Assign columns within each group using greedy interval coloring
  const result = new Map<string, LaneAssignment>();

  for (const group of groups) {
    if (group.length === 1) {
      result.set(group[0].id, { id: group[0].id, column: 0, totalColumns: 1 });
      continue;
    }

    // Greedy: assign to first column whose last event ended before this one starts
    const columnEnds: number[] = []; // end time of last event in each column

    // Sort group by start time for greedy assignment
    const groupSorted = [...group].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

    for (const block of groupSorted) {
      let assigned = false;
      for (let col = 0; col < columnEnds.length; col++) {
        if (columnEnds[col] <= block.startMin) {
          columnEnds[col] = block.endMin;
          result.set(block.id, { id: block.id, column: col, totalColumns: 0 }); // totalColumns set later
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        result.set(block.id, { id: block.id, column: columnEnds.length, totalColumns: 0 });
        columnEnds.push(block.endMin);
      }
    }

    // Set totalColumns for all items in this group
    const totalCols = columnEnds.length;
    for (const block of group) {
      const assignment = result.get(block.id);
      if (assignment) assignment.totalColumns = totalCols;
    }
  }

  return result;
}
