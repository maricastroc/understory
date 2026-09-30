import { askedText } from "./strata-copy";

function split(question: string, token: string | null): [string, string, string] | null {
  if (!token) return null;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?<![\\w$.])${escaped}(?![\\w$]|\\.\\d)`).exec(question);
  if (!m) return null;
  return [question.slice(0, m.index), m[0], question.slice(m.index + m[0].length)];
}

export function StrataQuestion({
  question,
  token,
  line,
  wide,
}: {
  question: string;
  token: string | null;
  line: number;
  wide: boolean;
}) {
  const parts = split(question, token);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-li-mono text-[11px] text-strata-bore-ink">
        {askedText(token, line)}
      </span>
      <h2
        className={`m-0 font-li-display leading-none font-semibold tracking-[-0.015em] text-strata-ink ${
          wide ? "text-[46px]" : "text-[32px]"
        }`}
      >
        {parts ? (
          <>
            {parts[0]}
            <span className="text-strata-bore">{parts[1]}</span>
            {parts[2]}
          </>
        ) : (
          question
        )}
      </h2>
    </div>
  );
}
