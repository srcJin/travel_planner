export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ApiClient {
  listCollections: () => Promise<string[]>;
  listDocuments: (collection: string, filters?: Record<string, string>) => Promise<Record<string, unknown>[]>;
  getDocument: (collection: string, id: string) => Promise<Record<string, unknown>>;
  createDocument: (collection: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  updateDocument: (collection: string, id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  deleteDocument: (collection: string, id: string) => Promise<{ ok: boolean }>;
  exportAll: () => Promise<Record<string, unknown[]>>;
  importAll: (data: Record<string, unknown[]>) => Promise<{ imported: number }>;
}

function resolveRequestUrl(path: string): string {
  return `${API_URL}${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(resolveRequestUrl(path), {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api: ApiClient = {
  listCollections: () => request<string[]>("/api/collections"),

  listDocuments: (collection, filters) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : "";
    return request<Record<string, unknown>[]>(`/api/${collection}${query}`);
  },

  getDocument: (collection, id) =>
    request<Record<string, unknown>>(`/api/${collection}/${id}`),

  createDocument: (collection, data) =>
    request<Record<string, unknown>>(`/api/${collection}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateDocument: (collection, id, data) =>
    request<Record<string, unknown>>(`/api/${collection}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteDocument: (collection, id) =>
    request<{ ok: boolean }>(`/api/${collection}/${id}`, {
      method: "DELETE",
    }),

  exportAll: () => request<Record<string, unknown[]>>("/api/export"),

  importAll: (data) =>
    request<{ imported: number }>("/api/import", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
