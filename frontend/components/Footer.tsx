import Image from "next/image";
import { Logo } from "./Navbar";
import Link from "next/link";
import { idiqlat } from "@/lib/utils";

const footerColumns = [
    {
        heading: "Product",
        links: [
            { label: "Symptom Explainer", href: "#" },
            { label: "Medical Documents Lens", href: "#" },
            { label: "PDF Export", href: "#" },
            { label: "Local Health Guidance", href: "#" },
        ],
    },
    {
        heading: "Governance",
        links: [
            { label: "Privacy Notice", href: "#" },
            { label: "Terms of Service", href: "#" },
            { label: "Clinical Disclaimer", href: "#" },
            { label: "Security Overview", href: "#" },
        ],
    },
    {
        heading: "Team",
        external: true,
        links: [
            { label: "Fakhir Khan", href: "https://www.linkedin.com/in/fakhir-khan-34ab822a5" },
            { label: "Abdul Moazzim", href: "https://www.linkedin.com/in/abdulmoazzim" },
            { label: "Asiya Sohail", href: "https://www.linkedin.com/in/asiya-sohail" },
            { label: "Ahlam Afrass", href: "https://www.linkedin.com/in/ahlam-afrass" },
        ],
    },
];

export function Footer() {
    return (
        <footer className="relative overflow-hidden rounded-t-2xl px-8 pt-24 pb-10">
            <Image
                src="/background.svg"
                alt="bg-footer"
                fill
                sizes="100vw"
                className="-z-10 object-cover"
                aria-hidden
            />

            <div className="grid gap-10 pb-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
                <div className="md:px-12">
                    <Logo />
                    <p className="mt-3 text-base">
                        Empowering travelers, international residents, and students to
                        navigate foreign healthcare environments safely, clearly, and with
                        human dignity.
                    </p>
                </div>

                {footerColumns.map((col) => (
                    <div key={col.heading}>
                        <h4 className={`${idiqlat.className} text-lg font-semibold`}>
                            {col.heading}
                        </h4>
                        <ul className="mt-3 space-y-2 text-base">
                            {col.links.map((l) => (
                                <li key={l.label}>
                                    <Link
                                        href={l.href}
                                        className="hover:underline"
                                        {...(col.external && {
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                        })}
                                    >
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <p className="mt-12 text-center text-xs italic md:text-sm">
                © 2026 WellAbroad Inc. Not a medical diagnostic tool or substitute for
                direct professional medical advice.
            </p>
        </footer>
    );
}