import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "../ui/button";

export async function CtaButtons() {
  const t = await getTranslations("cta");

  return (
    <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:justify-center">
      <Button
        render={<Link href="/symptoms" />}
        nativeButton={false}
        className="px-6 text-[15px] md:text-base py-6"
      >
        {t("describe")}
      </Button>
      <Button
        render={<Link href="/documents" />}
        nativeButton={false}
        variant="outline"
        className="px-6 text-[15px] md:text-base py-6"
      >
        {t("understand")}
      </Button>
    </div>
  );
}