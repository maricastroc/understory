"use client";

import { useEffect, useRef, useState } from "react";
import { DiffView } from "@/components/diff/DiffView";
import { useExplainDiff } from "@/components/diff/use-explain-diff";
import { PrComposer } from "@/components/pr/PrComposer";
import { AppHeader } from "@/components/shell/AppHeader";
import { PrRail, PrRailContent } from "@/components/pr/PrRail";
import { PrRow } from "@/components/pr/PrRow";
import { usePrHistory } from "@/components/pr/use-pr-history";
import { HistoryDrawer } from "@/components/shell/HistoryDrawer";
import { HistorySidebar } from "@/components/shell/HistorySidebar";
import { PullRequest } from "@/components/icons";
import { useAuth } from "@/components/investigator/use-auth";
import { useLanguage } from "@/components/use-language";

const EXAMPLE = "chalk/chalk#664";

export default function PrPage() {
  const user = useAuth();
  const [pr, setPr] = useState("");
  const [token, setToken] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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

  const renderPrs = (onSelect: (key: string) => void) =>
    entries.map((e) => (
      <PrRow
        key={e.key}
        entry={e}
        active={e.key === activeKey}
        onSelect={onSelect}
        onRemove={remove}
      />
    ));
  const prEmpty = {
    emptyIcon: <PullRequest className="size-4.5" />,
    emptyTitle: "No pull requests yet",
    emptyBody: "Paste a PR above and explain it — each analysis files itself here.",
  };

  return (
    <div className="flex h-screen flex-col">
      <AppHeader mode="pr" user={user} onMenuClick={() => setMenuOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <HistorySidebar
          ariaLabel="Explained pull requests"
          label="Pull requests"
          count={entries.length}
          user={user}
          {...prEmpty}
        >
          {renderPrs(select)}
        </HistorySidebar>

        <HistoryDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          ariaLabel="Explained pull requests"
          label="Pull requests"
          count={entries.length}
          user={user}
          {...prEmpty}
        >
          {renderPrs((key) => {
            select(key);
            setMenuOpen(false);
          })}
        </HistoryDrawer>

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
                <div className="mt-5 flex flex-col gap-3.5 xl:hidden">
                  <PrRailContent result={activeResult} />
                </div>
              </div>
            )}
          </div>
        </main>

        <PrRail result={activeResult} />
      </div>
    </div>
  );
}
