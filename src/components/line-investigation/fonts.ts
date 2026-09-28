import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const lineInvestigationFonts = `${barlow.variable} ${plexMono.variable}`;

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-barlow-condensed",
});

export const displayFont = barlowCondensed.variable;
