/**
 * Right-hand panel of the split demo (deployed site only). Dark scoreboard style; all colours come from the
 * variables scoped to .vos-panel in index.css. Wording avoids the exact strings that scripts/verify.js asks Kane to look for.
 */
import { useEffect, useRef, useState } from "react";
import { BUGS, useBugs, type BugId } from "@/lib/bugs";
import { RECORDED_COUNT } from "@/data/recorded";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { FixRunView } from "@/components/demo/FixRunView";
import { OverviewTab } from "@/components/demo/OverviewTab";
import { PlantTab } from "@/components/demo/PlantTab";
import { HowTab } from "@/components/demo/HowTab";
import type { TabId } from "@/components/demo/shared";

/** ?tab=overview|bugs|how wins. Otherwise a ?bugs=... link opens "Plant a bug", and everything else opens Overview. */
function initialTab(): TabId {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab");
  if (t === "overview" || t === "bugs" || t === "how") return t;
  return params.get("bugs") ? "bugs" : "overview";
}

export function DemoPanel({ onShowShop, onRunChange }: { onShowShop?: () => void; onRunChange?: (open: boolean) => void }) {
  const bugs = useBugs();
  const [tab, setTab] = useState<TabId>(initialTab);

  // fix run view: which bug is open, and which bugs were switched off by a finished run
  const [runId, setRunId] = useState<BugId | null>(null);
  const [fixed, setFixed] = useState<Set<BugId>>(() => new Set());
  // tell the layout whether the run view is open (the panes cannot be hidden while it is)
  useEffect(() => { onRunChange?.(runId !== null); }, [runId, onRunChange]);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const setRowRef = (key: string, el: HTMLButtonElement | null) => { rowRefs.current[key] = el; };
  const unfix = (id: BugId) => setFixed((s) => { const n = new Set(s); n.delete(id); return n; });

  const closeRun = () => {
    const id = runId;
    setRunId(null);
    if (!id) return;
    // back to the row: the fix button if it is still there, otherwise the row's toggle
    window.requestAnimationFrame(() => {
      const fixBtn = rowRefs.current[`fix-${id}`];
      (fixBtn?.isConnected ? fixBtn : rowRefs.current[`toggle-${id}`])?.focus();
    });
  };

  const planted = bugs.active.length;

  return (
    <div className="vos-panel relative flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-(--vos-line-strong) bg-(--vos-bg) px-5 py-3">
        <div className="mx-auto flex w-full max-w-[880px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-[15px] font-semibold tracking-[-0.01em]">Verify-on-Save</p>
          <div className="flex flex-wrap gap-2 text-[12px]">
            <p className="rounded-md border border-(--vos-line) bg-(--vos-raised) px-2.5 py-1 whitespace-nowrap text-(--vos-soft)" aria-live="polite">
              Bugs planted{" "}
              <span className={`font-mono font-semibold ${planted ? "text-(--vos-coral)" : "text-(--vos-text)"}`}>
                {planted}/{BUGS.length}
              </span>
            </p>
            <p className="rounded-md border border-(--vos-line) bg-(--vos-raised) px-2.5 py-1 whitespace-nowrap text-(--vos-soft)">
              Real Kane runs{" "}
              <span className="font-mono font-semibold text-(--vos-green)">
                {RECORDED_COUNT}/{BUGS.length}
              </span>
            </p>
          </div>
        </div>
      </header>

      <AnimatedTabs
        className="flex-1"
        innerClassName="max-w-[880px]"
        value={tab}
        onChange={(v) => setTab(v as TabId)}
        tabs={[
          { value: "overview", title: "Overview", content: <OverviewTab onGo={setTab} /> },
          {
            value: "bugs",
            title: "Plant a bug",
            // the number is decorative; screen readers get the words
            badge: planted > 0 ? (
              <>
                <span aria-hidden>{planted}</span>
                <span className="sr-only">{planted} planted</span>
              </>
            ) : undefined,
            content: (
              <PlantTab
                fixed={fixed}
                onToggle={(id) => { unfix(id); bugs.toggle(id); }}
                onReset={() => { setFixed(new Set()); bugs.reset(); }}
                onFix={setRunId}
                setRef={setRowRef}
                onShowShop={onShowShop}
              />
            ),
          },
          { value: "how", title: "How it works", content: <HowTab /> },
        ]}
      />

      {runId && (
        <FixRunView
          key={runId}
          bug={BUGS.find((b) => b.id === runId)!}
          onFixed={() => { bugs.off(runId); setFixed((s) => new Set(s).add(runId)); }}
          onClose={closeRun}
        />
      )}
    </div>
  );
}
