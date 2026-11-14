---
inclusion: always
---

# Verify every change with Kane CLI

After you change any code (index.html, server.js), verify it before saying the task is done.

1. Make sure the app runs at http://localhost:3000 (`npm start` in another terminal).
2. Run `node scripts/verify.js`.
3. Read `.verify/last-result.json`.
   - `overall: "passed"`: report the task as done.
   - `overall: "failed"`: for each failed flow, read `reason_code`, `reason` and `summary`.
     - If `reason_code` starts with `assertion_error`, it is a bug in the app. Use the `summary` hint, find the cause in the code, fix it, and run `node scripts/verify.js` again.
     - Any other `reason_code` is probably not an app bug (browser, network, or server not running). Do NOT change app code. Check that the server is running, retry once, and otherwise report the error to the user.
4. Try at most 5 fix cycles. If it still fails, stop and report what you found.

Rules:
- Never edit `scripts/verify.js` or the flow objectives to make a test pass. Fix the app instead.
- Never claim success without a passing `.verify/last-result.json` from the latest run.