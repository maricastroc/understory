import type { Metadata } from "next";
import { lineInvestigationFonts } from "@/components/line-investigation/fonts";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { getLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Understory",
  description:
    "Reconstruct the historical reason behind code decisions — grounded in git, built to say so when the record is silent.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${lineInvestigationFonts} h-full`}>
      <body className="min-h-full bg-li-paper font-li-body text-li-ink antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
