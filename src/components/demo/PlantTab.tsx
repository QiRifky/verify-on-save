import { useLayoutEffect, useRef, useState } from "react";
import { BUGS, useBugs, type BugDef, type BugId } from "@/lib/bugs";
import { BUG_FIXES, BUG_GROUPS } from "@/data/bug-fixes";
import { RECORDED, verdictOf } from "@/data/recorded";
import { cn } from "@/lib/utils";
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from "@/components/ui/code-block";
import { BTN, BTN_PRIMARY, CopyButton } from "@/components/demo/shared";

const BUG_BY_ID = Object.fromEntries(BUGS.map((b) => [b.id, b])) as Record<BugId, BugDef>;

type Filter = "all" | "planted" | "recorded";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "planted", label: "Planted" },
  { id: "recorded", label: "Real Kane run" },
];

/** Collapsed by default. The code block is only mounted once opened, so highlighting loads on demand. */
function RecordedRun({ id }: { id: BugId }) {
  const [open, setOpen] = useState(false);
  const r = RECORDED[id];
  if (!r) return <p className="border-t border-(--vos-line) px-3 py-2 text-[12px] text-(--vos-muted)">No recorded run yet</p>;
  const verdict = verdictOf(r);
  const json = JSON.stringify(
    { flow: r.flow, status: r.status, reason_code: r.reason_code, summary: r.summary, time: r.time },
    null,
    2,
  );
  return (
    <details className="border-t border-(--vos-line)" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-[12px] text-(--vos-soft)">
        <span>Recorded Kane run</span>
        <span className="rounded-full border border-(--vos-green)/40 bg-(--vos-green)/10 px-2 py-0.5 text-[11px] text-(--vos-green)">
          real Kane CLI run
        </span>
        {verdict && (
          <span className={cn("font-semibold", verdict === "caught" ? "text-(--vos-green)" : "text-(--vos-coral)")}>{verdict}</span>
        )}
      </summary>
      {open && (
        <div className="px-3 pb-3">
          <CodeBlock>
            <CodeBlockGroup language="json" filename={`recorded-runs.json · ${id}`} code={json}>
              <span className="rounded-full border border-(--vos-dk-green)/40 bg-(--vos-dk-green)/10 px-2 py-0.5 text-[11px] text-(--vos-dk-green)">
                real Kane CLI run
              </span>
            </CodeBlockGroup>
            <CodeBlockCode code={json} language="json" />
          </CodeBlock>
        </div>
      )}
    </details>
  );
}

/** Large switch with the words On and Off, so state never relies on colour alone. */
function BugSwitch({ on, labelledBy, onClick, refCb }: { on: boolean; labelledBy: string; onClick: () => void; refCb: (el: HTMLButtonElement | null) => void }) {
  return (
    <button
      ref={refCb}
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "relative h-9 w-[76px] shrink-0 rounded-full border text-[12px] font-semibold transition-colors",
        on ? "border-(--vos-coral) bg-(--vos-coral) text-white" : "border-(--vos-line-strong) bg-(--vos-raised) text-(--vos-soft)",
      )}
    >
      <span className={cn("absolute top-1/2 -translate-y-1/2", on ? "left-3" : "right-3")}>{on ? "On" : "Off"}</span>
      <span
        aria-hidden
        className={cn(
          "absolute top-1 size-7 rounded-full shadow transition-all",
          on ? "right-1 bg-white" : "left-1 bg-(--vos-primary)",
        )}
      />
    </button>
  );
}

export type PlantTabProps = {
  fixed: Set<BugId>;
  onToggle: (id: BugId) => void;
  onReset: () => void;
  onFix: (id: BugId) => void;
  /** Lets the panel return focus to a row's controls when the run view closes. */
  setRef: (key: string, el: HTMLButtonElement | null) => void;
  /** Narrow screens only: switch to the shop pane. */
  onShowShop?: () => void;
};

