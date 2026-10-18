"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { LOCALE_NAMES, locales, type Locale } from "@/i18n/config";
import { setLocale } from "@/app/actions/i18n-action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={locale}
      disabled={pending}
      onValueChange={(next) => {
        if (next && next !== locale) startTransition(() => setLocale(next));
      }}
    >
      <SelectTrigger aria-label={t("language")} className={`h-9 min-w-36 gap-2 bg-white ${className}`}>
        <Globe className="size-4 shrink-0" aria-hidden />
        {/* explicit label so the trigger shows the language name, not the raw code */}
        <SelectValue>{LOCALE_NAMES[locale]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_NAMES[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}