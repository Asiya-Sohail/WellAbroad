import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const fail = (code: string, status: number) => NextResponse.json({ code }, { status });

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("invalid_upload", 400);
  }

  const file = form.get("file");
  const sid = form.get("session_id");
  const uiLang = form.get("ui_lang");

  if (!(file instanceof File)) return fail("no_file", 400);
  if (!ALLOWED.includes(file.type)) return fail("unsupported_type", 415);
  if (file.size > MAX_BYTES) return fail("too_large", 413);
  if (typeof sid !== "string" || !sid) return fail("invalid", 400);

  const out = new FormData();
  out.append("file", file, file.name);
  out.append("session_id", sid);
  out.append("ui_lang", typeof uiLang === "string" && uiLang ? uiLang : "English");

  return backend("/docs", { method: "POST", body: out });
}

