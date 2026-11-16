const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const APP_URL = process.env.APP_URL || "http://127.0.0.1:3000";
const OUT_DIR = path.join(__dirname, "..", ".verify");

// Objectives avoid double quotes so they are safe in the Windows shell
const FLOWS = [
  {
    name: "open-product",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product on the shelf, and confirm the product page opens with the heading 'Barrier Restore Cream' and the price '$29.00'`,
  },
  {
    name: "size-price",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, choose the '100 ml' size, and confirm the pay button reads 'Pay $49.30'`,
  },
  {
    name: "pay-quantity-total",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button once, confirm the pay button reads 'Pay $58.00', click it, and confirm a receipt appears with the text 'Payment successful' and 'Total paid: $58.00'`,
  },
  {
    name: "pay-large-size",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, choose the '100 ml' size, click the 'Increase quantity' button once, click the pay button, and confirm the receipt shows 'Quantity: 2' and 'Total paid: $98.60'`,
  },
  {
    name: "receipt-done",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the pay button, wait for the receipt, click 'Done', and confirm the shelf with all the products is visible again, including the 'Squalane' product priced '$10'`,
  },
];

function runKane(flow) {
  return new Promise((resolve) => {
    const cmd = `kane-cli run "${flow.objective}" --url ${APP_URL} --agent --headless`;
    const child = spawn(cmd, { shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      let end = null;
      for (const line of stdout.split(/\r?\n/)) {
        try {
          const evt = JSON.parse(line);
          if (evt.type === "run_end") end = evt;
        } catch {}
      }
      resolve({
        flow: flow.name,
        objective: flow.objective,
        status: end ? end.status : "error",
        result_code: end ? end.result_code : null,
        reason_code: end ? end.reason_code : null,
        reason: end ? end.reason : stderr.slice(-500) || "No run_end event found",
        summary: end ? end.summary : null,
        test_url: end ? end.test_url : null,
        exit_code: code,
        time: new Date().toISOString(),
      });
    });
  });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const flow of FLOWS) {
    console.log(`Running flow: ${flow.name} ...`);
    results.push(await runKane(flow));
  }
  const allPassed = results.every((r) => r.status === "passed");
  const report = { overall: allPassed ? "passed" : "failed", results };
  fs.writeFileSync(
    path.join(OUT_DIR, "last-result.json"),
    JSON.stringify(report, null, 2)
  );
  for (const r of results) {
    console.log(`[${r.status.toUpperCase()}] ${r.flow}: ${r.summary || r.reason}`);
  }
  process.exit(allPassed ? 0 : 1);
})();