export function PlantTab({ fixed, onToggle, onReset, onFix, setRef, onShowShop }: PlantTabProps) {
  const bugs = useBugs();
  const [filter, setFilter] = useState<Filter>("all");
  const rootRef = useRef<HTMLDivElement>(null);
  const sumRef = useRef<HTMLDivElement>(null);
  const planted = bugs.active.length;

  // publish the summary bar height, so group headings can stick right under it
  useLayoutEffect(() => {
    const root = rootRef.current;
    const bar = sumRef.current;
    if (!root || !bar) return;
    const set = () => root.style.setProperty("--vos-sum-h", `${bar.getBoundingClientRect().height}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  const matches = (id: BugId) => filter === "all" || (filter === "planted" ? bugs.on(id) : Boolean(RECORDED[id]));

  return (
    <div ref={rootRef}>
      <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Plant a bug, then see which check catches it</h2>
      <p className="mt-3 rounded-md border border-(--vos-line) bg-(--vos-subtle) p-3 text-[13px] leading-relaxed text-(--vos-soft)">
        Toggles change this live app. Verdicts are recorded from real Kane CLI runs on my machine; Kane itself does not run in your browser.
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-(--vos-muted)">
        These planted bugs are exaggerated on purpose so they are easy to see. Real bugs are usually subtler.
      </p>

      {/* sticky summary bar */}
      <div
        ref={sumRef}
        className="sticky top-[var(--vos-tabbar-h,3.75rem)] z-10 -mx-4 mt-4 border-y border-(--vos-line-strong) bg-(--vos-raised) px-4 py-2.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-[13px] text-(--vos-soft)" aria-live="polite">
            <span className={cn("font-mono text-[15px] font-semibold", planted ? "text-(--vos-coral)" : "text-(--vos-text)")}>{planted}</span> planted
          </p>
          <button type="button" onClick={onReset} disabled={planted === 0} className={BTN}>Reset all</button>
          <CopyButton label="Copy link" done="Link copied" getText={bugs.link} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div role="group" aria-label="Show" className="inline-flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] transition-colors",
                  filter === f.id
                    ? "border-(--vos-primary) bg-(--vos-primary) text-(--vos-on-primary)"
                    : "border-(--vos-line-strong) bg-(--vos-raised) text-(--vos-soft) hover:border-(--vos-muted)",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-(--vos-soft)">
            <input
              type="checkbox"
              checked={bugs.multi}
              onChange={(e) => bugs.setMulti(e.target.checked)}
              className="size-4 accent-(--vos-primary)"
            />
            Allow several at once
          </label>
        </div>
      </div>

      {BUG_GROUPS.filter((g) => g.ids.length > 0).map((g) => {
        const headingId = `group-${g.title.replace(/\W+/g, "-")}`;
        const shown = g.ids.filter(matches);
        return (
          <section key={g.title} aria-labelledby={headingId} className="mt-4">
            <h3
              id={headingId}
              className="sticky top-[calc(var(--vos-tabbar-h,3.75rem)+var(--vos-sum-h,5rem))] z-[5] -mx-4 mb-2 border-b border-(--vos-line) bg-(--vos-raised) px-4 py-1.5 text-[12px] text-(--vos-muted)"
            >
              <span className={g.voucher ? "font-mono" : ""}>{g.title}</span>
              <span className="ml-2">· {g.ids.length} {g.ids.length === 1 ? "bug" : "bugs"}</span>
            </h3>
            {shown.length === 0 && <p className="px-1 py-2 text-[12px] text-(--vos-muted)">No bugs here match this filter.</p>}
            <ul className="grid gap-3">
              {shown.map((id) => {
                const b = BUG_BY_ID[id];
                const on = bugs.on(b.id);
                const isFixed = fixed.has(b.id) && !on;
                const labelId = `bug-${b.id}-label`;
                const steps = BUG_FIXES[b.id].trySteps;
                return (
                  <li
                    key={b.id}
                    className={cn(
                      "overflow-hidden rounded-lg border transition-colors duration-200",
                      on ? "border-(--vos-coral-fill) bg-(--vos-coral-fill)/[0.06]" : "border-(--vos-line-strong) bg-(--vos-subtle)",
                    )}
                  >
                    {/* the whole header is clickable; the switch is the keyboard control */}
                    <div onClick={() => onToggle(b.id)} className="flex cursor-pointer items-center gap-3 p-3">
                      <span
                        aria-hidden
                        className={cn("size-2.5 shrink-0 rounded-full", on ? "bg-(--vos-coral-fill)" : isFixed ? "bg-(--vos-green)" : "bg-(--vos-line-strong)")}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className={cn("font-mono text-[13px] font-semibold", on ? "text-(--vos-coral)" : "text-(--vos-text)")}>{b.id}</span>
                          <span id={labelId} className="text-[14px] leading-snug text-(--vos-text)">{b.title}</span>
                        </div>
                        <p className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="inline-block rounded-full border border-(--vos-green)/40 bg-(--vos-green)/10 px-2.5 py-0.5 text-[12px] text-(--vos-green)">
                            {RECORDED[b.id] ? "caught by" : "expected to be caught by"} <span className="font-mono">{b.flow}</span>
                          </span>
                          {isFixed && (
                            <span className="inline-block rounded-full border border-(--vos-green) px-2.5 py-0.5 text-[12px] font-semibold text-(--vos-green)">Fixed</span>
                          )}
                        </p>
                      </div>
                      <BugSwitch on={on} labelledBy={labelId} onClick={() => onToggle(b.id)} refCb={(el) => setRef(`toggle-${b.id}`, el)} />
                    </div>

                    {on && (
                      <div className="border-t border-(--vos-coral-fill)/30 px-3 pt-2.5 pb-3">
                        <p className="text-[12px] font-semibold text-(--vos-text)">Try it</p>
                        <ol className="mt-1 list-decimal pl-5 text-[13px] leading-relaxed text-(--vos-soft)">
                          {steps.map((s, i) => (
                            <li key={i} className={i === steps.length - 1 ? "font-medium text-(--vos-text)" : ""}>{s}</li>
                          ))}
                        </ol>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button ref={(el) => setRef(`fix-${b.id}`, el)} type="button" onClick={() => onFix(b.id)} className={BTN_PRIMARY}>
                            Fix with Kiro + Kane
                          </button>
                          {onShowShop && (
                            <button type="button" onClick={onShowShop} className={cn(BTN, "min-[900px]:hidden")}>
                              Show the shop
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <RecordedRun id={b.id} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
