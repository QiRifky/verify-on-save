# Verify-on-Save

A drop-in template that closes the loop between an AI coding agent and Kane CLI: the agent changes code, Kane verifies it in a real browser, and the agent reads Kane's report and fixes what failed, until everything passes.

Built for the KaneCLI Online Hackathon with Kiro.

The demo app is **Skasman**, a small skincare shop: a product shelf, size and quantity pickers, a price summary, a pay button with a receipt, and a "My vouchers" popup with promo-code rules. Voucher math is exactly the kind of logic where a one-character bug looks fine at a glance.

**Try it:** open the [live demo](https://verify-on-save.vercel.app/), plant a bug on the right and see which Kane flow is expected to catch it. Details in [Live demo: plant a bug](#live-demo-plant-a-bug).

## How it works

![Workflow](docs/verify-on-save-swimlane.png)

1. The agent (Kiro) edits the app.
2. A steering rule tells it to run `node scripts/verify.js`.
3. The script runs plain-English Kane flows against `http://127.0.0.1:3000` and writes `.verify/last-result.json`, which also records the tested commit, whether the working tree was dirty, which flows ran, and whether it was the full suite.
4. If a flow fails, the agent reads Kane's `reason_code` and `summary`, fixes the cause, and re-runs (max 5 cycles).
5. It may report "done" only after a passing result.

An optional Kiro hook (`.kiro/hooks/verify-with-kane.json`) can re-run the check after the agent edits source files. Note: Kiro file hooks react to changes made by the agent, not to manual saves.

## What Kane checks

Ten plain-English flows in `scripts/verify.js`:

| Flow | What it proves |
|---|---|
| `size-price` | Choosing 100 ml changes the pay button to $49.30 |
| `pay-quantity-total` | Quantity 2 gives Pay $58.00 and a receipt with the same total |
| `price-summary` | Subtotal, Discount, Shipping and Total are always visible |
| `vouchers-popup` | The "My vouchers" dialog lists codes with their notes |
| `promo-welcome-one-item` | WELCOME10 discounts only 1 item |
| `promo-flat-120` | SAVE20 takes a flat $20.00 off an order of $120.00 or more |
| `promo-invalid` | A wrong code is rejected and the price is unchanged |
| `promo-not-eligible` | A serum code is refused for a non-serum product |
| `promo-buy3` | BUY3SAVE10 is accepted at exactly 3 items |
| `promo-buy6-three-items` | With 6 items, only 3 get 10% off |

You can run a subset: `node scripts/verify.js promo-buy3 size-price`.

## Live demo: plant a bug

The [live demo](https://verify-on-save.vercel.app/) is a split screen. The shop is on the left. On the right is a panel with three tabs: **Overview** (the loop as an animated diagram), **Plant a bug** and **How it works**.

In **Plant a bug**, switching a bug on really changes the shop, so you can see the effect yourself. The bugs are grouped by voucher, and each one names the Kane flow expected to catch it:

| Id | Voucher | Planted bug | Flow expected to catch it | Real Kane run recorded |
|---|---|---|---|---|
| B01 | WELCOME10 | The whole order costs nothing | `promo-welcome-one-item` | not yet |
| B02 | BUY3SAVE10 | Rejected at exactly 3 items | `promo-buy3` | yes |
| B03 | BUY3SAVE10 | Half off the whole order | `promo-buy6-three-items` | not yet |
| B04 | BUY3SAVE10 | Its note is missing in the vouchers dialog | `vouchers-popup` | yes |
| B05 | SERUM15 | Accepted on every product | `promo-not-eligible` | not yet |
| B06 | SAVE20 | Refused for every order | `promo-flat-120` | not yet |
| B07 | none | The larger size costs less | `size-price` | not yet |
| B08 | none | The quantity "+" adds 5 | `pay-quantity-total` | not yet |
| B09 | none | Any junk promo text is accepted | `promo-invalid` | not yet |
| B10 | none | The price summary is hidden | `price-summary` | not yet |

These planted bugs are exaggerated on purpose so they are easy to see. Real bugs are usually subtler.

**What is real and what is an illustration**

- Kane CLI runs on my machine, not in your browser. The panel shows a Kane verdict only where a real run was recorded (B02 and B04, read from `src/data/recorded-runs.json`). Every other row says "No recorded run yet" and is labelled "expected to be caught by".
- The **Fix with Kiro + Kane** button plays an animation of the loop for the bug you planted. It is labelled as an illustration, and the diff in it is illustrative. When it ends, the bug is really switched off in the shop.

**Useful links and options**

- `?bugs=B02` plants a bug from the address bar (`?bugs=B01,B03` for several). The shop applies it even without the panel.
- `?panel=0` shows the plain shop on the deployed site. `?panel=1` shows the split screen on a local host.
- `?view=shop` hides the panel, `?view=panel` hides the shop, and `?tab=overview|bugs|how` opens a tab. You can also hide either side with the buttons on the divider.
- The panel is only rendered on the deployed site. On `localhost` and `127.0.0.1` you get the plain shop, so Kane never reads panel text.
- To run Kane against a planted bug on your machine: `APP_URL="http://127.0.0.1:3000/?bugs=B04" node scripts/verify.js vouchers-popup` (on Windows Command Prompt, run `set APP_URL=http://127.0.0.1:3000/?bugs=B04` first, then clear it with `set APP_URL=`).

## Quick start

Requirements: Node.js, Chrome, Kiro (or Kiro Crew), a TestMu AI account.

```bash
npm install -g @testmuai/kane-cli
kane-cli login
npm install
npm start                  # demo app on http://127.0.0.1:3000
node scripts/verify.js     # run all Kane flows
```

A full run takes a few minutes and uses roughly 120 Kane credits.

Open the folder in Kiro and ask it to change something. The steering file `.kiro/steering/verify-with-kane.md` makes it verify its own work.

## Use it in your own project

1. Copy `.kiro/` and `scripts/` into your repo (keep `scripts/package.json`, see Notes).
2. Edit the `FLOWS` list in `scripts/verify.js` with your own plain-English objectives and set `APP_URL`.
3. Adjust the `matcher` in the hook to your source files.

## Demo: Kane catches a subtle bug

The voucher BUY3SAVE10 promises "Buy 3 or more". `scripts/demo-bug.js` changes one comparison in `src/components/ui/skincare-product-shelf.tsx` (`qty < v.minQty` becomes `qty <= v.minQty`). The app still looks normal, and buying 6 still works, but a customer who buys exactly 3 is wrongly rejected. This is the same bug as B02 in the live demo.

Only the `promo-buy3` flow fails. Kane reports an `assertion_error`, Kiro reads the report, changes the line back, re-runs, and the flow passes with Pay $78.30.

```bash
node scripts/demo-bug.js                                        # inject the bug
node scripts/verify.js promo-buy3                               # Kane fails
git checkout src/components/ui/skincare-product-shelf.tsx       # reset
```

See `docs/example-failed-result.json` for a real failed run and `docs/example-passed-result.json` for a full passing run of all ten flows.
## Notes

- `assertion_error.*` reason codes are treated as app bugs; other codes are treated as infrastructure problems and the agent must not change app code.
- A "passed" status is not trusted blindly. If Kane reports passed but its summary says the task could not be completed or confirmed, `verify.js` marks the flow `SUSPECT` and the overall result as failed. This guards against false passes.
- `verify.js` prints `ERROR` when Kane cannot run at all (for example, an expired login), so a broken setup is never counted as a pass.
- Setup or infrastructure failures (a suspect run, an error, or a failure that is not an `assertion_error`) are retried once, and the report records `attempts` and `firstAttempt`. Real app bugs are never retried.
- `scripts/package.json` sets `"type": "commonjs"` so the scripts run even though the app's own `package.json` uses ES modules.
- Each Kane run consumes credits, so the hook is limited to source files.

Live demo: [https://verify-on-save.vercel.app/](https://verify-on-save.vercel.app/)

## Demo video

[https://youtu.be/0ELXQwoe02Y](https://youtu.be/0ELXQwoe02Y)
