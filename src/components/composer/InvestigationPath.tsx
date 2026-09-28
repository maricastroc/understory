import type { PathStep } from "./types/path-step";

const MARKER: Record<PathStep["state"], string> = {
  done: "border-li-ink bg-li-ink",
  current: "border-li-ink bg-li-datum-strong",
  next: "border-dashed border-li-neutral-500 bg-li-paper",
};

const LABEL: Record<PathStep["state"], string> = {
  done: "text-li-ink",
  current: "font-semibold text-li-ink",
  next: "text-li-text-muted",
};

const VALUE: Record<PathStep["state"], string> = {
  done: "text-li-ink",
  current: "text-li-datum-ink",
  next: "text-li-text-subtle",
};

function Thread({ from, to }: { from: PathStep["state"]; to: PathStep["state"] }) {
  const solid = from === "done" && to !== "next";
  return (
    <span
      aria-hidden
      className={`h-0 min-w-4 flex-1 border-t-2 transition-colors duration-300 motion-reduce:transition-none ${
        solid ? "border-li-ink" : "border-dashed border-li-neutral-400"
      }`}
    />
  );
}

export function InvestigationPath({ steps }: { steps: PathStep[] }) {
  return (
    <nav aria-label="Investigation path">
      <ol className="grid grid-cols-4">
        {steps.map((step, i) => {
          const next = steps[i + 1];
          const number = String(i + 1).padStart(2, "0");
          const clickable = !!step.onPick && step.state === "done";
          const text = (
            <>
              <span className="flex items-baseline gap-1.5">
                <span
                  className={`font-li-mono text-[12px] ${
                    step.state === "next" ? "text-li-text-muted" : "text-li-datum-ink"
                  }`}
                >
                  {number}
                </span>
                <span
                  className={`text-[15px] underline-offset-3 ${LABEL[step.state]} ${
                    clickable
                      ? "decoration-1 group-hover:underline group-focus-visible:underline group-active:text-li-neutral-800"
                      : ""
                  }`}
                >
                  {step.label}
                </span>
              </span>
              {step.value && (
                <span
                  key={step.value}
                  className={`mt-1 block max-w-full animate-li-arrive truncate font-li-mono text-[12.5px] ${VALUE[step.state]}`}
                >
                  {step.value}
                </span>
              )}
            </>
          );
          return (
            <li key={step.key} className="min-w-0">
              <span aria-hidden className="flex items-center gap-2">
                <span
                  className={`size-3.5 shrink-0 rounded-full border-2 transition-colors duration-300 motion-reduce:transition-none ${MARKER[step.state]}`}
                />
                {next ? <Thread from={step.state} to={next.state} /> : <span className="flex-1" />}
              </span>
              <div className="mt-2 min-h-11 pr-3">
                {clickable ? (
                  <button
                    type="button"
                    onClick={step.onPick ?? undefined}
                    aria-label={`${number} ${step.label}${step.value ? `: ${step.value}` : ""}, go back to this step`}
                    className="group flex max-w-full min-w-0 cursor-pointer flex-col items-start text-left focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-li-steel"
                  >
                    {text}
                  </button>
                ) : (
                  <div
                    aria-current={step.state === "current" ? "step" : undefined}
                    aria-disabled={step.state === "next" ? true : undefined}
                    className="flex max-w-full min-w-0 flex-col items-start"
                  >
                    <span className="sr-only">
                      {number} {step.label}
                      {step.value ? `: ${step.value}` : ""}
                      {step.state === "current" ? ", current step" : ""}
                      {step.state === "next" ? ", not yet" : ""}
                    </span>
                    <span aria-hidden className="flex max-w-full min-w-0 flex-col items-start">
                      {text}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
