import Link from "next/link";
import { Card, CardContent } from "../ui/card";
import Image from "next/image";
import { idiqlat } from "@/lib/utils";

const useCases = [
  {
    title: "When you're travelling",
    body: "You feel unwell abroad and need to explain your symptoms at a local pharmacy or clinic quickly and clearly without misinterpretations.",
    href: "#how-it-works",
  },
  {
    title: "After a consultation",
    body: "You receive a document in a language you don't fully understand and need help making sense of dosages, active ingredients, and care steps.",
    href: "#how-it-works",
  },
  {
    title: "Settling into a new country",
    body: "You need to understand how to navigate the local healthcare system, find reliable primary care, and register your health history accurately.",
    href: "#how-it-works",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2
            className={`${idiqlat.className} mx-auto max-w-2xl text-[30px] font-semibold leading-tight md:text-[40px]`}
          >
            Different situations.<br /> One less language barrier.
          </h2>
          <p className="mt-4 text-lg md:text-xl">
            Whether you are traveling for a week, recovering from a doctor&apos;s
            visit, or relocating long-term, WellAbroad adapts to your medical
            context.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {useCases.map((u, i) => (
            <Link key={u.title} href={u.href} className="group">
              <Card className="flex h-full flex-col justify-between overflow-hidden p-0">
                <CardContent className="p-6">
                  <span className="flex size-9 items-center justify-center rounded-xl border border-black text-sm font-bold">
                    {i + 1}
                  </span>
                  <h3
                    className={`${idiqlat.className} mt-5 text-2xl font-semibold leading-tight md:text-[28px]`}
                  >
                    {u.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed md:text-[15px]">
                    {u.body}
                  </p>
                </CardContent>
                <div className="relative h-52">
                  <Image src="/card-bg.svg" alt="bg-card" fill className="object-cover" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}