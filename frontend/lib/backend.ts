import { NextResponse } from "next/server";

const BASE = process.env.WELLABROAD_API_URL;

export async function backend(path: string, init: RequestInit = {}) {
  if (!BASE) return NextResponse.json({ code: "not_configured" }, { status: 500 });

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });

    if (!res.ok) {
      const code =
        res.status === 404 || res.status === 410
          ? "session_expired"
          : res.status === 422
            ? "invalid"
            : "upstream_error";
      return NextResponse.json({ code }, { status: res.status >= 500 ? 502 : res.status });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ code: "timeout" }, { status: 504 });
  }
}