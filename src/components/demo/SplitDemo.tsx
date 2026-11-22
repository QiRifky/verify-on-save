import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { ProductShelf } from "@/components/ui/skincare-product-shelf";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { useBugs } from "@/lib/bugs";

/**
 * Split screen: the shop on the left, the demo panel on the right. Both panes are collapsible.
 *
 * One state, `view`: "split" (default), "shop" (panel collapsed) or "panel" (shop collapsed). It can never hide both.
 * BOTH PANES STAY MOUNTED. A hidden pane only has its grid column collapsed (and, once collapsed, visibility:hidden),
 * plus inert + aria-hidden so it leaves the tab order and the accessibility tree. The shop's state (open product page,
 * size, quantity, promo, receipt), the bug flags and the panel's tab, scroll and run view all survive.
 *
 * Under 900px there is a single pane. "split" behaves as "shop" there, and the Shop/Panel switch at the top is the control.
 * The view is kept in the URL as ?view=shop|panel (omitted for "split"), next to ?bugs= and ?tab=.
 */
type View = "split" | "shop" | "panel";

const COLUMNS: Record<View, string> = { split: "1fr 1fr", shop: "1fr 0fr", panel: "0fr 1fr" };
const SHOP_ID = "shop-pane";
const PANEL_ID = "demo-panel-pane";
const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]";

function initialView(): View {
  const v = new URLSearchParams(window.location.search).get("view");
  return v === "shop" || v === "panel" ? v : "split"; // anything else falls back to split
}

function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setOn(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return on;
}

type FocusTarget = "showPanel" | "showShop" | "hidePanel" | "hideShop" | "switch";

