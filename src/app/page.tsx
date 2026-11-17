import { DigLanding } from "@/components/landing/dig/DigLanding";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-li-paper font-li-body text-li-ink">
      <SiteHeader />
      <main>
        <DigLanding />
      </main>
      <SiteFooter />
    </div>
  );
}
