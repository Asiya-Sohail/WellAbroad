import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "../ui/card";
import { idiqlat } from "@/lib/utils";

const ids = ["words", "info", "where"] as const;

export async function Problem() {
  const t = await getTranslations("problem");

  return (
    <section className="lg:px-14 px-6 py-32 md:py-60">
      <div className="mx-auto max-w-360">
        <div className="text-center">
          <h2
            className={`${idiqlat.className} mx-auto max-w-2xl text-[30px] font-semibold leading-tight md:text-[40px]`}
          >
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-5xl text-lg md:text-xl">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-6 lg:gap-14 lg:grid-cols-3">
          {ids.map((id) => (
            <Card key={id} className="overflow-hidden p-4 rounded-3xl shadow-xl">
              <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-t-3xl px-6 text-center text-sm italic md:text-[15px]">
                <Image
                  src="/card-bg.svg"
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                  aria-hidden
                />
                <span className="relative z-10">&ldquo;{t(`items.${id}.quote`)}&rdquo;</span>
              </div>
              <CardContent className="px-7 pb-10 pt-8">
                <h3
                  className={`${idiqlat.className} text-2xl font-semibold leading-tight md:text-[28px]`}
                >
                  {t(`items.${id}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed md:text-[15px]">
                  {t(`items.${id}.body`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}