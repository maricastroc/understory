import { principles } from "./content";

export function Principles() {
  return (
    <section className="border-y border-line bg-surface-2">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="font-mono text-[12px] text-accent-press">{`// the standard of evidence`}</p>
        <h2 className="mt-3 max-w-[22ch] text-[24px] font-semibold tracking-[-0.015em] text-balance sm:text-[27px]">
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
  );
}
