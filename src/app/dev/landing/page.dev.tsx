import { DigLanding } from "@/components/landing/dig/DigLanding";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { displayFont } from "@/components/line-investigation/fonts";

export default function LandingPrototypePage() {
  return (
    <div className={`${displayFont} min-h-screen bg-li-paper font-li-body text-li-ink`}>
      <SiteHeader pinned={false} />
      <main>
        <DigLanding />
      </main>
      <SiteFooter />
    </div>
  );
}
