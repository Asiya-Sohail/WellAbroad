import Image from "next/image";
import { Separator } from "../ui/separator";
import { idiqlat } from "@/lib/utils";

export function Privacy() {
  return (
    <section id="privacy" className="bg-[#D2FFF5] px-6 py-24">
      <div className="flex flex-col items-center text-center">
        <Image src="/icon.svg" alt="icon" width={40} height={40} className="size-16" />
        <h2
          className={`${idiqlat.className} mx-auto mt-12 max-w-2xl text-[30px] font-semibold leading-tight md:text-[40px]`}
        >
          Health data that never leaves your hands.
        </h2>
        <p className="mx-auto mt-8 max-w-5xl text-base italic leading-relaxed">
          We believe medical privacy shouldn&apos;t require technical expertise
          or blind trust. WellAbroad is built without accounts, without cloud
          retention, and without diagnostic pretensions. Your symptoms and
          prescriptions are deciphered locally in your browser, helping you
          communicate clearly in a foreign clinic; and vanishing completely the
          moment your conversation ends.
        </p>
        <Separator className="my-10 max-w-sm bg-[#b3b4af]" />
        <p className="text-xs text-muted-foreground md:text-sm">
          Designed for travelers and expats · Zero persistent data · Ephemeral
          by default
        </p>
      </div>
    </section>
  );
}