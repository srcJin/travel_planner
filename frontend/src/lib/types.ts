export interface Document {
  _id: string;
  _collection: string;
  [key: string]: unknown;
}

export interface DayDocument extends Document {
  date: string;
  day_number: number;
  country: string | null;
  location: string;
  status: "unplanned" | "in_progress" | "planned";
  notes?: string;
}

export interface TripMeta extends Document {
  name: string;
  start_date: string;
  end_date: string;
  currency?: string;
}

export interface VisaMeta extends Document {
  type: string;
  entry_date: string;
  exit_date: string;
  max_days: number;
  used_days: number;
}

export type FieldValue = string | number | boolean | null | FieldValue[] | { [key: string]: FieldValue };
