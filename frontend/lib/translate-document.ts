import { ApiError, createSession, LANG_EN } from "./consult";
import { Lang } from "./symptoms-data";

export { ApiError };


// Language names are shown in their own language on purpose.
export const TARGET_LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ur", label: "اردو (Urdu)" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "es", label: "Español" },
];

export const MAX_MB = 10;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export type DocumentResult = {
  docId: string;
  explanation: string;
  extracted: Record<string, unknown>;
  unreadable: string[];
  disclaimer?: string;
};

export type ChatReply = { answer: string; urgent: boolean; disclaimer?: string };

/** Returns an error code ("type" | "size") or null when the file is fine. */
export function validateFile(file: File): "type" | "size" | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_MB * 1024 * 1024) return "size";
  return null;
}

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("network");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new ApiError(str(obj(json).code) ?? "generic");
  return json as T;
}

const newSession = async (target: Lang) =>
  (
    await createSession({
      ui_lang: LANG_EN[target],
      country: "Not specified", // the documents page has no country picker
      local_lang: LANG_EN[target],
    })
  ).session_id;

/* ------------------------------ upload ------------------------------ */

async function upload(file: File, sid: string, target: Lang, signal?: AbortSignal) {
  const body = new FormData();
  body.append("file", file);
  body.append("session_id", sid);
  body.append("ui_lang", LANG_EN[target]);

  const r = obj(await request<unknown>("/api/docs", { method: "POST", body, signal }));
  const result: DocumentResult = {
    docId: str(r.doc_id) ?? "",
    explanation: str(r.explanation) ?? "",
    extracted: obj(r.extracted),
    unreadable: strs(r.unreadable_parts),
    disclaimer: str(r.disclaimer),
  };
  if (!result.docId || (!result.explanation && Object.keys(result.extracted).length === 0)) {
    throw new ApiError("empty");
  }
  return result;
}

/** Creates a session on first use, reuses it afterwards, and recreates it once if it expired. */
export async function analyzeDocument(
  file: File,
  target: Lang,
  sid: string | null,
  signal?: AbortSignal,
): Promise<{ sid: string; result: DocumentResult }> {
  let id = sid ?? (await newSession(target));
  try {
    return { sid: id, result: await upload(file, id, target, signal) };
  } catch (e) {
    if (e instanceof ApiError && e.code === "session_expired") {
      id = await newSession(target);
      return { sid: id, result: await upload(file, id, target, signal) };
    }
    throw e;
  }
}

/* ------------------------------ follow-ups ------------------------------ */

export async function askDocument(docId: string, sid: string, message: string, signal?: AbortSignal): Promise<ChatReply> {
  const r = obj(
    await request<unknown>(`/api/docs/${encodeURIComponent(docId)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sid }),
      signal,
    }),
  );
  return { answer: str(r.answer) ?? "", urgent: r.urgent === true, disclaimer: str(r.disclaimer) };
}

export const getExplanation = (docId: string, sid: string) =>
  request<string>(`/api/docs/${encodeURIComponent(docId)}/explanation?session_id=${encodeURIComponent(sid)}`);