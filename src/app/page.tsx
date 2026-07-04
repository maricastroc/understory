import { Hero } from "@/components/landing/Hero";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Method } from "@/components/landing/Method";
import { Principles } from "@/components/landing/Principles";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function Home() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <Hero />
      <Principles />
      <Method />
      <SiteFooter />
    </div>
  );
}
