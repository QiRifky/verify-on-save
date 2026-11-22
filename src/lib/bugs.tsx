/**
 * Bug flags for the split-screen demo.
 *
 * Every bug is off by default. The shop reads the flags through `useBugs()` and applies them by
 * transforming its data (vouchers, size factor, quantity step) instead of rewriting its logic.
 * State lives in the URL as ?bugs=B01,B03 and is read once on load.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type BugId = "B01" | "B02" | "B03" | "B04" | "B05" | "B06" | "B07" | "B08" | "B09" | "B10";

export type BugDef = {
  id: BugId;
  /** One line, paraphrased so it never repeats an exact string a Kane flow checks. */
  title: string;
  /** Name of the Kane flow in scripts/verify.js that is expected to catch it. */
  flow: string;
};

export const BUGS: BugDef[] = [
  { id: "B01", title: "BUY3SAVE10 is rejected at exactly 3 items", flow: "promo-buy3" },
  { id: "B02", title: "BUY3SAVE10 takes 50% off the whole order", flow: "promo-buy6-three-items" },
  { id: "B03", title: "WELCOME10 makes the whole order cost nothing", flow: "promo-welcome-one-item" },
  { id: "B04", title: "The larger size costs less than the smaller one", flow: "size-price" },
  { id: "B05", title: "The quantity plus button adds 5 per tap", flow: "pay-quantity-total" },
  { id: "B06", title: "SAVE20 is refused for every order, however large", flow: "promo-flat-120" },
  { id: "B07", title: "Any junk promo text is accepted and takes 50% off", flow: "promo-invalid" },
  { id: "B08", title: "SERUM15 is accepted on every product and takes 50% off", flow: "promo-not-eligible" },
  { id: "B09", title: "The whole price summary block is hidden", flow: "price-summary" },
  { id: "B10", title: "The vouchers dialog loses the BUY3SAVE10 note", flow: "vouchers-popup" },
];

const IDS = new Set<string>(BUGS.map((b) => b.id));

/** Reads ?bugs=B01,B03. Unknown ids are ignored. */
export function parseBugs(search: string): BugId[] {
  const raw = new URLSearchParams(search).get("bugs");
  if (!raw) return [];
  const seen = new Set<BugId>();
  for (const part of raw.split(",")) {
    const id = part.trim().toUpperCase();
    if (IDS.has(id)) seen.add(id as BugId);
  }
  return BUGS.map((b) => b.id).filter((id) => seen.has(id));
}

function urlWith(active: BugId[]): string {
  const url = new URL(window.location.href);
  if (active.length) url.searchParams.set("bugs", active.join(","));
  else url.searchParams.delete("bugs");
  url.hash = "";
  return url.toString();
}

export type BugsApi = {
  active: BugId[];
  /** Stable string that changes whenever the set of planted bugs changes. */
  key: string;
  on: (id: BugId) => boolean;
  toggle: (id: BugId) => void;
  /** Switch one bug off (used when a fix run finishes). */
  off: (id: BugId) => void;
  reset: () => void;
  link: () => string;
};

const OFF: BugsApi = {
  active: [],
  key: "",
  on: () => false,
  toggle: () => {},
  off: () => {},
  reset: () => {},
  link: () => "",
};

const BugsContext = createContext<BugsApi>(OFF);

export function BugsProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<BugId[]>(() => parseBugs(window.location.search));

  // keep the address bar in step, without adding history entries
  useEffect(() => {
    window.history.replaceState(null, "", urlWith(active));
  }, [active]);

  const toggle = useCallback((id: BugId) => {
    setActive((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return BUGS.map((b) => b.id).filter((x) => next.has(x));
    });
  }, []);
  const off = useCallback((id: BugId) => setActive((cur) => cur.filter((x) => x !== id)), []);
  const reset = useCallback(() => setActive([]), []);

  const api = useMemo<BugsApi>(() => {
    const set = new Set(active);
    return {
      active,
      key: active.join(","),
      on: (id) => set.has(id),
      toggle,
      off,
      reset,
      link: () => urlWith(active),
    };
  }, [active, toggle, off, reset]);

  return <BugsContext.Provider value={api}>{children}</BugsContext.Provider>;
}

export const useBugs = () => useContext(BugsContext);

// ---------- how each bug changes the shop ----------

type VoucherShape = { code: string; percent?: number; maxItems?: number; minQty?: number; minOrder?: number; shownMinOrder?: number; category?: string; note?: string };

/** B01, B02, B03, B06, B08, B10: edits to the voucher data. B01 and B10 stay as recorded; the others are exaggerated on purpose. */
export function applyVoucherBugs<T extends VoucherShape>(list: T[], on: (id: BugId) => boolean): T[] {
  return list.map((v) => {
    const o: Partial<VoucherShape> = {};
    if (v.code === "BUY3SAVE10") {
      if (on("B01") && v.minQty !== undefined) o.minQty = v.minQty + 1; // the eligibility line itself stays untouched
      if (on("B02")) { o.percent = 50; o.maxItems = undefined; } // half off the whole order
      if (on("B10")) o.note = undefined;
    }
    if (v.code === "WELCOME10" && on("B03")) { o.percent = 100; o.maxItems = undefined; } // order becomes free
    if (v.code === "SAVE20" && on("B06") && v.minOrder !== undefined) { o.shownMinOrder = v.minOrder; o.minOrder = Infinity; } // refused always, message still quotes the real minimum
    if (v.code === "SERUM15" && on("B08")) { o.category = undefined; o.percent = 50; o.maxItems = undefined; } // any product, half off
    return Object.keys(o).length ? { ...v, ...o } : v;
  });
}

/** B07: any unknown text is accepted as a voucher worth 50% off the whole order. */
export function looseVoucher(code: string) {
  return { code, percent: 50, title: "50% off", condition: "Any order" };
}

/** B04: the price multiplier for a size. Normal shop: 1 for the first size, 1.7 for the others. With the bug, the larger size costs half. */
export function sizeFactor(on: (id: BugId) => boolean, index: number): number {
  if (on("B04") && index > 0) return 0.5;
  return index > 0 ? 1.7 : 1;
}

/** B05: how much the quantity plus button adds (the shop still caps the quantity at its maximum). */
export const qtyStep = (on: (id: BugId) => boolean) => (on("B05") ? 5 : 1);
