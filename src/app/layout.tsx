import type { Metadata } from "next";
import { lineInvestigationFonts } from "@/components/line-investigation/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Git Investigator",
  description:
    "Reconstruct the historical reason behind code decisions — grounded in git, honest when the record is silent.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lineInvestigationFonts} h-full`}>
      <body className="min-h-full bg-li-paper font-li-body text-li-ink antialiased">
        {children}
      </body>
    </html>
  );
}
