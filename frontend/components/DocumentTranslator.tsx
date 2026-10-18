"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  Camera,
  Check,
  Copy,
  FileText,
  Loader2,
  Lock,
  Printer,
  RotateCcw,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { idiqlat, TOAST_ID } from "@/lib/utils";
import {
  ACCEPTED_TYPES,
  MAX_MB,
  TARGET_LANGS,
  analyzeDocument,
  askDocument,
  validateFile,
  type DocumentResult,
} from "@/lib/translate-document";
import { Lang } from "@/lib/symptoms-data";

const h2 = `${idiqlat.className} text-[30px] font-semibold leading-tight md:text-[40px]`;
const h3 = `${idiqlat.className} text-2xl font-semibold leading-tight md:text-[28px]`;

type Status = "idle" | "loading" | "done";

const label = (k: string) => k.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const flat = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

function Value({ v }: { v: unknown }) {
  if (isEmpty(v)) return <>—</>;
  if (Array.isArray(v)) {
    return (
      <ul className="list-disc space-y-1 ps-5">
        {v.map((x, i) => (
          <li key={i}>
            <Value v={x} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof v === "object") {
    return (
      <dl className="space-y-1">
        {Object.entries(v as Record<string, unknown>)
          .filter(([, x]) => !isEmpty(x))
          .map(([k, x]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{label(k)}</dt>
              <dd>
                <Value v={x} />
              </dd>
            </div>
          ))}
      </dl>
    );
  }
  return <>{String(v)}</>;
}


type Msg = { role: "user" | "assistant"; text: string; urgent?: boolean };

function DocChat({ docId, sid, lang }: { docId: string; sid: string; lang: Lang }) {
  const t = useTranslations("documents.result");
  const te = useTranslations("documents");
  const dir = lang === "ur" ? "rtl" : "ltr";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const r = await askDocument(docId, sid, message);
      setMessages((m) => [...m, { role: "assistant", text: r.answer, urgent: r.urgent }]);
    } catch {
      toast.error(te("errors.generic"), { id: TOAST_ID });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="print:hidden">
      <h3 className={h3}>{t("chat.title")}</h3>
      <p className="mt-2 text-sm md:text-[15px]">{t("chat.hint")}</p>

      <div className="mt-4 space-y-3" aria-live="polite">
        {messages.map((m, i) => (
          <div
            key={i}
            dir={dir}
            lang={lang}
            className={`whitespace-pre-wrap rounded-2xl p-4 text-base leading-relaxed ${m.role === "user" ? "ms-auto max-w-[85%] bg-foreground text-background" : "max-w-[85%] bg-muted"
              }`}
          >
            {m.urgent && (
              <p className="mb-2 flex items-center gap-2 font-semibold text-red-700">
                <TriangleAlert className="size-4" aria-hidden /> {t("chat.urgent")}
              </p>
            )}
            {m.text}
          </div>
        ))}
        {busy && (
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden /> {t("chat.thinking")}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <input
          value={input}
          maxLength={2000}
          disabled={busy}
          placeholder={t("chat.placeholder")}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="h-12 w-full rounded-xl border bg-white px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button onClick={send} disabled={busy || !input.trim()} className="h-12 gap-2 px-6 text-[15px] md:text-base">
          {t("chat.send")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
        </Button>
      </div>
    </div>
  );
}


function Result({
  result,
  sid,
  lang,
  onReset,
}: {
  result: DocumentResult;
  sid: string;
  lang: Lang;
  onReset: () => void;
}) {
  const t = useTranslations("documents.result");
  const [copied, setCopied] = useState(false);
  const dir = lang === "ur" ? "rtl" : "ltr";
  const common = useTranslations("common");
  const extracted = Object.entries(result.extracted).filter(([, v]) => !isEmpty(v));

  async function copy() {
    const parts = [result.explanation, ...extracted.map(([k, v]) => `${label(k)}: ${flat(v)}`)].filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(common("copyFailed"));
    }
  }

  return (
    <div className="space-y-10">
      <h2 className={h2}>{t("title")}</h2>

      {result.explanation && (
        <p className="whitespace-pre-wrap text-base leading-relaxed" dir={dir} lang={lang}>
          {result.explanation}
        </p>
      )}

      {extracted.length > 0 && (
        <div>
          <h3 className={h3}>{t("extracted")}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {extracted.map(([k, v]) => (
              <div key={k} className="rounded-2xl border p-5" dir={dir} lang={lang}>
                <p className="text-sm font-semibold md:text-[15px]">{label(k)}</p>
                <div className="mt-2 text-sm md:text-[15px]">
                  <Value v={v} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.unreadable.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-50 p-5" dir={dir} lang={lang}>
          <p className="flex items-center gap-2 font-semibold text-amber-900">
            <TriangleAlert className="size-4" aria-hidden /> {t("unreadable")}
          </p>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-amber-900 md:text-[15px]">
            {result.unreadable.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <DocChat docId={result.docId} sid={sid} lang={lang} />

      <p className="text-xs italic md:text-sm">{result.disclaimer ?? t("note")}</p>

      <div className="flex flex-col gap-3 md:flex-row print:hidden">
        <Button onClick={() => window.print()} className="h-12 gap-2 px-6 text-[15px] md:text-base">
          <Printer className="size-4" aria-hidden /> {t("print")}
        </Button>
        <Button variant="outline" onClick={copy} className="h-12 gap-2 px-6 text-[15px] md:text-base">
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? t("copied") : t("copy")}
        </Button>
        <Button variant="ghost" onClick={onReset} className="h-12 gap-2 px-6 text-[15px] md:text-base">
          <RotateCcw className="size-4" aria-hidden /> {t("another")}
        </Button>
      </div>
    </div>
  );
}


export function DocumentTranslator() {
  const t = useTranslations("documents");
  const common = useTranslations("common");

  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<Lang>("en");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [sid, setSid] = useState<string | null>(null); // session is reused across uploads
  const [dragging, setDragging] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const preview = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pick(f: File | undefined | null) {
    if (!f) return;
    const problem = validateFile(f);
    if (problem) {
      // "type" | "size": the person can fix these, so say exactly what is wrong
      toast.error(t(`errors.${problem}`, { max: MAX_MB }), { id: TOAST_ID });
      return;
    }
    setFile(f);
    setStatus("idle");
  }

  async function submit() {
    if (!file) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading");
    try {
      const r = await analyzeDocument(file, target, sid, ctrl.signal);
      setSid(r.sid);
      setResult(r.result);
      setStatus("done");
    } catch {
      if (!ctrl.signal.aborted) toast.error(t("errors.generic"), { id: TOAST_ID });
      setStatus("idle");
    }
  }

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setResult(null);
    setStatus("idle");
  }

  const loading = status === "loading";

  return (
    <section className="px-4 py-6 md:px-14 md:py-10 md:mb-6 print:p-0">
      <div className="mx-auto max-w-6xl">
        {/* banner */}
        <div className="relative flex items-center justify-center overflow-hidden rounded-t-3xl px-6 text-center h-80 print:hidden">
          <Image src="/background.svg" alt="" fill priority sizes="100vw" className="object-cover" aria-hidden />
          <div className="relative z-10 mx-auto max-w-2xl">
            <h1 className={`${idiqlat.className} text-[30px] font-semibold leading-tight md:text-[40px]`}>
              {t("banner.title")}
            </h1>
            <p className="mt-2 text-base md:text-lg">{t("banner.subtitle")}</p>
          </div>
        </div>

        <div className="rounded-b-3xl bg-white px-6 py-10 shadow-lg md:px-10 md:py-14 print:p-0 print:shadow-none">
          {status === "done" && result && sid ? (
            <Result result={result} sid={sid} lang={target} onReset={reset} />
          ) : (
            <div className="mx-auto max-w-2xl space-y-8 print:hidden">
              <div>
                <h2 className={h2}>{t("upload.title")}</h2>
                <p className="mt-2 text-base">{t("upload.body")}</p>
              </div>

              {/* drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pick(e.dataTransfer.files?.[0]);
                }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors md:p-10 ${dragging ? "border-foreground bg-muted" : "border-border"
                  }`}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-4">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={t("upload.previewAlt")} className="max-h-64 rounded-xl border object-contain" />
                    ) : (
                      <FileText className="size-14" aria-hidden />
                    )}
                    <p className="break-all text-sm md:text-[15px]">
                      {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setFile(null);
                        setStatus("idle");
                      }}
                      disabled={loading}
                      className="gap-2 text-[15px] md:text-base"
                    >
                      <X className="size-4" aria-hidden /> {t("upload.remove")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="size-10" aria-hidden />
                    <p className="text-base">{t("upload.drag")}</p>
                    <div className="flex flex-col gap-3 md:flex-row">
                      <Button onClick={() => fileInput.current?.click()} className="h-12 gap-2 px-6 text-[15px] md:text-base">
                        <Upload className="size-4" aria-hidden /> {t("upload.choose")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => cameraInput.current?.click()}
                        className="h-12 gap-2 px-6 text-[15px] md:text-base"
                      >
                        <Camera className="size-4" aria-hidden /> {t("upload.photo")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      {t("upload.formats", { max: MAX_MB })}
                    </p>
                  </div>
                )}

                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={cameraInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* language */}
              <label className="block">
                <span className="text-base font-semibold">{t("upload.translateInto")}</span>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as Lang)}
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl border bg-white px-4 mx-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TARGET_LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* status */}
              <div aria-live="polite">
                {loading && (
                  <p className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm md:text-[15px]">
                    <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
                    {t("upload.reading")}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {loading ? (
                  <Button
                    variant="outline"
                    onClick={() => abortRef.current?.abort()}
                    className="h-14 w-full text-[15px] md:text-base"
                  >
                    {t("upload.cancel")}
                  </Button>
                ) : (
                  <Button onClick={submit} disabled={!file} className="h-14 w-full text-[15px] md:text-base">
                    {t("upload.submit")}
                  </Button>
                )}

                {/* keep this wording in sync with what the backend actually does with uploads */}
                <p className="flex items-start gap-2 text-xs md:text-sm">
                  <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {t("upload.privacy")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-2 text-xs italic md:flex-row md:justify-between print:hidden">
          <p>{common("disclaimer")}</p>
          <p>© 2026 WellAbroad</p>
        </div>
      </div>
    </section>
  );
}