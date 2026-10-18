import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Separator } from "../ui/separator";
import { idiqlat } from "@/lib/utils";

export async function Privacy() {
  const t = await getTranslations("privacy");

  return (
    <section id="privacy" className="bg-[#D2FFF5] px-6 md:pt-32 md:pb-40 pt-26 pb-32">
      <div className="flex flex-col items-center text-center">
        <Image src="/icon.svg" alt="icon" width={40} height={40} className="size-16" />
        <h2
          className={`${idiqlat.className} mx-auto mt-12 max-w-2xl text-[30px] font-semibold leading-tight md:text-[40px]`}
        >
          {t("title")}
        </h2>
        <p className="mx-auto mt-8 max-w-5xl text-base italic leading-relaxed">{t("body")}</p>
        <Separator className="my-10 max-w-lg bg-[#b3b4af]" />
        <p className="text-xs text-muted-foreground md:text-sm">{t("tagline")}</p>
      </div>
    </section>
  );
}