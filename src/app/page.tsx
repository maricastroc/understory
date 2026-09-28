import { ClosingCta } from "@/components/landing/ClosingCta";
import { EvidenceStandard } from "@/components/landing/EvidenceStandard";
import { Hero } from "@/components/landing/Hero";
import { Method } from "@/components/landing/Method";
import { PrScale } from "@/components/landing/PrScale";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { displayFont } from "@/components/line-investigation/fonts";

export default function Home() {
  return (
    <div className={`${displayFont} min-h-screen bg-li-paper font-li-body text-li-ink`}>
      <SiteHeader />
      <main>
        <Hero />
        <PrScale />
        <EvidenceStandard />
        <Method />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
