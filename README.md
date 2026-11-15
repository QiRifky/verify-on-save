# Verify-on-Save

A drop-in template that closes the loop between an AI coding agent and Kane CLI: the agent changes code, Kane verifies it in a real browser, and the agent reads Kane's report and fixes what failed, until everything passes.

Built for the KaneCLI Online Hackathon with Kiro.

## How it works

1. The agent (Kiro) edits the app.
2. A steering rule tells it to run `node scripts/verify.js`.
3. The script runs plain-English Kane flows against `http://localhost:3000` and writes `.verify/last-result.json`.
4. If a flow fails, the agent reads Kane's `reason_code` and `summary`, fixes the cause, and re-runs (max 5 cycles).
5. It may report "done" only after a passing result.

An optional Kiro hook (`.kiro/hooks/verify-with-kane.json`) re-runs the check after the agent edits `index.html` or `server.js`. Note: Kiro file hooks react to changes made by the agent, not to manual saves.

## Quick start

Requirements: Node.js, Chrome, Kiro (or Kiro Crew), a TestMu AI account.

```bash
npm install -g @testmuai/kane-cli
kane-cli login
npm start                  # demo app on http://localhost:3000
node scripts/verify.js     # run all Kane flows
```

Open the folder in Kiro and ask it to change something. The steering file `.kiro/steering/verify-with-kane.md` makes it verify its own work.

## Use it in your own project

1. Copy `.kiro/` and `scripts/verify.js` into your repo.
2. Edit the `FLOWS` list in `scripts/verify.js` with your own plain-English objectives and set `APP_URL`.
3. Adjust the `matcher` in the hook to your source files.

## Demo: Kane catches a subtle bug

The counter bug (`todos.length` instead of counting unfinished items) looks fine at a glance. Only the `items-left-counter` flow fails, and Kane's summary points to the fix. Run `node scripts/demo-bug.js` to inject it, and `git checkout index.html` to reset. See `docs/example-failed-result.json` and `docs/example-passed-result.json`.

## Notes

- `assertion_error.*` reason codes are treated as app bugs; other codes are treated as infrastructure problems and the agent must not change app code.
- Each Kane run consumes credits, so the hook is limited to source files.

## Demo video

(YouTube link here)