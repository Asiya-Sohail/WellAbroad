import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export const maxDuration = 60;

type Ctx = { params: Promise<{ docId: string; step: string }> };
const bad = (status = 400) => NextResponse.json({ code: "invalid" }, { status });

export async function GET(req: Request, ctx: Ctx) {
  const { docId, step } = await ctx.params;
  if (step !== "explanation") return bad(404);

  const sid = new URL(req.url).searchParams.get("session_id");
  if (!sid) return bad();

  return backend(`/docs/${encodeURIComponent(docId)}/explanation?session_id=${encodeURIComponent(sid)}`);
}

export async function POST(req: Request, ctx: Ctx) {
  const { docId, step } = await ctx.params;
  if (step !== "chat") return bad(404);

  let body: { message?: unknown; session_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad();
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sid = typeof body.session_id === "string" ? body.session_id : "";
  if (!message || message.length > 2000 || !sid) return bad();

  return backend(`/docs/${encodeURIComponent(docId)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sid }),
  });
}