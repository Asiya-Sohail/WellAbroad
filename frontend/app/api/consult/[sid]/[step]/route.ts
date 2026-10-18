import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export const maxDuration = 300;

const STEPS = { start: "POST", answer: "POST", summary: "GET" } as const;
type Ctx = { params: Promise<{ sid: string; step: string }> };

async function handle(req: Request, ctx: Ctx, method: "GET" | "POST") {
  const { sid, step } = await ctx.params;
  if (!(step in STEPS) || STEPS[step as keyof typeof STEPS] !== method) {
    return NextResponse.json({ code: "invalid" }, { status: 404 });
  }

  const path = `/consult/${encodeURIComponent(sid)}/${step}`;
  if (method === "GET") return backend(path);

  if (step === "answer") {
    let body: { answer?: unknown; skip?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ code: "invalid" }, { status: 400 });
    }
    const skip = body.skip === true;
    const answer = skip ? null : typeof body.answer === "string" ? body.answer.slice(0, 2000) : null;
    return backend(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, skip }),
    });
  }

  return backend(path, { method: "POST" });
}

export const GET = (req: Request, ctx: Ctx) => handle(req, ctx, "GET");
export const POST = (req: Request, ctx: Ctx) => handle(req, ctx, "POST");
