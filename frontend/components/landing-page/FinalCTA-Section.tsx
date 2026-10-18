import { getTranslations } from "next-intl/server";
import { CtaButtons } from "./CTA-Buttons";
import { idiqlat } from "@/lib/utils";

export async function FinalCta() {
  const t = await getTranslations("finalCta");

  return (
    <section className="px-6 py-32 md:py-44 text-center">
      <div className="mx-auto flex flex-col items-center gap-6">
        <h1
          className={`${idiqlat.className} whitespace-pre-line text-[40px] font-semibold leading-tight md:text-[64px]`}
        >
          {t("title")}
        </h1>
        <p className="max-w-2xl text-base md:text-lg">{t("subtitle")}</p>
        <CtaButtons />
      </div>
    </section>
  );
}