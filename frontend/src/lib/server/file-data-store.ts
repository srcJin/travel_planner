import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type StoreDocument = Record<string, unknown>;
export type StoreData = Record<string, StoreDocument[]>;

const DATA_FILE = path.join(process.cwd(), "src/lib/seed-data.json");

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix = ""): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  }
  return `${prefix}${Math.random().toString(16).slice(2, 10)}`;
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return clone(fallback);
  }
}

async function writeJsonFile(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizeData(data: StoreData): StoreData {
  const normalized: StoreData = {};
  for (const [collection, docs] of Object.entries(data)) {
    normalized[collection] = Array.isArray(docs)
      ? docs.map((doc) => ({
          ...doc,
          _id: String(doc._id || makeId()),
          _collection: collection,
        }))
      : [];
  }
  return normalized;
}

export async function readData(): Promise<StoreData> {
  return normalizeData(await readJsonFile<StoreData>(DATA_FILE, {}));
}

async function writeData(data: StoreData) {
  await writeJsonFile(DATA_FILE, normalizeData(data));
}

export function listCollections(data: StoreData): string[] {
  return Object.keys(data);
}

export function listDocuments(data: StoreData, collection: string, filters?: Record<string, string>): StoreDocument[] {
  const docs = data[collection] || [];
  if (!filters || Object.keys(filters).length === 0) return clone(docs);
  return clone(
    docs.filter((doc) =>
      Object.entries(filters).every(([key, value]) => String(doc[key] ?? "") === value)
    )
  );
}

export function getDocument(data: StoreData, collection: string, id: string): StoreDocument | null {
  return clone((data[collection] || []).find((doc) => String(doc._id) === id) || null);
}

export async function createDocument(collection: string, rawDoc: StoreDocument): Promise<StoreDocument> {
  const data = await readData();
  const doc = {
    ...rawDoc,
    _id: String(rawDoc._id || makeId()),
    _collection: collection,
  };
  data[collection] = [...(data[collection] || []), doc];
  await writeData(data);
  return clone(doc);
}

export async function updateDocument(collection: string, id: string, updates: StoreDocument): Promise<StoreDocument | null> {
  const data = await readData();
  const docs = data[collection] || [];
  const index = docs.findIndex((doc) => String(doc._id) === id);
  if (index === -1) return null;
  docs[index] = {
    ...docs[index],
    ...updates,
    _id: id,
    _collection: collection,
  };
  data[collection] = docs;
  await writeData(data);
  return clone(docs[index]);
}

export async function deleteDocument(collection: string, id: string): Promise<boolean> {
  const data = await readData();
  const docs = data[collection] || [];
  const nextDocs = docs.filter((doc) => String(doc._id) !== id);
  if (nextDocs.length === docs.length) return false;
  data[collection] = nextDocs;
  await writeData(data);
  return true;
}

export async function importData(imported: StoreData): Promise<number> {
  const data = await readData();
  let count = 0;
  for (const [collection, docs] of Object.entries(imported)) {
    if (!Array.isArray(docs)) continue;
    const byId = new Map((data[collection] || []).map((doc) => [String(doc._id), doc]));
    for (const rawDoc of docs) {
      const doc = {
        ...rawDoc,
        _id: String(rawDoc._id || makeId()),
        _collection: collection,
      };
      byId.set(String(doc._id), doc);
      count += 1;
    }
    data[collection] = Array.from(byId.values());
  }
  await writeData(data);
  return count;
}
