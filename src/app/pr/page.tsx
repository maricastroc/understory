"use client";

import { useEffect, useRef, useState } from "react";
import { DiffView } from "@/components/diff/DiffView";
import { useExplainDiff } from "@/components/diff/use-explain-diff";
import { PrComposer } from "@/components/pr/PrComposer";
import { PrHeader } from "@/components/pr/PrHeader";
import { PrRail } from "@/components/pr/PrRail";
import { PrSidebar } from "@/components/pr/PrSidebar";
import { usePrHistory } from "@/components/pr/use-pr-history";
import { useAuth } from "@/components/investigator/use-auth";
import { useLanguage } from "@/components/use-language";

const EXAMPLE = "chalk/chalk#664";

export default function PrPage() {
  const user = useAuth();
  const [pr, setPr] = useState("");
  const [token, setToken] = useState("");
  const { language } = useLanguage();
  const { loading, error, result, run } = useExplainDiff();
  const { entries, activeKey, active, select, remove } = usePrHistory(result);

  const gh = () => token.trim() || undefined;
  const runPr = (value = pr) => {
    if (value.trim()) void run(value, language, gh());
  };
  const tryExample = () => {
    setPr(EXAMPLE);
    runPr(EXAMPLE);
  };

  const firstLang = useRef(true);
  useEffect(() => {
    if (firstLang.current) {
      firstLang.current = false;
      return;
    }
    if (pr.trim() && active && !loading) void run(pr, language, gh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const activeResult = active?.result ?? null;

  return (
    <div className="flex h-screen flex-col">
      <PrHeader user={user} />

      <div className="flex min-h-0 flex-1">
        <PrSidebar
          entries={entries}
          activeKey={activeKey}
          onSelect={select}
          onRemove={remove}
          user={user}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-270 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <PrComposer
              pr={pr}
              setPr={setPr}
              token={token}
              setToken={setToken}
              loading={loading}
              error={error}
              onRun={() => runPr()}
              onExample={tryExample}
            />

            {activeResult && !loading && (
              <div className="mt-5">
                <DiffView result={activeResult} />
              </div>
            )}
          </div>
        </main>

        <PrRail result={activeResult} />
      </div>
    </div>
  );
}
