import type { BugId } from "@/lib/bugs";

/**
 * Per-bug data for the "Fix with Kiro + Kane" run view.
 * `checks` and `symptom` are written in plain English for this panel; they are not copied from scripts/.
 * `before` and `after` are ILLUSTRATIVE one-line source changes that match what the flag changes in src/lib/bugs.tsx.
 */
export type BugFix = {
  /** What the Kane flow checks, in plain English. */
  checks: string;
  /** What the shop does wrong while the bug is planted. */
  symptom: string;
  file: string;
  /** The buggy line. */
  before: string;
  /** The fixed line. */
  after: string;
};

const SHELF = "src/components/ui/skincare-product-shelf.tsx";

export const BUG_FIXES: Record<BugId, BugFix> = {
  B01: {
    checks: "Add three of the same item, enter the three-for-ten code, and expect it to be accepted with 10% off those three.",
    symptom: "The code is refused when the order has exactly three items.",
    file: SHELF,
    before: '  if (v.minQty && qty <= v.minQty) return "buy at least " + v.minQty + " items";',
    after: '  if (v.minQty && qty < v.minQty) return "buy at least " + v.minQty + " items";',
  },
  B02: {
    checks: "Add six of the same item, enter the three-for-ten code, and expect only three of them to get 10% off.",
    symptom: "All six items get the discount, so the total comes out too low.",
    file: SHELF,
    before: '{ code: "BUY3SAVE10", percent: 10, minQty: 3, title: "10% off", /* ... */ },',
    after: '{ code: "BUY3SAVE10", percent: 10, minQty: 3, maxItems: 3, title: "10% off", /* ... */ },',
  },
  B03: {
    checks: "Add two of the same item, enter the welcome code, and expect only one of them to get 10% off. Then pay and check the receipt.",
    symptom: "Both items get the discount, so the total and the receipt are too low.",
    file: SHELF,
    before: '{ code: "WELCOME10", percent: 10, title: "10% off", /* ... */ },',
    after: '{ code: "WELCOME10", percent: 10, maxItems: 1, title: "10% off", /* ... */ },',
  },
  B04: {
    checks: "Pick the larger bottle size and expect the buy button to show the listed price for that size.",
    symptom: "The larger size is priced higher than it should be.",
    file: SHELF,
    before: "const price = p.price * (p.sizes.indexOf(size) > 0 ? 1.8 : 1);",
    after: "const price = p.price * (p.sizes.indexOf(size) > 0 ? 1.7 : 1);",
  },
  B05: {
    checks: "Press the quantity plus button once, expect the total for two items, pay, and expect the receipt to show the same total.",
    symptom: "One press adds two, so the quantity and the total are too high.",
    file: SHELF,
    before: "setQty((q) => Math.min(9, q + 2))",
    after: "setQty((q) => Math.min(9, q + 1))",
  },
  B06: {
    checks: "Build an order worth exactly 120 dollars, enter the flat 20-off code, and expect it to be accepted.",
    symptom: "The code is refused at exactly 120 dollars, because the minimum is one cent too high.",
    file: SHELF,
    before: '{ code: "SAVE20", amount: 20, minOrder: 120.01, title: "$20.00 off", /* ... */ },',
    after: '{ code: "SAVE20", amount: 20, minOrder: 120, title: "$20.00 off", /* ... */ },',
  },
  B07: {
    checks: "Enter a made-up code and expect it to be rejected, with the price left unchanged.",
    symptom: "The made-up code is accepted as a 10% voucher.",
    file: SHELF,
    before: "const v = VOUCHERS.find((x) => x.code === code) ?? looseVoucher(code);",
    after: "const v = VOUCHERS.find((x) => x.code === code);",
  },
  B08: {
    checks: "Enter the serum-only code on a product that is not a serum and expect it to be refused.",
    symptom: "The code is accepted on a product that is not a serum.",
    file: SHELF,
    before: '{ code: "SERUM15", percent: 15, maxItems: 1, title: "15% off", /* ... */ },',
    after: '{ code: "SERUM15", percent: 15, category: "Serum", maxItems: 1, title: "15% off", /* ... */ },',
  },
  B09: {
    checks: "Open a product and expect the price summary to list every line, including the discount line.",
    symptom: "The discount line is missing from the price summary.",
    file: SHELF,
    before: "{/* discount line not rendered */}",
    after: '<div className="flex justify-between gap-4"><dt>{discountLabel}</dt><dd>{discountValue}</dd></div>',
  },
  B10: {
    checks: "Open the vouchers dialog and expect the three-for-ten code to be listed with a note about its three-item limit.",
    symptom: "The note for that code is missing from the dialog.",
    file: SHELF,
    before: '{ code: "BUY3SAVE10", percent: 10, minQty: 3, maxItems: 3, /* no note */ },',
    after: '{ code: "BUY3SAVE10", percent: 10, minQty: 3, maxItems: 3, note: "(text about the 3-item limit)" },',
  },
};
