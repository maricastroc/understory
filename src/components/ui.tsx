type Tone = "good" | "warn" | "crit" | "accent" | "neutral";

const toneBadge: Record<Tone, string> = {
  good: "bg-good-tint text-good",
  warn: "bg-warn-tint text-warn",
  crit: "bg-crit-tint text-crit",
  accent: "bg-accent-tint text-accent-press",
  neutral: "bg-inset text-ink-3",
};

const toneDot: Record<Tone, string> = {
  good: "bg-good",
  warn: "bg-warn",
  crit: "bg-crit",
  accent: "bg-accent",
  neutral: "bg-ink-3",
};

export function SectionLabel({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <h2 className="text-[13px] font-semibold tracking-[0.07em] text-ink uppercase">{title}</h2>
      {meta && <span className="text-[12px] text-ink-3">{meta}</span>}
    </div>
  );
}

export function Pill({
  tone,
  dot,
  children,
}: {
  tone: Tone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-5.5 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold ${toneBadge[tone]}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${toneDot[tone]}`} />}
      {children}
    </span>
  );
}

const AVATAR_BG = ["#8A5A44", "#4B57D6", "#3F6B58", "#6B718A", "#9A6A2E", "#5B5F97"];

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_BG[h % AVATAR_BG.length];
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}
