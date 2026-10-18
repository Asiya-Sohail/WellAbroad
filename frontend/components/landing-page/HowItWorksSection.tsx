import { getTranslations } from "next-intl/server";
import { idiqlat } from "@/lib/utils";
import { Card } from "../ui/card";

const ids = ["questions", "documents", "summary"] as const;

export async function HowItWorks() {
  const t = await getTranslations("how");

  return (
    <section
      id="how-it-works"
      className="bg-[linear-gradient(to_bottom,rgba(214,255,241,0.5)_0%,#F1F7F3_49%,rgba(122,231,194,0.5)_80%,rgba(127,202,154,0.5)_97%)] lg:px-14 px-6 pb-22 md:pb-40 pt-32 md:pt-60"
    >
      <div>
        <h2
          className={`${idiqlat.className} text-[30px] font-semibold leading-tight md:whitespace-pre-line md:text-[40px]`}
        >
          {t("title")}
        </h2>
        <p className="mt-4 text-lg md:whitespace-pre-line md:text-xl">{t("subtitle")}</p>
      </div>

      <div className="mt-20 space-y-24">
        {ids.map((id, i) => (
          <div key={id} className="grid items-center gap-10 md:flex py-16 md:py-24 m-0">
            <div
              className={`md:w-[40vw] px-0 md:px-6 lg:px-20 ${i % 2 === 1 ? "md:order-10 md:justify-self-end" : "md:justify-self-start"
                }`}
            >
              <h3
                className={`${idiqlat.className} text-2xl font-semibold leading-tight md:text-[28px]`}
              >
                {t(`steps.${id}.title`)}
              </h3>
              <p className="mt-4 text-base leading-relaxed">{t(`steps.${id}.body`)}</p>
            </div>

            <Card
              className={`md:w-[50vw] mx-0 aspect-7/5 w-full ${i % 2 === 1 ? "md:ms-10 md:order-1" : "md:me-10"}`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}