"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  Phone,
  Printer,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { idiqlat, TOAST_ID } from "@/lib/utils";
import { COUNTRIES, LANG_NAME, type Country, type CountryId, type Lang } from "../lib/symptoms-data";
import {
  ApiError,
  COUNTRY_EN,
  LANG_EN,
  createSession,
  getSummary,
  sendAnswer,
  startConsult,
  type AnswerResult,
  type ConsultSummary,
  type Question,
} from "../lib/consult";

type Phase = "intro" | "asking" | "summary";

const h2 = `${idiqlat.className} text-[28px] font-semibold leading-tight`;
const h3 = `${idiqlat.className} text-2xl font-semibold leading-tight md:text-[28px]`;

const field =
  "w-full rounded-xl border bg-white px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";


export function CallLink({
  tel,
  children,
  className = "",
}: {
  tel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={`tel:${tel}`}
      className={`inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline ${className}`}
    >
      {children}
    </a>
  );
}

export function EmergencyPanel({ country }: { country: Country | null }) {
  const t = useTranslations("symptoms");
  const tc = useTranslations("countries");
  const detailsId = useId();

  const [openFor, setOpenFor] = useState<string | null>(null);

  if (!country) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm md:text-[15px]">
        {t("where.pick")}
      </p>
    );
  }

  const open = openFor === country.id;
  const warningSigns = t.raw("warningSigns") as string[];

  return (
    <div className="overflow-hidden rounded-2xl border border-red-600/40 bg-red-50">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-1 size-5 shrink-0 text-red-700" aria-hidden />
          <div>
            <h3 className={`${h3} text-red-900`}>{t("emergency.title")}</h3>
            <p className="mt-1 text-sm text-red-900/80 md:text-[15px]">{tc(`${country.id}.primary`)}</p>
          </div>
        </div>
        <Button
          render={<a href={`tel:${country.primary.tel}`} />}
          nativeButton={false}
          className="h-14 gap-3 bg-red-700 px-8 text-lg text-white hover:bg-red-800"
        >
          <Phone className="size-5" aria-hidden />
          {country.primary.number}
        </Button>
      </div>

      {/* "See more info" toggle */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpenFor(open ? null : country.id)}
        className="flex w-full items-center justify-center gap-2 border-t border-red-600/20 px-6 py-3 text-sm font-semibold text-red-900 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-700 md:text-[15px]"
      >
        {open ? t("emergency.seeLess") : t("emergency.seeMore")}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {/* the white part, collapsed by default */}
      <div
        id={detailsId}
        hidden={!open}
        className="grid gap-6 border-t border-red-600/20 bg-white p-6 md:grid-cols-2"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide md:text-sm">{t("emergency.callIf")}</p>
          <ul className="mt-3 space-y-2 text-sm md:text-[15px]">
            {warningSigns.map((w) => (
              <li key={w} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-red-700" />
                {w}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide md:text-sm">
            {t("emergency.others", { country: tc(`${country.id}.name`) })}
          </p>
          <ul className="mt-3 space-y-3 text-sm md:text-[15px]">
            {country.contacts.map((c) => (
              <li key={country.id + c.id}>
                <CallLink tel={c.tel}>
                  <Phone className="size-4" aria-hidden />
                  {c.number}
                </CallLink>
                <span className="ms-2">{tc(`${country.id}.contacts.${c.id}.label`)}</span>
                {c.hasNote && (
                  <span className="block text-xs text-muted-foreground md:text-sm">
                    {tc(`${country.id}.contacts.${c.id}.note`)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground md:text-sm">{tc(`${country.id}.note`)}</p>
          <a
            href={country.source.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline md:text-sm"
          >
            {t("emergency.source", { source: country.source.label })}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}

function Tile({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
        selected ? "border-foreground bg-foreground text-background" : "bg-white hover:bg-muted"
      }`}
    >
      <span>{children}</span>
      {selected && <Check className="size-4 shrink-0" aria-hidden />}
    </button>
  );
}

// Shown as soon as the backend raises a red flag, in the question phase and in the summary.
function UrgentAlert({ message, country }: { message: string | null; country: Country }) {
  const t = useTranslations("symptoms");
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-2xl border border-red-600/40 bg-red-50 p-4 text-sm text-red-900 print:hidden md:text-[15px]"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="space-y-1">
        {message && <p>{message}</p>}
        <p>
          {t.rich("urgent.generic", {
            number: country.primary.number,
            call: (chunks) => (
              <CallLink tel={country.primary.tel} className="text-red-900">
                {chunks}
              </CallLink>
            ),
          })}
        </p>
      </div>
    </div>
  );
}

function Summary({
  summary,
  country,
  onRestart,
}: {
  summary: ConsultSummary;
  country: Country;
  onRestart: () => void;
}) {
  const t = useTranslations("symptoms");
  const [copied, setCopied] = useState(false);
  const lang = country.lang;
  const dir = lang === "ur" ? "rtl" : "ltr";

  const norm = (s: string) => (s ?? "").trim();
  const en = norm(summary.english);
  const local = norm(summary.local_language);
  const mine = norm(summary.user_language);
  const showLocal = lang !== "en" && !!local && local !== en;
  const showMine = !!mine && mine !== en && mine !== local;
  const skipped = summary.skipped ?? [];
  const common = useTranslations("common")

  async function copy() {
    const parts = [en, showLocal ? local : "", skipped.length ? t("summary.skipped", { list: skipped.join(", ") }) : ""]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(parts);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(common("copyFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={h2}>{t("summary.title")}</h2>
        <p className="mt-2 text-sm md:text-[15px] print:hidden">
          {showLocal ? t("summary.introBilingual", { language: LANG_NAME[lang] }) : t("summary.introSingle")}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <div
          className={`grid bg-muted text-xs font-semibold uppercase tracking-wide md:text-sm ${
            showLocal ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          <div className="px-4 py-3" lang="en">
            {LANG_NAME.en}
          </div>
          {showLocal && (
            <div className="border-s px-4 py-3" dir={dir} lang={lang}>
              {LANG_NAME[lang]}
            </div>
          )}
        </div>
        <div className={`grid border-t ${showLocal ? "md:grid-cols-2" : "grid-cols-1"}`}>
          <div className="whitespace-pre-wrap px-4 py-4 text-base leading-relaxed" lang="en">
            {en}
          </div>
          {showLocal && (
            <div
              className="whitespace-pre-wrap border-t px-4 py-4 text-base leading-relaxed md:border-s md:border-t-0"
              dir={dir}
              lang={lang}
            >
              {local}
            </div>
          )}
        </div>
        {skipped.length > 0 && (
          <p className="border-t px-4 py-3 text-xs text-muted-foreground md:text-sm">
            {t("summary.skipped", { list: skipped.join(", ") })}
          </p>
        )}
      </div>

      {showMine && (
        <div className="print:hidden">
          <h3 className={h3}>{t("summary.forYou")}</h3>
          <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-muted p-5 text-base leading-relaxed">{mine}</p>
        </div>
      )}

      {summary.disclaimer && <p className="text-xs italic md:text-sm">{summary.disclaimer}</p>}

      <div className="flex flex-col gap-3 md:flex-row print:hidden">
        <Button onClick={() => window.print()} className="h-12 gap-2 px-6 text-[15px] md:text-base">
          <Printer className="size-4" aria-hidden /> {t("summary.print")}
        </Button>
        <Button variant="outline" onClick={copy} className="h-12 gap-2 px-6 text-[15px] md:text-base">
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? t("summary.copied") : t("summary.copy")}
        </Button>
        <Button variant="ghost" onClick={onRestart} className="h-12 gap-2 px-6 text-[15px] md:text-base">
          <RotateCcw className="size-4" aria-hidden /> {t("summary.restart")}
        </Button>
      </div>
    </div>
  );
}

export function SymptomsExperience() {
  const t = useTranslations("symptoms");
  const tc = useTranslations("countries");
  const common = useTranslations("common");
  const ui = useLocale() as Lang;

  const [countryId, setCountryId] = useState<CountryId | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [sid, setSid] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");
  const [urgent, setUrgent] = useState<{ message: string | null } | null>(null);
  const [summary, setSummary] = useState<ConsultSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const country = COUNTRIES.find((c) => c.id === countryId) ?? null;

  function reset() {
    setPhase("intro");
    setSid(null);
    setQuestion(null);
    setCount(0);
    setText("");
    setUrgent(null);
    setSummary(null);
  }

  function pickCountry(id: CountryId) {
    if (id === countryId) return;
    reset(); // a session is tied to a country/language, so start over
    setCountryId(id);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      // an expired session can't continue, so go back to the start button
      if (e instanceof ApiError && e.code === "session_expired") reset();
      toast.error(t("errors.generic"), { id: TOAST_ID });
    } finally {
      setBusy(false);
    }
  }

  async function handle(r: AnswerResult, id: string) {
    if (r.red_flag || r.urgent_message || r.question?.red_flag) {
      setUrgent({ message: r.urgent_message ?? null });
    }
    if (r.done || !r.question || r.question.done) {
      setSummary(await getSummary(id));
      setPhase("summary");
    } else {
      setQuestion(r.question);
      setCount((n) => n + 1);
      setText("");
      setPhase("asking");
    }
  }

  const start = () =>
    country &&
    run(async () => {
      const s = await createSession({
        ui_lang: LANG_EN[ui],
        country: COUNTRY_EN[country.id],
        local_lang: LANG_EN[country.lang],
      });
      setSid(s.session_id);
      await handle(await startConsult(s.session_id), s.session_id);
    });

  const submit = (skip: boolean) =>
    sid &&
    run(async () => {
      await handle(await sendAnswer(sid, skip ? null : text.trim(), skip), sid);
    });

  const quick = question?.quick_options ?? [];

  return (
    <section className="px-4 py-6 md:px-14 md:py-10 print:p-0 md:mb-6">
      <div className="mx-auto max-w-[96%]">
        {/* banner */}
        <div className="relative flex items-center justify-center overflow-hidden rounded-t-3xl px-6 text-center h-72 md:h-96 print:hidden">
          <Image src="/background.svg" alt="" fill priority sizes="100vw" className="object-cover" aria-hidden />
          <div className="relative z-10 mx-auto max-w-2xl">
            <h1 className={`${idiqlat.className} text-[30px] font-semibold leading-tight md:text-[40px]`}>
              {t("banner.title")}
            </h1>
            <p className="mt-2 text-base md:text-lg">{t("banner.subtitle")}</p>
          </div>
        </div>

        <div className="space-y-12 rounded-b-3xl bg-white px-6 py-10 shadow-lg md:px-10 md:py-14 print:p-0 print:shadow-none">
          {/* country */}
          <div className="print:hidden">
            <h2 className={h2}>{t("where.title")}</h2>
            <p className="mt-2 text-base">{t("where.body")}</p>
            <div role="group" aria-label={t("where.group")} className="mt-5 flex flex-wrap gap-3">
              {COUNTRIES.map((c) => (
                <Button
                  key={c.id}
                  variant={countryId === c.id ? "default" : "outline"}
                  aria-pressed={countryId === c.id}
                  disabled={busy}
                  onClick={() => pickCountry(c.id)}
                  className="h-11 px-5 text-[15px] md:text-base"
                >
                  {tc(`${c.id}.name`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="print:hidden">
            <EmergencyPanel country={country} />
          </div>

          {/* consultation */}
          {country && (
            <div className="space-y-6">
              {urgent && <UrgentAlert message={urgent.message} country={country} />}

              {phase === "intro" && (
                <div className="mx-auto max-w-2xl space-y-5 print:hidden">
                  <h2 className={h2}>{t("start.title")}</h2>
                  <p className="text-base">{t("start.body")}</p>
                  <Button onClick={start} disabled={busy} className="h-14 gap-2 px-8 text-[15px] md:text-base">
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {t("start.button")}
                    {!busy && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />}
                  </Button>
                  <p className="text-xs italic md:text-sm">{t("start.privacy")}</p>
                </div>
              )}

              {phase === "asking" && question && (
                <div className="mx-auto max-w-2xl print:hidden">
                  <p className="text-xs md:text-sm">{t("consult.question", { n: count })}</p>
                  <h2 className={`${h2} mt-4`}>{question.question}</h2>

                  {quick.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm md:text-[15px]">{t("consult.quick")}</p>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        {quick.map((o) => (
                          <Tile key={o} selected={text === o} disabled={busy} onClick={() => setText(o)}>
                            {o}
                          </Tile>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    className={`${field} mt-6 min-h-24`}
                    value={text}
                    maxLength={2000}
                    disabled={busy}
                    placeholder={t("consult.placeholder")}
                    onChange={(e) => setText(e.target.value)}
                  />

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => submit(true)}
                      className="h-12 px-5 text-[15px] md:text-base"
                    >
                      {t("consult.skip")}
                    </Button>
                    <Button
                      disabled={busy || !text.trim()}
                      onClick={() => submit(false)}
                      className="h-12 gap-2 px-8 text-[15px] md:text-base"
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                      {t("consult.send")}
                      {!busy && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />}
                    </Button>
                  </div>
                </div>
              )}

              {phase === "summary" && summary && <Summary summary={summary} country={country} onRestart={reset} />}

              <div aria-live="polite" className="mx-auto max-w-2xl print:hidden">
                {busy && phase !== "intro" && (
                  <p className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm md:text-[15px]">
                    <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
                    {t("consult.loading")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-2 text-xs italic md:flex-row md:justify-between print:mt-4">
          <p>{country ? t("disclaimerWith", { number: country.primary.number }) : common("disclaimer")}</p>
          <p>© 2026 WellAbroad</p>
        </div>
      </div>
    </section>
  );
}