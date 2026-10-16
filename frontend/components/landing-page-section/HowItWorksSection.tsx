import { idiqlat } from "@/lib/utils";
import { Card } from "../ui/card";

const steps = [
  {
    title: "The right questions help you find the right words.",
    body: "Guided questions help users describe their symptoms, organise relevant information, and prepare a structured bilingual summary to show a doctor or pharmacist. Users can review their answers before generating or sharing the summary.",
  },
  {
    title: "Make sense of your medical information.",
    body: "Upload or scan a prescription, medical report, or consultation note to get a translation and a plain-language explanation of active ingredients, dosages, and precautions. WellAbroad helps you understand your documents with clarity, without diagnosing or replacing healthcare advice.",
  },
  {
    title: "Take your summary with you.",
    body: "Export or print a clear, bilingual clinical intake sheet ready for reception or the attending doctor, ensuring your medical history and current concerns are communicated accurately.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-[linear-gradient(to_bottom,rgba(214,255,241,0.5)_0%,#F1F7F3_49%,rgba(122,231,194,0.5)_80%,rgba(127,202,154,0.5)_97%)] px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2
            className={`${idiqlat.className} text-[30px] font-semibold leading-tight md:text-[40px]`}
          >
            Making healthcare easier to understand, wherever you are.
          </h2>
          <p className="mt-4 text-lg md:text-xl">
            WellAbroad helps you explain your symptoms in another language,
            understand medical documents, and feel more prepared when navigating
            healthcare abroad.
          </p>
        </div>

        <div className="mt-20 space-y-24">
          {steps.map((s, i) => (
            <div key={s.title} className="grid items-center gap-10 md:grid-cols-2">
              <div
                className={`max-w-sm ${i % 2 === 1 ? "md:order-2 md:justify-self-end" : "md:justify-self-center"
                  }`}
              >
                <h3
                  className={`${idiqlat.className} text-2xl font-semibold leading-tight md:text-[28px]`}
                >
                  {s.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed">{s.body}</p>
              </div>

              <Card
                className={`aspect-7/5 w-full ${i % 2 === 1 ? "md:order-1" : ""}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}