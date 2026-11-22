import { useState } from "react";
import { ProductShelf } from "@/components/ui/skincare-product-shelf";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { useBugs } from "@/lib/bugs";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ecbff]";

/**
 * Split screen: the shop on the left, the demo panel on the right.
 * Under 900px the two stack and a switch at the top chooses which one is on screen.
 */
export function SplitDemo() {
  const bugs = useBugs();
  const [view, setView] = useState<"shop" | "panel">("shop");
  const n = bugs.active.length;

  return (
    <div className="flex h-dvh w-full flex-col min-[900px]:flex-row">
      <div role="group" aria-label="Switch view" className="flex shrink-0 gap-1 bg-[#0a0b0d] p-1.5 min-[900px]:hidden">
        {(["shop", "panel"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`h-10 flex-1 rounded-md text-[14px] font-medium ${FOCUS} ${view === v ? "bg-[#e8eaed] text-[#0a0b0d]" : "bg-[#14161a] text-[#c5cad2]"}`}
          >
            {v === "shop" ? "Shop" : "Panel"}
          </button>
        ))}
      </div>

      {/*
        The transform makes this box the containing block for the shop's fixed layers
        (wordmark, product page, dialogs), so they fill the left half and not the whole window.
      */}
      <div className={`relative min-h-0 min-w-0 flex-1 overflow-hidden [transform:translateZ(0)] ${view === "panel" ? "hidden" : ""} min-[900px]:block min-[900px]:basis-1/2`}>
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
        aria-label="Demo panel"
        className={`min-h-0 min-w-0 flex-1 border-t border-[#24272d] bg-[#0a0b0d] min-[900px]:basis-1/2 min-[900px]:border-t-0 min-[900px]:border-l ${view === "shop" ? "hidden" : ""} min-[900px]:block`}
      >
        <DemoPanel />
      </aside>
    </div>
  );
}
