import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { idiqlat } from "@/lib/utils";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image src="/icon.svg" alt="icon" width={40} height={40} className="w-6" />
      <span className={`${idiqlat.className} text-3xl font-semibold leading-none pt-1.25`}>WellAbroad</span>
    </Link>
  );
}

export async function Navbar() {
  const t = await getTranslations("nav");

  const navLinks = [
    { label: t("howItWorks"), href: "/#how-it-works" },
    { label: t("useCases"), href: "/#use-cases" },
    { label: t("privacy"), href: "/#privacy" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 items-center justify-between lg:px-14 px-6">
        <Logo />

        <div className="flex items-center gap-4 md:gap-8">
          {/* desktop */}
          <nav className="hidden items-center gap-8 text-base lg:flex">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="hover:underline">
                {l.label}
              </Link>
            ))}
          <LanguageSwitcher />
          </nav>


          {/* mobile */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger
                aria-label={t("openMenu")}
                className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Menu className="size-5" />
              </SheetTrigger>

              <SheetContent side="right">
                <SheetTitle className="sr-only">{t("menu")}</SheetTitle>

                <nav className="mt-20 flex flex-col gap-6 px-6 text-lg">
                  {navLinks.map((l) => (
                    <Link key={l.href} href={l.href}>
                      {l.label}
                    </Link>
                  ))}
                  <LanguageSwitcher />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}