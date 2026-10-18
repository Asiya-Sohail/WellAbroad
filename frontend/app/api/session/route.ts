import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "invalid" }, { status: 400 });
  }

  const { ui_lang, country, local_lang } = body;
  if (![ui_lang, country, local_lang].every((v) => typeof v === "string" && v.length >= 2)) {
    return NextResponse.json({ code: "invalid" }, { status: 400 });
  }

  return backend("/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ui_lang, country, local_lang }),
  });
}