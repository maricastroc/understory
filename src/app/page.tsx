import Link from "next/link";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { Check, ChevronRight, Commit, Issue, Logo, PullRequest, Shield } from "@/components/icons";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

const codeLines = [
  { n: 6, text: 'import { sleep } from "../lib/sleep";' },
  { n: 7, text: "" },
  { n: 8, text: "export async function chargeCustomer(req) {" },
  { n: 9, text: "  for (let attempt = 0; attempt < 3; attempt++) {", hot: true },
  { n: 10, text: "    try { return await stripe.charges.create(req); }" },
  { n: 11, text: "    catch { await sleep(2 ** attempt * 1000); }" },
  { n: 12, text: "  }" },
  { n: 13, text: "}" },
];

const grounded = [
  { icon: <Commit className="size-3" />, id: "commit:c038fb3" },
  { icon: <PullRequest className="size-3" />, id: "pr:812" },
  { icon: <Issue className="size-3" />, id: "issue:1187" },
];

const principles = [
  {
    tag: "01 · sources",
    title: "Evidence, not assertions",
    body: "Every claim points to a real commit, pull request, or issue. You read the record — the conclusion is just the index to it.",
  },
  {
    tag: "02 · grounding",
    title: "Citations are verified",
    body: "A deterministic check confirms each citation resolves to collected evidence. A fabricated source is caught, never trusted.",
  },
  {
    tag: "03 · honesty",
    title: "It admits the cold trail",
    body: "When the history doesn't explain a line, it returns a low-confidence verdict and says so — instead of inventing a plausible story.",
  },
];

const steps = [
  {
    n: "01",
    title: "Point at a line",
    body: "Open a GitHub repo, find a file by name or symbol, and click the exact line under question.",
  },
  {
    n: "02",
    title: "Follow the trail",
    body: "Blame surfaces the commit behind the line; the pull request and issues behind that commit carry the reasoning.",
  },
  {
    n: "03",
    title: "Read the verdict",
    body: "A reconstructed “why”, every sentence grounded in a source you can open — or an honest “the record is silent.”",
  },
];

