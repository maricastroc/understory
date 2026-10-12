import fixture from "./fixture.json";

type Claim = (typeof fixture.examples)[number]["claims"][number];
type Example = (typeof fixture.examples)[number];

const DIRECT = "directly linked to the line";
const CHANGE = "recorded for the change, no specific link shown";

const short = (id: string) =>
  id.replace("commit:", "").replace("pr:", "#").replace("review:", "review ");

function evidenceWords(claim: Claim): string {
  if (claim.evidence === "stated by a cited source")
    return `stated by ${claim.citations.map(short).join(", ")}`;
  if (claim.evidence === "insufficient") return "insufficient: the sources do not say this";
  if (claim.evidence === "refuted") return "refuted: the sources are about something else";
  return "absent: no source was checked";
}

function linkWords(claim: Claim): string {
  if (claim.specificity.startsWith("direct")) return "this line's own block";
  const where = claim.anchoring ? `, from a review comment made ${claim.anchoring}` : "";
  if (claim.specificity.startsWith("another change")) return "an earlier change to this line";
  return `the change as a whole, not this line${where}`;
}

function Meta({ label, children, tone }: { label: string; children: string; tone: string }) {
  return (
    <p className="flex gap-3 font-mono text-[11px] leading-5">
      <span className="w-16 shrink-0 text-li-text-muted">{label}</span>
      <span className={tone}>{children}</span>
    </p>
  );
}

