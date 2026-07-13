import { SiteHeader } from "@/components/SiteHeader";
import { Braces, PullRequest } from "@/components/icons";
import { Hero } from "@/components/landing/Hero";
import { Method } from "@/components/landing/Method";
import { Principles } from "@/components/landing/Principles";
import { ReviewCopilot } from "@/components/landing/ReviewCopilot";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader
        secondary={{
          href: "/pr",
          label: "Explain a PR",
          icon: <PullRequest className="size-4 text-ink-3" />,
        }}
        cta={{ href: "/app", label: "Explain a line", icon: <Braces className="size-4" /> }}
      />
      <main>
        <Hero />
        <ReviewCopilot />
        <Principles />
        <Method />
      </main>
      <SiteFooter />
    </div>
  );
}
