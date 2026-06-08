import { NextRequest, NextResponse } from "next/server";
import {
  createDocument,
  deleteDocument,
  getDocument,
  importData,
  listCollections,
  listDocuments,
  readData,
  StoreData,
  updateDocument,
} from "@/lib/server/file-data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

async function getPath(ctx: RouteContext): Promise<string[]> {
  const params = await ctx.params;
  return params.path || [];
}

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function notFound(message = "Not found") {
  return json({ error: message }, 404);
}

function methodNotAllowed() {
  return json({ error: "Method not allowed" }, 405);
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const path = await getPath(ctx);
  const data = await readData();

  if (path.length === 1 && path[0] === "collections") {
    return json(listCollections(data));
  }

  if (path.length === 1 && path[0] === "export") {
    return json(data);
  }

  if (path.length === 1) {
    const filters = Object.fromEntries(request.nextUrl.searchParams.entries());
    return json(listDocuments(data, path[0], filters));
  }

  if (path.length === 2) {
    const doc = getDocument(data, path[0], path[1]);
    return doc ? json(doc) : notFound("Document not found");
  }

  return notFound();
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const path = await getPath(ctx);

  if (path.length === 1 && path[0] === "import") {
    const imported = await readBody(request);
    return json({ imported: await importData(imported as StoreData) });
  }

  if (path.length === 1) {
    return json(await createDocument(path[0], await readBody(request)), 201);
  }

  return methodNotAllowed();
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const path = await getPath(ctx);

  if (path.length === 2) {
    const doc = await updateDocument(path[0], path[1], await readBody(request));
    return doc ? json(doc) : notFound("Document not found");
  }

  return methodNotAllowed();
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  const path = await getPath(ctx);

  if (path.length === 2) {
    return (await deleteDocument(path[0], path[1])) ? json({ ok: true }) : notFound("Document not found");
  }

  return methodNotAllowed();
}