function Qualified({ example }: { example: Example }) {
  return (
    <div className="space-y-5">
      <p className="font-mono text-[11px] text-li-text-muted">
        shown today as {example.level} · {example.score}
      </p>
      {example.claims.map((claim, i) => {
        const sustained = claim.state !== "not sustained";
        return (
          <div key={i} className="space-y-1.5">
            <p className={sustained ? "text-li-ink" : "text-li-text-muted"}>{claim.text}</p>
            <Meta label="evidence" tone={sustained ? "text-li-evidence-ink" : "text-li-gap-ink"}>
              {evidenceWords(claim)}
            </Meta>
            <Meta
              label="link"
              tone={claim.state === DIRECT ? "text-li-datum-ink" : "text-li-text-subtle"}
            >
              {linkWords(claim)}
            </Meta>
            {claim.causal && claim.state !== DIRECT ? (
              <p className="border-l border-li-divider pl-3 text-[13px] text-li-text-subtle">
                {sustained
                  ? "Worded as a cause. The record gives this reason for the change, and nothing ties it to this line."
                  : "Worded as a cause. No cited source sustains it."}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function lineFact(example: Example): string {
  const change = example.change;
  if (!change) return "What the last change did to this line could not be read.";
  const commit = short(change.commit);
  if (change.before !== null)
    return `Commit ${commit} rewrote this line. Before, it read: ${change.before}`;
  return change.others > 0
    ? `Commit ${commit} added this line, together with ${change.others} other lines around it.`
    : `Commit ${commit} added this line.`;
}

const LIMIT = 150;

type Source = { kind: string; date: string; body: string; change: string | null };

const sourcesOf = (example: Example) =>
  example.sources as unknown as Record<string, Source | undefined>;

function Quote({
  example,
  source,
  text,
  note,
}: {
  example: Example;
  source: string;
  text: string;
  note?: string;
}) {
  const from = sourcesOf(example)[source];
  return (
    <div className="border-l border-li-evidence-edge pl-3">
      <p className="text-li-ink">
        “{text.length > LIMIT ? `${text.slice(0, LIMIT).trimEnd()}…` : text}”
      </p>
      {text.length > LIMIT ? (
        <details className="text-[13px] text-li-text-subtle">
          <summary className="cursor-pointer font-mono text-[11px]">the whole passage</summary>
          <p className="mt-1 text-li-ink">“{text}”</p>
        </details>
      ) : null}
      <details className="text-[13px] text-li-text-subtle">
        <summary className="cursor-pointer font-mono text-[11px] text-li-text-muted">
          {short(source)} · {from?.kind.replace("_", " ")} · {from?.date}
          {note ? ` · ${note}` : ""} · the source in full
        </summary>
        <pre className="mt-1 font-mono text-[11px] leading-5 whitespace-pre-wrap">{from?.body}</pre>
      </details>
    </div>
  );
}

const placed = (claim: Claim, source: string) =>
  source.startsWith("review") && claim.anchoring ? `comment made ${claim.anchoring}` : undefined;

function Apart({ example }: { example: Example }) {
  const direct = example.claims.filter((c) => c.state === DIRECT);
  const change = example.claims.filter((c) => c.state === CHANGE);
  const rest = example.claims.filter((c) => c.state === "not sustained");
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h4 className="font-mono text-[11px] tracking-wide text-li-datum-ink uppercase">
          About this line
        </h4>
        <p className="text-li-ink">{lineFact(example)}</p>
        {direct.length ? (
          direct.map((claim, i) => (
            <p key={i} className="text-li-ink">
              {claim.text}{" "}
              <span className="font-mono text-[11px] text-li-evidence-ink">
                {claim.citations.map(short).join(", ")}
              </span>
            </p>
          ))
        ) : (
          <p className="text-li-text-subtle">
            No source in the record is tied to this line itself.
          </p>
        )}
      </section>
      {change.length ? (
        <section className="space-y-3">
          <h4 className="font-mono text-[11px] tracking-wide text-li-evidence-ink uppercase">
            About the change that last touched it
          </h4>
          <p className="text-[13px] text-li-text-subtle">
            The record&apos;s own words. They explain the change. Whether they explain this line is
            not shown.
          </p>
          {change.flatMap((claim, at) =>
            claim.quotes.map((quote, i) => (
              <Quote
                key={`${at}-${quote.source}-${i}`}
                example={example}
                source={quote.source}
                text={quote.text}
                note={placed(claim, quote.source)}
              />
            )),
          )}
        </section>
      ) : null}
      {rest.length ? (
        <section className="space-y-2">
          <h4 className="font-mono text-[11px] tracking-wide text-li-gap-ink uppercase">
            Said in the answer, not sustained
          </h4>
          {rest.map((claim, i) => (
            <p key={i} className="text-[13px] text-li-text-muted">
              {claim.text}{" "}
              <span className="font-mono text-[11px] text-li-gap-ink">{claim.evidence}</span>
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function Synthesis({ example }: { example: Example }) {
  const sources = sourcesOf(example);
  const last = example.change?.commit ?? null;
  const sustained = example.claims.filter((c) => c.state !== "not sustained");
  const rest = example.claims.filter((c) => c.state === "not sustained");
  const told = example.history
    .map((entry) => ({
      entry,
      claims: sustained.filter((c) => c.citations.some((id) => sources[id]?.change === entry.id)),
    }))
    .filter((group) => group.claims.length > 0);
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h4 className="font-mono text-[11px] tracking-wide text-li-datum-ink uppercase">
          What happened on this line
        </h4>
        <ol className="space-y-1">
          {example.history.map((entry) => (
            <li
              key={entry.id}
              className={entry.id === last ? "text-li-ink" : "text-li-text-subtle"}
            >
              <span className="font-mono text-[11px] text-li-text-muted">
                {entry.date} · {short(entry.id)}
              </span>{" "}
              {entry.title}
              {entry.id === last ? <span className="block">{lineFact(example)}</span> : null}
            </li>
          ))}
        </ol>
      </section>
      <section className="space-y-4">
        <h4 className="font-mono text-[11px] tracking-wide text-li-evidence-ink uppercase">
          What the record gives as the reason
        </h4>
        {told.length === 0 ? (
          <p className="text-li-text-subtle">Nothing the audit could sustain.</p>
        ) : null}
        {told.map(({ entry, claims }) => {
          const tied = claims.filter((c) => c.state === DIRECT);
          const scope = tied.length
            ? "tied to this line"
            : entry.id === last
              ? "given for the change as a whole"
              : "given for an earlier change to this line";
          return (
            <div key={entry.id} className="space-y-2">
              <p className="font-mono text-[11px]">
                <span className={tied.length ? "text-li-datum-ink" : "text-li-text-subtle"}>
                  {scope}
                </span>
                <span className="text-li-text-muted">
                  {" "}
                  · {short(entry.id)} · {entry.date}
                </span>
              </p>
              {tied.map((claim, i) => (
                <p key={i} className="text-li-ink">
                  {claim.text}
                </p>
              ))}
              {claims.flatMap((claim, at) =>
                claim.quotes
                  .filter((quote) => sources[quote.source]?.change === entry.id)
                  .map((quote, i) => (
                    <Quote
                      key={`${at}-${quote.source}-${i}`}
                      example={example}
                      source={quote.source}
                      text={quote.text}
                      note={placed(claim, quote.source)}
                    />
                  )),
              )}
            </div>
          );
        })}
      </section>
      {(sustained.length > 0 && !sustained.some((c) => c.state === DIRECT)) || rest.length > 0 ? (
        <section className="space-y-2">
          <h4 className="font-mono text-[11px] tracking-wide text-li-gap-ink uppercase">
            Not established
          </h4>
          {sustained.length > 0 && !sustained.some((c) => c.state === DIRECT) ? (
            <p className="text-li-text-subtle">
              The record explains the change. It does not show that this is why this line reads as
              it does.
            </p>
          ) : null}
          {sustained.length === 0 ? (
            <p className="text-li-text-subtle">
              No reason for this line that a source sustains. What the record does give is the
              change itself, above.
            </p>
          ) : null}
          {rest.length ? (
            <details className="text-[13px] text-li-text-muted">
              <summary className="cursor-pointer font-mono text-[11px]">
                {rest.length} {rest.length === 1 ? "sentence" : "sentences"} of the answer that no
                source sustains
              </summary>
              {rest.map((claim, i) => (
                <p key={i} className="mt-1">
                  {claim.text}{" "}
                  <span className="font-mono text-[11px] text-li-gap-ink">{claim.evidence}</span>
                </p>
              ))}
            </details>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

const VIEWS = [
  ["a", "A · the explanation, qualified claim by claim", Qualified],
  ["b", "B · the change and the line, told apart", Apart],
  [
    "c",
    "C · what happened, what the record gives as the reason, what is not established",
    Synthesis,
  ],
] as const;

export function LinkPreview({ only }: { only: "a" | "b" | "c" | null }) {
  const views = VIEWS.filter(([key]) => !only || key === only);
  return (
    <main className="mx-auto max-w-[1500px] bg-li-paper px-6 py-10 text-[15px] leading-6 text-li-ink">
      <h1 className="text-xl">Evidence and link, shown three ways</h1>
      <p className="mt-2 max-w-3xl text-li-text-subtle">
        Five answers kept in the eval, unchanged. Each claim carries two separate readings: how good
        its evidence is, as the audit judged it, and how specifically its sources are tied to the
        line. Add ?d=a, ?d=b or ?d=c to see one alone.
      </p>
      {fixture.examples.map((example) => (
        <article key={example.id} className="mt-12 border-t border-li-rule pt-6">
          <p className="font-mono text-[11px] text-li-text-muted">
            {example.repo} · {example.location} · {example.category} · {example.why}
          </p>
          <p className="mt-1">{example.question}</p>
          <pre className="mt-3 overflow-x-auto bg-li-datum-row px-3 py-1.5 font-mono text-[13px]">
            {example.line}
          </pre>
          <div className={only ? "mt-6 max-w-2xl" : "mt-6 grid gap-10 xl:grid-cols-3"}>
            {views.map(([key, title, View]) => (
              <div key={key}>
                <h3 className="mb-4 font-mono text-[11px] tracking-wide text-li-text-muted uppercase">
                  {title}
                </h3>
                <View example={example} />
              </div>
            ))}
          </div>
        </article>
      ))}
    </main>
  );
}
