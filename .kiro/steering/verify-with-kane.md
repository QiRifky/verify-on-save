---
inclusion: always
---

# Verify every change with Kane CLI

After you change any code (index.html, server.js), you must verify it before saying the task is done.

1. Make sure the app is running at http://localhost:3000 (`npm start` in another terminal).
2. Run `node scripts/verify.js`.
3. Read `.verify/last-result.json`.
   - If `overall` is `passed`: you may report the task as done.
   - If `overall` is `failed`: read `summary` and `reason` of each failed flow, find the cause in the code, fix it, and run `node scripts/verify.js` again.
4. Try at most 5 times. If it still fails, stop and report what you found.

Rules:
- Never edit `scripts/verify.js` or the flow objectives to make a failing test pass. Fix the app instead.
- Never claim success without a passing `.verify/last-result.json` from the latest run.