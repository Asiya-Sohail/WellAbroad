import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocumentTranslator } from "@/components/DocumentTranslator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("documentsTitle"), description: t("documentsDescription") };
}

export default function DocumentsPage() {
  return (
    <main>
      <DocumentTranslator />
    </main>
  );
}