export function SplitDemo() {
  const bugs = useBugs();
  const wide = useMedia("(min-width: 900px)");
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const [view, setView] = useState<View>(initialView);
  const [dialogOpen, setDialogOpen] = useState(false); // the run view is open inside the panel
  const [settled, setSettled] = useState(true); // the column change has finished
  const [announce, setAnnounce] = useState("");
  const n = bugs.active.length;

  // what is actually on screen. Under 900px only one pane shows, so "split" means "shop" there.
  const eff: View = wide ? view : view === "panel" ? "panel" : "shop";
  const shopHidden = eff === "panel";
  const panelHidden = eff === "shop";

  const shopRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const refs = {
    showPanel: useRef<HTMLButtonElement>(null),
    showShop: useRef<HTMLButtonElement>(null),
    hidePanel: useRef<HTMLButtonElement>(null),
    hideShop: useRef<HTMLButtonElement>(null),
    switch: useRef<HTMLButtonElement>(null),
  };
  const pendingFocus = useRef<FocusTarget | null>(null);

  const change = (next: View, message: string, focus: FocusTarget | null) => {
    pendingFocus.current = focus;
    setView(next);
    setAnnounce(message);
  };

  // keep ?view= in step with the state, without dropping ?bugs= or ?tab=
  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === "split") url.searchParams.delete("view");
    else url.searchParams.set("view", view);
    window.history.replaceState(null, "", url.toString());
  }, [view]);

  // a hidden pane gets visibility:hidden only once its column has finished collapsing
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSettled(false);
    const t = window.setTimeout(() => setSettled(true), !wide || reduce ? 0 : 300);
    return () => window.clearTimeout(t);
  }, [eff, wide, reduce]);

  // focus: go where the user expects, and never leave it inside a hidden pane
  useEffect(() => {
    const want = pendingFocus.current;
    pendingFocus.current = null;
    if (want) { refs[want].current?.focus(); return; }
    const ae = document.activeElement;
    if (!ae) return;
    if (shopHidden && shopRef.current?.contains(ae)) (refs.showShop.current ?? refs.switch.current)?.focus();
    if (panelHidden && panelRef.current?.contains(ae)) (refs.showPanel.current ?? refs.switch.current)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eff]);

  const gridStyle: CSSProperties = { gridTemplateColumns: COLUMNS[eff] };
  const hiddenStyle = (hidden: boolean): CSSProperties | undefined => (hidden && settled ? { visibility: "hidden" } : undefined);
  // the divider is a real border on the panel, so it moves with the panel while the columns animate.
  // It shows in the split view (and while a column is still animating), never when one pane is hidden.
  const showLine = wide && (eff === "split" || !settled);
  const hideTitle = dialogOpen ? "Close the run view first" : undefined;

  return (
    <div className="flex h-dvh w-full flex-col">
      {/* under 900px: the control that picks the pane */}
      <div role="group" aria-label="Switch view" className="flex shrink-0 gap-1 border-b border-[#d9d4cd] bg-[#f3f1ed] p-1.5 min-[900px]:hidden">
        {(["shop", "panel"] as const).map((v) => (
          <button
            key={v}
            ref={v === eff ? refs.switch : undefined}
            type="button"
            aria-pressed={eff === v}
            aria-controls={v === "shop" ? SHOP_ID : PANEL_ID}
            onClick={() => change(v, v === "shop" ? "Showing the shop." : "Showing the panel.", null)}
            className={`h-10 flex-1 rounded-md text-[14px] font-medium ${RING} ${eff === v ? "bg-[#111111] text-white" : "border border-[#d9d4cd] bg-white text-[#111111]"}`}
          >
            {v === "shop" ? "Shop" : "Panel"}
          </button>
        ))}
      </div>

      {/* the two panes share one grid; collapsing a pane animates its column to 0fr */}
      <div
        className={`relative grid min-h-0 flex-1 ${wide ? "transition-[grid-template-columns] duration-[250ms] ease-in-out motion-reduce:transition-none" : ""}`}
        style={gridStyle}
      >
        {/*
          The transform makes this box the containing block for the shop's fixed layers
          (wordmark, product page, dialogs), so they fill the shop pane and not the whole window.
        */}
        <div
          id={SHOP_ID}
          ref={shopRef}
          inert={shopHidden}
          aria-hidden={shopHidden || undefined}
          style={hiddenStyle(shopHidden)}
          className="relative min-h-0 min-w-0 overflow-hidden [transform:translateZ(0)]"
        >
          <div className="absolute inset-0 overflow-y-auto">
            <ProductShelf className="min-h-full" />
          </div>
          {n > 0 && (
            <div
              role="status"
              className="pointer-events-none absolute bottom-3 left-3 z-[60] rounded-full bg-[#0a0b0d]/90 px-3 py-1 text-[12px] font-medium text-[#ff6b5b] ring-1 ring-[#ff6b5b]/50"
            >
              {n} {n === 1 ? "bug" : "bugs"} planted
            </div>
          )}
        </div>

        <aside
          id={PANEL_ID}
          ref={panelRef}
          aria-label="Demo panel"
          inert={panelHidden}
          aria-hidden={panelHidden || undefined}
          style={hiddenStyle(panelHidden)}
          className={`relative z-10 min-h-0 min-w-0 overflow-hidden bg-[#f3f1ed] ${showLine ? "border-l border-[#c9c3ba] shadow-[-1px_0_0_rgba(0,0,0,0.04),-12px_0_24px_-16px_rgba(0,0,0,0.12)]" : ""}`}
        >
          <DemoPanel onShowShop={() => change("shop", "Showing the shop.", null)} onRunChange={setDialogOpen} />
        </aside>

        {wide && eff === "split" && (
          <div role="group" aria-label="Pane controls" className="absolute top-1/2 left-[calc(50%+0.5px)] z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1 rounded-lg border border-[#c9c3ba] bg-white p-1">
            <button
              ref={refs.hideShop}
              type="button"
              aria-label="Hide the shop"
              title={hideTitle ?? "Hide the shop"}
              aria-expanded
              aria-controls={SHOP_ID}
              disabled={dialogOpen}
              onClick={() => change("panel", "Shop hidden. The panel fills the screen.", "showShop")}
              className={`grid size-8 place-items-center rounded-md text-[#111111] hover:bg-[#f3f1ed] disabled:cursor-not-allowed disabled:text-[#8f8982] ${RING}`}
            >
              <PanelLeftClose className="size-4" aria-hidden />
            </button>
            <button
              ref={refs.hidePanel}
              type="button"
              aria-label="Hide the panel"
              title={hideTitle ?? "Hide the panel"}
              aria-expanded
              aria-controls={PANEL_ID}
              disabled={dialogOpen}
              onClick={() => change("shop", "Panel hidden. The shop fills the screen.", "showPanel")}
              className={`grid size-8 place-items-center rounded-md text-[#111111] hover:bg-[#f3f1ed] disabled:cursor-not-allowed disabled:text-[#8f8982] ${RING}`}
            >
              <PanelRightClose className="size-4" aria-hidden />
            </button>
          </div>
        )}

        {wide && eff === "shop" && (
          <button
            ref={refs.showPanel}
            type="button"
            aria-expanded={false}
            aria-controls={PANEL_ID}
            onClick={() => change("split", "Split view restored.", "hidePanel")}
            className={`absolute top-1/2 right-0 z-50 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 border-[#111111] bg-[#111111] px-2.5 py-3 text-[12px] font-medium text-white ${RING}`}
          >
            <PanelRightOpen className="size-4" aria-hidden />
            Show panel
            {n > 0 && (
              <span className="rounded-full bg-[#b3261e] px-1.5 py-px font-mono text-[11px] leading-4 font-semibold text-white">
                <span aria-hidden>{n}</span>
                <span className="sr-only">{n} planted</span>
              </span>
            )}
          </button>
        )}

        {wide && eff === "panel" && (
          <button
            ref={refs.showShop}
            type="button"
            aria-expanded={false}
            aria-controls={SHOP_ID}
            onClick={() => change("split", "Split view restored.", "hideShop")}
            className={`absolute top-1/2 left-0 z-50 flex -translate-y-1/2 items-center gap-1.5 rounded-r-lg border border-l-0 border-[#111111] bg-[#111111] px-2.5 py-3 text-[12px] font-medium text-white ${RING}`}
          >
            <PanelLeftOpen className="size-4" aria-hidden />
            Show shop
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
    </div>
  );
}
