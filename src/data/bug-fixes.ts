import type { BugId } from "@/lib/bugs";

/**
 * Per-bug data for the "Fix with Kiro + Kane" run view and the "Try it" steps.
 * `checks`, `symptom` and `trySteps` are written in plain English for this panel; they are not copied from scripts/.
 * `before` and `after` are ILLUSTRATIVE one-line source changes that match what the flag changes in src/lib/bugs.tsx.
 * B02 and B04 behave exactly as in the recorded Kane runs. The other bugs are exaggerated on purpose.
 * Ids follow the voucher order of the panel: B01 to B10.
 */
export type BugFix = {
  /** What the Kane flow checks, in plain English. */
  checks: string;
  /** What the shop does wrong while the bug is planted. */
  symptom: string;
  /** Short steps to see the bug in the shop. The last one says what you should see. */
  trySteps: string[];
  file: string;
  /** The buggy line. */
  before: string;
  /** The fixed line. */
  after: string;
};

const SHELF = "src/components/ui/skincare-product-shelf.tsx";

export const BUG_FIXES: Record<BugId, BugFix> = {
  B01: {
    checks: "Add two of the same item, enter the welcome code, and expect only one of them to get 10% off. Then pay and check the receipt.",
    symptom: "The code makes the whole order free, so the total is 0.00.",
    trySteps: ["Pick any product.", "Type WELCOME10 into the promo field and apply it.", "You should see: the total becomes 0.00."],
    file: SHELF,
    before: '{ code: "WELCOME10", percent: 100, title: "10% off", /* ... */ },',
    after: '{ code: "WELCOME10", percent: 10, maxItems: 1, title: "10% off", /* ... */ },',
  },
  B02: {
    checks: "Add three of the same item, enter the three-for-ten code, and expect it to be accepted with 10% off those three.",
    symptom: "The code is refused when the order has exactly three items.",
    trySteps: ["Open Barrier Restore.", "Set the quantity to 3.", "Apply BUY3SAVE10.", "You should see: it is refused although 3 qualifies."],
    file: SHELF,
    before: '  if (v.minQty && qty <= v.minQty) return "buy at least " + v.minQty + " items";',
    after: '  if (v.minQty && qty < v.minQty) return "buy at least " + v.minQty + " items";',
  },
  B03: {
    checks: "Add six of the same item, enter the three-for-ten code, and expect only three of them to get 10% off.",
    symptom: "The code takes 50% off the whole order instead of 10% off three items.",
    trySteps: ["Open Barrier Restore.", "Set the quantity to 3.", "Apply BUY3SAVE10.", "You should see: the whole order gets half off."],
    file: SHELF,
    before: '{ code: "BUY3SAVE10", percent: 50, minQty: 3, title: "10% off", /* ... */ },',
    after: '{ code: "BUY3SAVE10", percent: 10, minQty: 3, maxItems: 3, title: "10% off", /* ... */ },',
  },
  B04: {
    checks: "Open the vouchers dialog and expect the three-for-ten code to be listed with a note about its three-item limit.",
    symptom: "The note for that code is missing from the dialog.",
    trySteps: ["Open any product.", "Open My vouchers.", "Look at the BUY3SAVE10 card.", "You should see: it has no explanatory note."],
    file: SHELF,
    before: '{ code: "BUY3SAVE10", percent: 10, minQty: 3, maxItems: 3, /* no note */ },',
    after: '{ code: "BUY3SAVE10", percent: 10, minQty: 3, maxItems: 3, note: "(text about the 3-item limit)" },',
  },
  B05: {
    checks: "Enter the serum-only code on a product that is not a serum and expect it to be refused.",
    symptom: "The serum code is accepted on every product and takes 50% off.",
    trySteps: ["Open Barrier Restore (a cream).", "Apply SERUM15.", "You should see: it is accepted with half off."],
    file: SHELF,
    before: '{ code: "SERUM15", percent: 50, title: "15% off", /* ... */ },',
    after: '{ code: "SERUM15", percent: 15, category: "Serum", maxItems: 1, title: "15% off", /* ... */ },',
  },
  B06: {
    checks: "Build an order worth exactly 120 dollars, enter the flat 20-off code, and expect it to be accepted.",
    symptom: "The code is refused for every order, however large, and the message still quotes the 120 dollar minimum.",
    trySteps: ["Open glazing milk.", "Set the quantity to 4.", "Apply SAVE20.", "You should see: it is refused, and so is any larger order."],
    file: SHELF,
    before: '{ code: "SAVE20", amount: 20, minOrder: Infinity, title: "$20.00 off", /* ... */ },',
    after: '{ code: "SAVE20", amount: 20, minOrder: 120, title: "$20.00 off", /* ... */ },',
  },
  B07: {
    checks: "Pick the larger bottle size and expect the buy button to show the listed price for that size.",
    symptom: "The larger size costs less than the smaller size, about half of the base price.",
    trySteps: ["Open any product that has two sizes.", "Pick the larger size.", "You should see: it costs less than the smaller one."],
    file: SHELF,
    before: "const price = p.price * (p.sizes.indexOf(size) > 0 ? 0.5 : 1);",
    after: "const price = p.price * (p.sizes.indexOf(size) > 0 ? 1.7 : 1);",
  },
  B08: {
    checks: "Press the quantity plus button once, expect the total for two items, pay, and expect the receipt to show the same total.",
    symptom: "One press adds five, so the quantity and the total jump.",
    trySteps: ["Open any product.", "Tap + once.", "You should see: the quantity jumps by 5."],
    file: SHELF,
    before: "setQty((q) => Math.min(9, q + 5))",
    after: "setQty((q) => Math.min(9, q + 1))",
  },
  B09: {
    checks: "Enter a made-up code and expect it to be rejected, with the price left unchanged.",
    symptom: "Any junk text is accepted as a code and takes 50% off the whole order.",
    trySteps: ["Open any product.", "Type any junk text as a promo code and apply it.", "You should see: it is accepted with half off."],
    file: SHELF,
    before: 'const v = VOUCHERS.find((x) => x.code === code) ?? { code, percent: 50, title: "50% off", condition: "Any order" };',
    after: "const v = VOUCHERS.find((x) => x.code === code);",
  },
  B10: {
    checks: "Open a product and expect the price summary to list every line, including the discount line.",
    symptom: "The whole price summary block is missing.",
    trySteps: ["Open any product.", "Look under the price.", "You should see: the price summary block is missing."],
    file: SHELF,
    before: "{/* price summary not rendered */}",
    after: '<dl className="mt-5 grid gap-1.5 text-[15px]">{/* summary rows */}</dl>',
  },
};

