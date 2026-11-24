const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const APP_URL = process.env.APP_URL || "http://127.0.0.1:3000";
const OUT_DIR = path.join(__dirname, "..", ".verify");

// Runs a git command and returns its output, or null if git is unavailable
function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch (e) {
    return null;
  }
}

// A "passed" run whose summary says the task was not completed is not trusted
const DOUBT =
  /could not be (completed|confirmed|obtained)|couldn.t be|cannot be confirmed|not available|no completed|no specific|stopped responding|without a confirmed|unable to|not confirmed/i;

// Objectives avoid double quotes so they are safe in the Windows shell
const FLOWS = [
  {
    name: "size-price",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, choose the '100 ml' size, and confirm the pay button reads 'Pay $49.30'`,
  },
  {
    name: "pay-quantity-total",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button once, confirm the pay button reads 'Pay $58.00', then click the pay button and confirm the receipt shows 'Payment successful' and 'Total paid: $58.00'`,
  },
  {
    name: "price-summary",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, and confirm the page shows the rows 'Subtotal' $29.00, 'Discount' $0.00, 'Shipping' Free and 'Total' $29.00`,
  },
  {
    name: "vouchers-popup",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'My vouchers' button, and confirm a dialog titled 'My vouchers' is shown listing the code 'BUY3SAVE10' with a note saying that only 3 items get 10% off`,
  },
  {
    name: "promo-welcome-one-item",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button once, type 'WELCOME10' into the 'Promo code' field, click 'Apply', confirm the text 'Promo WELCOME10 applied: 10% off' and that the pay button reads 'Pay $55.10', then click the pay button and confirm the receipt shows 'Discount: -$2.90' and 'Total paid: $55.10'`,
  },
  {
    name: "promo-flat-120",
    objective: `Go to ${APP_URL}, click the glazing milk product on the shelf, click the 'Increase quantity' button 3 times so the quantity is 4, type 'SAVE20' into the 'Promo code' field, click 'Apply', and confirm the text 'Promo SAVE20 applied: $20.00 off' and that the pay button reads 'Pay $100.00'`,
  },
  {
    name: "promo-invalid",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, type 'WRONG' into the 'Promo code' field, click 'Apply', and confirm the text 'Invalid promo code' and that the pay button still reads 'Pay $29.00'`,
  },
  {
    name: "promo-not-eligible",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, type 'SERUM15' into the 'Promo code' field, click 'Apply', and confirm the text 'Promo code not eligible: Serum products only'`,
  },
  {
    name: "promo-buy3",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button twice so the quantity is 3, type 'BUY3SAVE10' into the 'Promo code' field, click 'Apply', and confirm the text 'Promo BUY3SAVE10 applied: 10% off' and that the pay button reads 'Pay $78.30'`,
  },
  {
    name: "promo-buy6-three-items",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button 5 times so the quantity is 6, type 'BUY3SAVE10' into the 'Promo code' field, click 'Apply', and confirm the pay button reads 'Pay $165.30'`,
  },
];

function runKane(flow) {
  return new Promise((resolve) => {
    // On Windows the kane-cli shim needs a shell. Elsewhere the arguments are passed
    // directly, so a shell never expands the $ in amounts such as $49.30.
    const child =
      process.platform === "win32"
        ? spawn(
            `kane-cli run "${flow.objective}" --url ${APP_URL} --agent --headless`,
            { shell: true }
          )
        : spawn("kane-cli", [
            "run",
            flow.objective,
            "--url",
            APP_URL,
            "--agent",
            "--headless",
          ]);
    let stdout = "";
    let stderr = "";
    let finished = false;
    const finish = (code, spawnError) => {
      if (finished) return;
      finished = true;
      let end = null;
      for (const line of stdout.split(/\r?\n/)) {
        try {
          const evt = JSON.parse(line);
          if (evt.type === "run_end") end = evt;
        } catch {}
      }
      let status = end ? end.status : "error";
      const summary = end ? end.summary : null;
      if (status === "passed" && summary && DOUBT.test(summary)) {
        status = "suspect";
      }
      resolve({
        flow: flow.name,
        objective: flow.objective,
        status,
        result_code: end ? end.result_code : null,
        reason_code: end ? end.reason_code : null,
        reason: end
          ? end.reason
          : spawnError || stderr.slice(-500) || "No run_end event found",
        summary,
        test_url: end ? end.test_url : null,
        exit_code: code,
        time: new Date().toISOString(),
      });
    };
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => finish(null, "Could not start kane-cli: " + e.message));
    child.on("close", (code) => finish(code, null));
  });
}

// Infrastructure problems (setup error, suspect, or a failure that is not an app bug) are
// retried once, as the steering rules say. Real app bugs (assertion_error) are never retried.
async function runFlow(flow) {
  const first = await runKane(flow);
  first.attempts = 1;
  const isAppBug =
    first.status === "failed" && String(first.reason_code || "").startsWith("assertion_error");
  if (first.status === "passed" || isAppBug) return first;
  console.log(`Retrying ${flow.name} once (${first.status}, not an app bug) ...`);
  const second = await runKane(flow);
  second.attempts = 2;
  second.firstAttempt = {
    status: first.status,
    reason_code: first.reason_code,
    reason: String(first.reason || "").slice(0, 300),
  };
  return second;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const flows = only.length ? FLOWS.filter((f) => only.includes(f.name)) : FLOWS;
  if (flows.length === 0) {
    console.log("No matching flow. Names: " + FLOWS.map((f) => f.name).join(", "));
    process.exit(1);
  }
  const results = [];
  for (const flow of flows) {
    console.log(`Running flow: ${flow.name} ...`);
    results.push(await runFlow(flow));
  }
  const allPassed = results.every((r) => r.status === "passed");
  // .verify is excluded because last-result.json itself is tracked by git
  const status = git(["status", "--porcelain", "--", ".", ":(exclude).verify"]);
  const report = {
    overall: allPassed ? "passed" : "failed",
    commit: git(["rev-parse", "--short", "HEAD"]),
    dirty: status === null ? null : status !== "",
    ran: flows.map((f) => f.name),
    fullSuite: flows.length === FLOWS.length,
    results,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "last-result.json"),
    JSON.stringify(report, null, 2)
  );
  for (const r of results) {
    console.log(`[${r.status.toUpperCase()}] ${r.flow}: ${r.summary || r.reason}`);
  }
  console.log(
    `Ran ${flows.length} of ${FLOWS.length} flows` +
      (flows.length === FLOWS.length ? "" : " (partial run, not full coverage)")
  );
  process.exit(allPassed ? 0 : 1);
})();