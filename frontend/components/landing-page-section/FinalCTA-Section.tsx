import { CtaButtons } from "./CTA-Buttons";
import { idiqlat } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="px-6 py-28 text-center">
      <div className="mx-auto flex flex-col items-center gap-6">
        <h2
          className={`${idiqlat.className} text-[30px] font-semibold leading-tight md:text-[40px]`}
        >
          Feel less lost
          <br />
          when you need care abroad.
        </h2>
        <p className="max-w-xl text-base md:text-lg">
          WellAbroad helps you explain your symptoms, understand medical
          documents, and navigate local healthcare in a language you understand.
        </p>
        <CtaButtons />
      </div>
    </section>
  );
}