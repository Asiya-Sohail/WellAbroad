import type { CountryId, Lang } from "./symptoms-data";

export type Question = {
  target: string;
  question: string;
  quick_options?: string[] | null;
  done?: boolean;
  red_flag?: boolean;
};

export type AnswerResult = {
  done: boolean;
  question: Question | null;
  red_flag: boolean;
  urgent_message: string | null;
};

export type ConsultSummary = {
  english: string;
  local_language: string;
  user_language: string;
  skipped: string[];
  red_flag: boolean;
  disclaimer: string;
};

export class ApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export const COUNTRY_EN: Record<CountryId, string> = {
  PK: "Pakistan",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
};
export const LANG_EN: Record<Lang, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  ur: "Urdu",
};

async function call<T>(url: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal });
  } catch {
    throw new ApiError("network");
  }
  let json: unknown = await res.json();

  if (!res.ok) {
    const code = (json as { code?: unknown } | null)?.code;
    throw new ApiError(typeof code === "string" ? code : "generic");
  }
  return json as T;
}

const post = (body?: unknown): RequestInit => ({
  method: "POST",
  ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
});

export const createSession = (p: { ui_lang: string; country: string; local_lang: string }) =>
  call<{ session_id: string; expires_in_seconds: number }>("/api/session", post(p));

export const startConsult = (sid: string) =>
  call<AnswerResult>(`/api/consult/${encodeURIComponent(sid)}/start`, post());

export const sendAnswer = (sid: string, answer: string | null, skip = false) =>
  call<AnswerResult>(`/api/consult/${encodeURIComponent(sid)}/answer`, post({ answer, skip }));

export const getSummary = (sid: string) =>
  call<ConsultSummary>(`/api/consult/${encodeURIComponent(sid)}/summary`);