---
inclusion: always
---

# Verify every change with Kane CLI

After you change any app code (files under `src/`), verify it before saying the task is done.

1. Make sure the app runs at http://127.0.0.1:3000 (`npm start` in another terminal). Do not start a second server.
2. Run `node scripts/verify.js`. To save credits you may run only the flows that touch your change, for example `node scripts/verify.js promo-buy3`, but run the full list once before reporting done.
3. Read `.verify/last-result.json`.
   - `overall: "passed"`: report the task as done.
   - `overall: "failed"`: for each flow whose status is not `passed`, read `status`, `reason_code`, `reason`, `summary` and `final_assertion` (expected vs observed).
     - If `reason_code` starts with `assertion_error`, it is a bug in the app. Use the `summary` hint, find the cause in the code, fix it with the smallest possible change, and run the same flow again.
     - If `status` is `suspect`, Kane said "passed" but its summary says the task could not be completed or confirmed. Do NOT trust it and do NOT change app code. Re-run that flow once. If it is still suspect, report it to the user.
     - If `status` is `unfinished`, Kane said "passed" but the run never reached or passed its final assertion (`final_assertion.reached` is false). Treat it like `suspect`: do NOT change app code, re-run that flow once, and if it is still unfinished, report it to the user.
     - If `status` is `error`, Kane could not run at all (login, project or folder not configured, server not running). Do NOT change app code. Report the message to the user.
     - Any other `reason_code` is probably not an app bug (browser, network, or server not running). Do NOT change app code. Check that the server is running, retry once, and otherwise report the error to the user.
4. Try at most 5 fix cycles. If it still fails, stop and report what you found.

Rules:
- Never edit `scripts/`, `docs/`, `README.md` or the flow objectives and expected values to make a test pass. Fix the app instead.
- Never claim success without a passing `.verify/last-result.json` from the latest run.
- Voucher rules in `src/components/ui/skincare-product-shelf.tsx` are intentional: WELCOME10, BUY3SAVE10, BUY5SAVE15, SERUM15 and SPF12 discount only 1, 3, 5, 1 and 1 items; SAVE10 and SAVE20 are flat amounts. Do not "simplify" them.