import Image from "next/image";
import { Logo } from "./Navbar";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { idiqlat } from "@/lib/utils";

type FooterLink = { key?: string; label?: string; href: string };
type FooterColumn = { id: "product" | "governance" | "team"; external?: boolean; links: FooterLink[] };

const footerColumns: FooterColumn[] = [
    {
        id: "product",
        links: [
            { key: "symptomExplainer", href: "#" },
            { key: "documentsLens", href: "#" },
            { key: "pdfExport", href: "#" },
            { key: "localGuidance", href: "#" },
        ],
    },
    {
        id: "governance",
        links: [
            { key: "privacyNotice", href: "#" },
            { key: "terms", href: "#" },
            { key: "clinicalDisclaimer", href: "#" },
            { key: "security", href: "#" },
        ],
    },
    {
        id: "team", // names are proper nouns, so they are not translated
        external: true,
        links: [
            { label: "Fakhir Khan", href: "https://www.linkedin.com/in/fakhir-khan-34ab822a5" },
            { label: "Abdul Moazzim", href: "https://www.linkedin.com/in/abdulmoazzim" },
            { label: "Asiya Sohail", href: "https://www.linkedin.com/in/asiya-sohail" },
            { label: "Ahlam Afrass", href: "https://www.linkedin.com/in/ahlam-afrass" },
        ],
    },
];

export async function Footer() {
    const t = await getTranslations("footer");

    return (
        <footer className="relative overflow-hidden rounded-t-2xl px-8 pt-32 pb-16">
            <Image
                src="/background.svg"
                alt="bg-footer"
                fill
                sizes="100vw"
                className="-z-10 object-cover"
                aria-hidden
            />

            <div className="grid gap-10 pb-10 md:grid-cols-[3fr_1fr_1fr_1fr]">
                <div className="md:px-12 max-w-3xl">
                    <Logo />
                    <p className="mt-3 text-base">{t("tagline")}</p>
                </div>

                {footerColumns.map((col) => (
                    <div key={col.id}>
                        <h4 className={`${idiqlat.className} text-lg font-semibold`}>
                            {t(`headings.${col.id}`)}
                        </h4>
                        <ul className="mt-3 space-y-2 text-base">
                            {col.links.map((l) => {
                                const label = l.key ? t(`links.${l.key}`) : l.label;
                                return (
                                    <li key={l.key ?? l.label}>
                                        <Link
                                            href={l.href}
                                            className="hover:underline"
                                            {...(col.external && {
                                                target: "_blank",
                                                rel: "noopener noreferrer",
                                            })}
                                        >
                                            {label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>

            <p className="mt-12 text-center text-xs italic md:text-sm">{t("copyright")}</p>
        </footer>
    );
}