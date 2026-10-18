// app/api/translate-document/route.ts
// Thin proxy so the backend URL / key never reach the browser.
// Errors return a `code`; the client shows the translated text for it.
// .env.local:  TRANSLATE_API_URL=https://your-backend/translate   TRANSLATE_API_KEY=optional
import { NextResponse } from "next/server";

export const maxDuration = 300;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const fail = (code: string, status: number) => NextResponse.json({ code }, { status });

export async function POST(req: Request) {
  const url = process.env.TRANSLATE_API_URL;
  if (!url) return fail("not_configured", 500);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("invalid_upload", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("no_file", 400);
  if (!ALLOWED.includes(file.type)) return fail("unsupported_type", 415);
  if (file.size > MAX_BYTES) return fail("too_large", 413);

  try {
    const upstream = await fetch(url, {
      method: "POST",
      body: form, // forwards `file` and `target_language`
      headers: process.env.TRANSLATE_API_KEY
        ? { Authorization: `Bearer ${process.env.TRANSLATE_API_KEY}` }
        : undefined,
      signal: AbortSignal.timeout(295_000),
    });

    if (!upstream.ok) return fail("upstream_error", 502);
    return NextResponse.json(await upstream.json());
  } catch {
    return fail("timeout", 504);
  }
}
