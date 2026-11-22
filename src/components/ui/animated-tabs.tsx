/**
 * Animated pill tabs, adapted from the Aceternity "animated tabs" idea for this app.
 *
 * - A highlight pill slides between tabs (layoutId, spring). The bar has its own LayoutGroup, so it cannot
 *   clash with the shop's layout animations.
 * - Only the active tab's content is rendered, in normal flow. It enters with a short slide and fade,
 *   and the pane scrolls back to the top on every change.
 * - Two decorative strips above the content card hint at the tabs behind it. They are aria-hidden and
 *   ignore the pointer. The hover fan-out and negative z-index stacking of the reference are left out on purpose.
 * - The height of the sticky bar is published as --vos-tabbar-h, so content inside can stick right below it.
 * - Colours come from the demo panel's scoped variables (.vos-panel in index.css).
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type AnimatedTab = {
  value: string;
  title: string;
  /** Small coral badge next to the title. Leave undefined to hide it. */
  badge?: ReactNode;
  content: ReactNode;
};

export type AnimatedTabsProps = {
  tabs: AnimatedTab[];
  /** Uncontrolled start value. Defaults to the first tab. */
  defaultValue?: string;
  /** Controlled value. When set, the parent decides which tab is active. */
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  /** Applied to the centred column inside the bar and the content (for example a max width). */
  innerClassName?: string;
  contentClassName?: string;
};

const PILL_SPRING = { type: "spring" as const, bounce: 0.3, duration: 0.5 };

export function AnimatedTabs({ tabs, defaultValue, value, onChange, className, innerClassName, contentClassName }: AnimatedTabsProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduce = useReducedMotion();
  const [inner, setInner] = useState(defaultValue ?? tabs[0]?.value ?? "");
  const active = value ?? inner;
  const activeTab = tabs.find((t) => t.value === active) ?? tabs[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };

  // publish the bar height, so sticky content can sit right under it
  useLayoutEffect(() => {
    const root = scrollRef.current;
    const bar = barRef.current;
    if (!root || !bar) return;
    const set = () => root.style.setProperty("--vos-tabbar-h", `${bar.getBoundingClientRect().height}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // back to the top whenever the tab changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab?.value]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.value === activeTab.value);
    const n = tabs.length;
    const next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" ? 1 : n - 1)) % n;
    select(tabs[next].value);
    btnRefs.current[tabs[next].value]?.focus();
  };

  if (!activeTab) return null;
  const tabId = (v: string) => `${uid}-tab-${v}`;
  const panelId = `${uid}-panel-${activeTab.value}`;

  return (
    <div ref={scrollRef} className={cn("relative min-h-0 overflow-x-hidden overflow-y-auto", className)}>
      {/* sticky bar: opaque, so scrolling content never shows through */}
      <div ref={barRef} className="sticky top-0 z-20 border-b border-(--vos-line-strong) bg-(--vos-bg) px-5 py-2.5">
        <LayoutGroup id={`${uid}-pill`}>
          <div className={cn("mx-auto w-full", innerClassName)}>
          <div
            role="tablist"
            aria-label="Demo panel"
            className="flex max-w-full gap-1 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((t) => {
              const sel = t.value === activeTab.value;
              return (
                <button
                  key={t.value}
                  ref={(el) => { btnRefs.current[t.value] = el; }}
                  type="button"
                  role="tab"
                  id={tabId(t.value)}
                  aria-selected={sel}
                  aria-controls={sel ? panelId : undefined}
                  tabIndex={sel ? 0 : -1}
                  onClick={() => select(t.value)}
                  onKeyDown={onKey}
                  className={cn(
                    "relative shrink-0 rounded-full px-4 py-1.5 text-[13px] whitespace-nowrap transition-colors",
                    sel ? "font-semibold text-(--vos-text)" : "text-(--vos-muted) hover:text-(--vos-text)",
                  )}
                >
                  {sel && (
                    <motion.span
                      layoutId="vos-tab-pill"
                      aria-hidden
                      transition={reduce ? { duration: 0 } : PILL_SPRING}
                      className="absolute inset-0 rounded-full border border-(--vos-line-strong) bg-(--vos-raised) shadow-sm"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    {t.title}
                    {t.badge !== undefined && t.badge !== null && t.badge !== false && (
                      <span className="rounded-full bg-(--vos-coral) px-1.5 py-px font-mono text-[11px] leading-4 font-semibold text-white">
                        {t.badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          </div>
        </LayoutGroup>
      </div>

      <div className="px-5 pt-3 pb-5">
       <div className={cn("mx-auto w-full", innerClassName)}>
        {/* stack hint: decorative strips for the tabs "behind" the card. Never focusable, never clickable. */}
        <div aria-hidden className="pointer-events-none hidden select-none sm:block">
          <div className="mx-8 h-1.5 rounded-t-xl border border-b-0 border-(--vos-line-strong) bg-(--vos-raised) opacity-50" />
          <div className="mx-4 h-1.5 rounded-t-xl border border-b-0 border-(--vos-line-strong) bg-(--vos-raised) opacity-80" />
        </div>
        <motion.div
          key={activeTab.value}
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(activeTab.value)}
          tabIndex={0}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
          className={cn("rounded-xl border border-(--vos-line-strong) bg-(--vos-raised) p-4 sm:rounded-t-xl", contentClassName)}
        >
          {activeTab.content}
        </motion.div>
       </div>
      </div>
    </div>
  );
}
