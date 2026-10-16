import Image from "next/image";
import { CtaButtons } from "./CTA-Buttons";
import { idiqlat } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative md:flex md:min-h-[80vh] md:items-center md:justify-center">
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
          className={`${idiqlat.className} text-[40px] font-semibold leading-tight md:text-[64px]`}
        >
          Healthcare, wherever life takes you
        </h1>
        <p className="max-w-3xl text-base md:text-lg">
          WellAbroad helps you explain your symptoms, understand medical
          documents, and navigate local healthcare in a language you understand.
        </p>
        <CtaButtons />
        <p className="text-xs md:text-sm">
          Designed with privacy in mind. No account required.
        </p>
      </div>
    </section>
  );
}