// ---------- display order for the "Plant a bug" list ----------

/**
 * One group of rows in the panel. `voucher` groups are headed by a voucher code; the last group is not.
 * Groups with no bugs yet are kept here so the voucher order stays visible, and are skipped when rendering.
 * With these ids the rows read B01 to B10 from top to bottom.
 */
export type BugGroup = { title: string; voucher: boolean; ids: readonly BugId[] };

export const BUG_GROUPS = [
  { title: "WELCOME10", voucher: true, ids: ["B01"] },
  { title: "BUY3SAVE10", voucher: true, ids: ["B02", "B03", "B04"] },
  { title: "BUY5SAVE15", voucher: true, ids: [] },
  { title: "SERUM15", voucher: true, ids: ["B05"] },
  { title: "SPF12", voucher: true, ids: [] },
  { title: "SAVE10", voucher: true, ids: [] },
  { title: "SAVE20", voucher: true, ids: ["B06"] },
  { title: "Not tied to a voucher", voucher: false, ids: ["B07", "B08", "B09", "B10"] },
] as const satisfies readonly BugGroup[];

// Type-level guarantee: every BugId appears in exactly one group. A missing or repeated id fails the type check.
type FlatIds<T> = T extends readonly [infer H, ...infer R]
  ? H extends { ids: infer I extends readonly string[] }
    ? [...I, ...FlatIds<R>]
    : never
  : [];
type FirstDuplicate<T extends readonly string[]> = T extends readonly [infer H extends string, ...infer R extends string[]]
  ? H extends R[number]
    ? H
    : FirstDuplicate<R>
  : never;
type MustBeTrue<T extends true> = T;
export type AllBugsGrouped = MustBeTrue<[Exclude<BugId, (typeof BUG_GROUPS)[number]["ids"][number]>] extends [never] ? true : false>;
export type NoBugGroupedTwice = MustBeTrue<[FirstDuplicate<FlatIds<typeof BUG_GROUPS>>] extends [never] ? true : false>;
