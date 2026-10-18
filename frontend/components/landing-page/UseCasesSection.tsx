import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "../ui/card";
import { idiqlat } from "@/lib/utils";

const items = [
  { id: "travelling", href: "#how-it-works" },
  { id: "consultation", href: "#how-it-works" },
  { id: "settling", href: "#how-it-works" },
] as const;

export async function UseCases() {
  const t = await getTranslations("useCases");

  return (
    <section id="use-cases" className="px-6 py-40">
      <div className="mx-auto max-w-360">
        <div className="text-center">
          <h2
            className={`${idiqlat.className} mx-auto max-w-2xl whitespace-pre-line text-[30px] font-semibold leading-tight md:text-[40px]`}
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-lg md:text-xl">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-6 lg:gap-14 lg:grid-cols-3">
          {items.map((u, i) => (
            <Link key={u.id} href={u.href} className="group">
              <Card className="flex h-full flex-col justify-between overflow-hidden p-0 shadow-2xl">
                <CardContent className="p-6">
                  <span className="flex size-9 items-center justify-center rounded-xl border border-black text-sm font-bold">
                    {i + 1}
                  </span>
                  <h3
                    className={`${idiqlat.className} mt-5 text-2xl font-semibold leading-tight md:text-[28px]`}
                  >
                    {t(`items.${u.id}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed md:text-[15px]">
                    {t(`items.${u.id}.body`)}
                  </p>
                </CardContent>
                <div className="relative h-52 md:h-64">
                  <Image src="/card-bg.svg" alt="" fill className="object-cover" aria-hidden />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}