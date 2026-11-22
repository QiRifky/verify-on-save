/**
 * Bug flags for the split-screen demo.
 *
 * Every bug is off by default. The shop reads the flags through `useBugs()` and applies them by
 * transforming its data (vouchers, size factor, quantity step) instead of rewriting its logic.
 * State lives in the URL as ?bugs=B01,B03 and is read once on load.
 *
 * By default one bug is planted at a time: switching one on switches the others off.
 * "Allow several at once" (`multi`) lifts that. It starts on when the page loads with several ids in ?bugs=.
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
  { id: "B01", title: "WELCOME10 makes the whole order cost nothing", flow: "promo-welcome-one-item" },
  { id: "B02", title: "BUY3SAVE10 is rejected at exactly 3 items", flow: "promo-buy3" },
  { id: "B03", title: "BUY3SAVE10 takes 50% off the whole order", flow: "promo-buy6-three-items" },
  { id: "B04", title: "The vouchers dialog loses the BUY3SAVE10 note", flow: "vouchers-popup" },
  { id: "B05", title: "SERUM15 is accepted on every product and takes 50% off", flow: "promo-not-eligible" },
  { id: "B06", title: "SAVE20 is refused for every order, however large", flow: "promo-flat-120" },
  { id: "B07", title: "The larger size costs less than the smaller one", flow: "size-price" },
  { id: "B08", title: "The quantity plus button adds 5 per tap", flow: "pay-quantity-total" },
  { id: "B09", title: "Any junk promo text is accepted and takes 50% off", flow: "promo-invalid" },
  { id: "B10", title: "The whole price summary block is hidden", flow: "price-summary" },
];

const IDS = new Set<string>(BUGS.map((b) => b.id));
const inOrder = (set: Set<BugId>): BugId[] => BUGS.map((b) => b.id).filter((id) => set.has(id));

/** Reads ?bugs=B01,B03. Unknown ids are ignored. */
export function parseBugs(search: string): BugId[] {
  const raw = new URLSearchParams(search).get("bugs");
  if (!raw) return [];
  const seen = new Set<BugId>();
  for (const part of raw.split(",")) {
    const id = part.trim().toUpperCase();
    if (IDS.has(id)) seen.add(id as BugId);
  }
  return inOrder(seen);
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
  /** True when several bugs may be planted at once. */
  multi: boolean;
  /** Turning it off keeps only the first planted bug. */
  setMulti: (value: boolean) => void;
};

const OFF: BugsApi = {
  active: [],
  key: "",
  on: () => false,
  toggle: () => {},
  off: () => {},
  reset: () => {},
  link: () => "",
  multi: false,
  setMulti: () => {},
};

const BugsContext = createContext<BugsApi>(OFF);

export function BugsProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<BugId[]>(() => parseBugs(window.location.search));
  const [multi, setMultiState] = useState(() => parseBugs(window.location.search).length > 1);

  // keep the address bar in step, without adding history entries
  useEffect(() => {
    window.history.replaceState(null, "", urlWith(active));
  }, [active]);

  const toggle = useCallback((id: BugId) => {
    setActive((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      return multi ? inOrder(new Set([...cur, id])) : [id]; // one at a time by default
    });
  }, [multi]);
  const off = useCallback((id: BugId) => setActive((cur) => cur.filter((x) => x !== id)), []);
  const reset = useCallback(() => setActive([]), []);
  const setMulti = useCallback((value: boolean) => {
    setMultiState(value);
    if (!value) setActive((cur) => cur.slice(0, 1));
  }, []);

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
      multi,
      setMulti,
    };
  }, [active, toggle, off, reset, multi, setMulti]);

  return <BugsContext.Provider value={api}>{children}</BugsContext.Provider>;
}

export const useBugs = () => useContext(BugsContext);

// ---------- how each bug changes the shop ----------

type VoucherShape = { code: string; percent?: number; maxItems?: number; minQty?: number; minOrder?: number; shownMinOrder?: number; category?: string; note?: string };

/** B01 to B06 edit the voucher data. B02 and B04 stay as recorded; the others are exaggerated on purpose. */
export function applyVoucherBugs<T extends VoucherShape>(list: T[], on: (id: BugId) => boolean): T[] {
  return list.map((v) => {
    const o: Partial<VoucherShape> = {};
    if (v.code === "BUY3SAVE10") {
      if (on("B02") && v.minQty !== undefined) o.minQty = v.minQty + 1; // the eligibility line itself stays untouched
      if (on("B03")) { o.percent = 50; o.maxItems = undefined; } // half off the whole order
      if (on("B04")) o.note = undefined;
    }
    if (v.code === "WELCOME10" && on("B01")) { o.percent = 100; o.maxItems = undefined; } // order becomes free
    if (v.code === "SAVE20" && on("B06") && v.minOrder !== undefined) { o.shownMinOrder = v.minOrder; o.minOrder = Infinity; } // refused always, message still quotes the real minimum
    if (v.code === "SERUM15" && on("B05")) { o.category = undefined; o.percent = 50; o.maxItems = undefined; } // any product, half off
    return Object.keys(o).length ? { ...v, ...o } : v;
  });
}

/** B09: any unknown text is accepted as a voucher worth 50% off the whole order. */
export function looseVoucher(code: string) {
  return { code, percent: 50, title: "50% off", condition: "Any order" };
}

/** B07: the price multiplier for a size. Normal shop: 1 for the first size, 1.7 for the others. With the bug, the larger size costs half. */
export function sizeFactor(on: (id: BugId) => boolean, index: number): number {
  if (on("B07") && index > 0) return 0.5;
  return index > 0 ? 1.7 : 1;
}

/** B08: how much the quantity plus button adds (the shop still caps the quantity at its maximum). */
export const qtyStep = (on: (id: BugId) => boolean) => (on("B08") ? 5 : 1);
