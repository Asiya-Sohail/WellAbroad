export const locales = ["en", "fr", "de", "es", "ur"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Shown in the switcher, always in each language's own name.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  ur: "اردو",
};

export const RTL_LOCALES: readonly Locale[] = ["ur"];
export const getDir = (locale: string) =>
  (RTL_LOCALES as readonly string[]).includes(locale) ? "rtl" : "ltr";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}