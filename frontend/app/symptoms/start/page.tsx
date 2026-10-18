import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SymptomsExperience } from "@/components/SymptomsExperience";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("symptomsTitle"), description: t("symptomsDescription") };
}

export default function SymptomsPage() {
  return (
    <main>
      <SymptomsExperience />
    </main>
  );
}