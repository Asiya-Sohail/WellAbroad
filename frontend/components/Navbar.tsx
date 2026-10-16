import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { idiqlat } from "@/lib/utils";



const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Use cases", href: "/#use-cases" },
  { label: "Privacy & safety", href: "/#privacy" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image src="/icon.svg" alt="icon" width={40} height={40} className="w-6" />
      <span className={`${idiqlat.className} text-3xl font-semibold leading-none pt-1.25`}>WellAbroad</span>
    </Link>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 items-center justify-between md:px-14 px-3">
        <Logo />

        {/* desktop */}
        <nav className="hidden items-center gap-8 text-base md:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* mobile */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              aria-label="Open menu"
              className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Menu className="size-5" />
            </SheetTrigger>

            <SheetContent side="right">
              <SheetTitle className="sr-only">Menu</SheetTitle>

              <nav className="mt-10 flex flex-col gap-6 px-6 text-lg">
                {navLinks.map((l) => (
                  <Link key={l.href} href={l.href}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}