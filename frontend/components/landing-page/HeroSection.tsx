import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CtaButtons } from "./CTA-Buttons";
import { idiqlat } from "@/lib/utils";

export async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section className="relative md:flex md:min-h-screen md:items-center md:justify-center">
      <div
        aria-hidden
        className="relative h-56 w-full overflow-hidden md:absolute md:inset-0 md:h-auto"
      >
        <Image
          loading="eager"
          src="/background.svg"
          alt="bg-hero"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div className="relative z-10 mx-auto flex flex-col items-start gap-5 px-6 py-8 md:items-center md:gap-6 md:py-12 md:text-center">
        <h1
          className={`${idiqlat.className} text-[28px] font-semibold leading-tight md:text-[64px]`}
        >
          {t("title")}
        </h1>
        <p className="max-w-3xl text-base md:text-lg">{t("subtitle")}</p>
        <CtaButtons />
        <p className="text-xs md:text-sm">{t("note")}</p>
      </div>
    </section>
  );
}