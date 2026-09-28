import type { DomainKind } from "./domain-kind";

const INK = "stroke-current";

function Shape({ kind }: { kind: DomainKind }) {
  switch (kind) {
    case "repository":
      return (
        <>
          <line x1="2.5" x2="13.5" y1="4" y2="4" strokeWidth="1.5" className="stroke-li-datum" />
          <line x1="3.5" x2="12.5" y1="7.5" y2="7.5" strokeWidth="1.5" className={INK} />
          <line x1="2.5" x2="10.5" y1="11" y2="11" strokeWidth="1.5" className={INK} />
          <line x1="4.5" x2="13.5" y1="14" y2="14" strokeWidth="1.5" className={INK} />
        </>
      );
    case "file":
      return (
        <path
          d="M3.5 1.75h6l3 3v9.5h-9z M9.5 1.75v3h3"
          fill="none"
          strokeWidth="1.5"
          strokeLinejoin="miter"
          className={INK}
        />
      );
    case "line":
      return (
        <>
          <line x1="2" x2="9" y1="6" y2="6" strokeWidth="1.5" className={INK} />
          <line x1="2" x2="14" y1="10.5" y2="10.5" strokeWidth="2" className="stroke-li-datum" />
        </>
      );
    case "question":
      return (
        <>
          <path
            d="M5.5 5.25a2.5 2.5 0 1 1 3.4 2.33c-.55.22-.9.74-.9 1.33V9.5"
            fill="none"
            strokeWidth="1.5"
            className={INK}
          />
          <rect x="7.25" y="11.75" width="1.5" height="1.5" className="fill-current" />
        </>
      );
    case "commit":
      return (
        <>
          <line x1="8" x2="8" y1="1" y2="15" strokeWidth="1.5" className={INK} />
          <circle cx="8" cy="8" r="3.25" strokeWidth="1.5" className={`fill-li-paper ${INK}`} />
        </>
      );
    case "pull_request":
      return (
        <>
          <line x1="8" x2="8" y1="1" y2="15" strokeWidth="1.5" className={INK} />
          <rect
            x="5"
            y="4"
            width="6"
            height="8"
            strokeWidth="1"
            className="fill-li-evidence-tint stroke-li-evidence-edge"
          />
        </>
      );
    case "issue":
      return (
        <rect
          x="4.5"
          y="4.5"
          width="7"
          height="7"
          strokeWidth="1.5"
          transform="rotate(45 8 8)"
          className={`fill-li-paper ${INK}`}
        />
      );
    case "evidence":
      return (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" className="fill-current" />
          <path
            d="M5.5 11 8 5l2.5 6 M6.4 9h3.2"
            fill="none"
            strokeWidth="1.25"
            className="stroke-li-paper"
          />
        </>
      );
  }
}

export function DomainIcon({
  kind,
  size = 16,
  className = "",
}: {
  kind: DomainKind;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={`shrink-0 overflow-visible text-li-ink ${className}`}
    >
      <Shape kind={kind} />
    </svg>
  );
}
