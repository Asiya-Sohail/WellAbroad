// i18n/request.ts
import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, defaultLocale, isLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  // 1. the visitor's saved choice
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;

  // 2. otherwise their browser language, 3. otherwise English
  let locale: Locale = defaultLocale;
  if (isLocale(saved)) {
    locale = saved;
  } else {
    const accept = (await headers()).get("accept-language") ?? "";
    const preferred = accept
      .toLowerCase()
      .split(",")
      .map((part) => part.trim().slice(0, 2))
      .find(isLocale);
    if (preferred) locale = preferred;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});