const sampleConfidence = {
  score: 0.92,
  level: "high" as const,
  primarySources: 4,
  corroborating: 2,
  contradicting: 0,
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
          <Logo className="size-6 text-accent" />
          <span className="text-[14px] font-semibold tracking-tight">Git Investigator</span>
          <span className="ml-3 hidden font-mono text-[11px] text-ink-3 sm:inline">
            {`// code archaeology`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/app"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line-2 bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-inset"
            >
              <GitHubMark className="size-4" />
              Sign in with GitHub
            </Link>
            <Link
              href="/app"
              className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press"
            >
              Open app
            </Link>
          </div>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 lg:pt-20">
        <p className="font-mono text-[12.5px] text-ink-3">
          <span className="text-accent-press">git blame</span> tells you{" "}
          <span className="text-ink">who</span> and <span className="text-ink">when</span>. This
          tells you <span className="text-ink">why</span>.
        </p>

        <h1 className="mt-5 max-w-[18ch] font-mono text-[40px] leading-[1.06] font-semibold tracking-[-0.03em] sm:text-[56px]">
          Why is this <span className="text-accent">line</span> here?
          <span
            aria-hidden
            className="ml-2 inline-block h-[0.82em] w-[0.5ch] translate-y-[0.06em] animate-pulse bg-accent align-baseline motion-reduce:animate-none"
          />
        </h1>

        <p className="mt-6 max-w-[58ch] font-sans text-[16px] leading-relaxed text-ink-2">
          Git Investigator reconstructs the reasoning behind a line of code — tracing the commits,
          pull requests, and issues that shaped it — and cites every source you can click. When the
          history doesn&apos;t explain it, it tells you, instead of inventing a reason.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/app"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press"
          >
            Open a case
            <ChevronRight className="size-4" />
          </Link>
          <a
            href="#how"
            className="inline-flex h-11 items-center rounded-md border border-line-2 bg-surface px-5 text-[14px] font-medium text-ink transition-colors hover:bg-inset"
          >
            How it works
          </a>
        </div>

        {/* the investigation — product as hero */}
        <div className="mt-14 grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
          {/* code + blame */}
          <div className="overflow-hidden rounded-t-[12px] border border-line bg-surface shadow-[0_10px_40px_rgba(20,22,30,0.06)] lg:rounded-l-[12px] lg:rounded-tr-none lg:border-r-0">
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5 font-mono text-[12px] text-ink-3">
              <span className="text-ink-2">payments-service</span>
              <span>/</span>
              <span className="text-ink-2">src/billing/charge.ts</span>
              <span className="ml-auto rounded bg-inset px-2 py-0.5 text-[11px]">git blame</span>
            </div>
            <div className="overflow-x-auto py-2 font-mono text-[12.5px] leading-[1.7]">
              {codeLines.map((l) => (
                <div
                  key={l.n}
                  className={`flex items-center px-1 ${l.hot ? "bg-accent-tint" : ""}`}
                >
                  <span
                    className={`w-10 shrink-0 pr-3 text-right select-none ${l.hot ? "text-accent-press" : "text-ink-3"}`}
                  >
                    {l.n}
                  </span>
                  <code className="pr-4 whitespace-pre text-ink">{l.text || " "}</code>
                  {l.hot && (
                    <span className="ml-auto flex shrink-0 items-center gap-1 pr-3 text-[11px] font-semibold whitespace-nowrap text-accent-press">
                      ◀ why exactly 3?
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* verdict */}
          <div className="flex flex-col rounded-b-[12px] border border-line bg-surface p-5 shadow-[0_10px_40px_rgba(20,22,30,0.06)] lg:rounded-r-[12px] lg:rounded-bl-none">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-good-tint px-2.5 text-[11.5px] font-semibold text-good">
                <span className="size-1.5 rounded-full bg-good" />
                Solved
              </span>
              <span className="font-mono text-[11px] text-ink-3">GI-2049</span>
              <div className="ml-auto">
                <ConfidenceRing confidence={sampleConfidence} size={64} />
              </div>
            </div>

            <p className="mt-4 text-[13.5px] leading-relaxed text-[#2a2d36]">
              Capped at three after an unbounded loop double-billed customers during a Stripe outage
              — three attempts stay inside the 10-second webhook window.
            </p>

            <div className="mt-auto border-t border-line pt-3">
              <div className="mb-2 font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                grounded in
              </div>
              <div className="flex flex-wrap gap-1.5">
                {grounded.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1 font-mono text-[11px] text-ink-2"
                  >
                    <Check className="size-3 text-good" />
                    {g.icon}
                    {g.id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="font-mono text-[12px] text-accent-press">{`// the standard of evidence`}</p>
          <h2 className="mt-3 max-w-[22ch] text-[27px] font-semibold tracking-[-0.015em] text-balance">
            Not a chat about your repo. A record you can audit.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="bg-surface p-6">
                <span className="font-mono text-[11px] text-ink-3">{p.tag}</span>
                <h3 className="mt-3 text-[15.5px] font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-mono text-[12px] text-accent-press">{`// the method`}</p>
        <h2 className="mt-3 max-w-[22ch] text-[27px] font-semibold tracking-[-0.015em] text-balance">
          From a line you don&apos;t understand to the decision behind it.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-semibold text-accent-press">{s.n}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start gap-4 rounded-[14px] border border-line bg-surface-2 px-8 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-good">
              <Shield className="size-4" />
              <span className="font-mono text-[11.5px] tracking-[0.06em] uppercase">
                open a case
              </span>
            </div>
            <h3 className="mt-2 text-[18px] font-semibold tracking-tight">
              Interrogate your own code.
            </h3>
            <p className="mt-1 text-[13.5px] text-ink-2">
              Point it at a repository and a line — see what the history really says.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-accent px-5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press"
          >
            Start investigating
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 font-mono text-[12px] text-ink-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="size-4 text-ink-3" />
            <span>git-investigator — a portfolio project by Mariana Castro</span>
          </div>
          <span>evidence &gt; assertions</span>
        </div>
      </footer>
    </div>
  );
}
