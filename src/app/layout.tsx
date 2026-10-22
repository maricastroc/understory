import type { Metadata } from "next";
import { lineInvestigationFonts } from "@/components/line-investigation/fonts";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { getLocale, getMessages } from "@/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages();
  return { title: "Understory", description: meta.description };
}

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
