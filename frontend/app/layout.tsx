import type { Metadata } from "next";
import { Inter, Noto_Naskh_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { getDir } from "@/i18n/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const urdu = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--font-urdu" });

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: {
      default: t("title"),
      template: "%s | WellAbroad",
    },
    description: t("description"),
    icons: { icon: "/icon.svg" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={getDir(locale)}
      className={cn("h-full", "antialiased", "font-sans", inter.variable, urdu.variable)}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <Navbar />
          {children}
        </NextIntlClientProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}