import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { idiqlat } from "@/lib/utils";

export default async function NotFound() {
    const t = await getTranslations("notFound");
    const cta = await getTranslations("cta");

    return (
        <main className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 py-24 text-center">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
                <p
                    className={`${idiqlat.className} text-[64px] font-semibold leading-none md:text-[96px]`}
                >
                    404
                </p>
                <h1
                    className={`${idiqlat.className} text-[30px] font-semibold leading-tight md:text-[40px]`}
                >
                    {t("title")}
                </h1>
                <p className="max-w-xl text-base md:text-lg">{t("body")}</p>

                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                    <Button
                        render={<Link href="/" />}
                        nativeButton={false}
                        className="px-6 py-6 text-[15px] md:text-base"
                    >
                        {t("home")}
                    </Button>
                    <Button
                        render={<Link href="/symptoms" />}
                        nativeButton={false}
                        variant="outline"
                        className="px-6 py-6 text-[15px] md:text-base"
                    >
                        {cta("describe")}
                    </Button>
                </div>
            </div>
        </main>
    );
}