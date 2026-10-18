import Image from "next/image";
import Link from "next/link";
import { CircleCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { idiqlat } from "@/lib/utils";

export type ServiceFeature = {
  icon?: LucideIcon;
  text: string;
};

export type ServiceSectionProps = {
  // gradient banner
  bannerTitle: string;
  bannerSubtitle: string;
  bannerImage?: string;

  // white card
  title: string;
  description: string;
  features: ServiceFeature[];
  cta: { label: string; href: string };
  ctaNote?: string;

  // line under the card
  disclaimer?: string;
  copyright?: string;
};

export function ServiceSection({
  bannerTitle,
  bannerSubtitle,
  bannerImage = "/background.svg",
  title,
  description,
  features,
  cta,
  ctaNote,
  disclaimer,
  copyright,
}: ServiceSectionProps) {
  return (
    <section className="py-6 md:mb-30">
      <div className="mx-auto max-w-[92%]">
        {/* banner */}
        <div className="relative flex items-center justify-center overflow-hidden rounded-t-4xl w-full px-4 text-center h-72 md:h-96">
          <Image
            src={bannerImage}
            alt=""
            fill
            loading="eager"
            priority
            sizes="100vw"
            className="object-cover"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-2xl">
            <h1
              className={`${idiqlat.className} text-[30px] font-semibold leading-tight md:text-[40px]`}
            >
              {bannerTitle}
            </h1>
            <p className="mt-2 text-base md:text-lg">{bannerSubtitle}</p>
          </div>
        </div>

        {/* card */}
        <div className="rounded-b-3xl bg-white px-6 py-10 shadow-lg md:px-10 md:py-14">
          <h2
            className={`${idiqlat.className} text-[28px] font-semibold leading-tight`}
          >
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-base">{description}</p>

          <hr className="my-8 max-w-lg border-border" />

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <ul className="space-y-2 text-xs md:text-sm">
              {features.map(({ icon: Icon = CircleCheck, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-stretch gap-2 md:items-end">
              <Button
                render={<Link href={cta.href} />}
                nativeButton={false}
                className="h-12 px-8 text-[15px] md:text-base"
              >
                {cta.label}
              </Button>
              {ctaNote && (
                <p className="text-xs text-center md:text-right">{ctaNote}</p>
              )}
            </div>
          </div>
        </div>

        {/* footnote */}
        {(disclaimer || copyright) && (
          <div className="mt-10 flex flex-col gap-2 text-xs italic md:flex-row md:justify-between">
            <p>{disclaimer}</p>
            <p>{copyright}</p>
          </div>
        )}
      </div>
    </section>
  );
}