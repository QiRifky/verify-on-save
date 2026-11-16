const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const APP_URL = process.env.APP_URL || "http://127.0.0.1:3000";
const OUT_DIR = path.join(__dirname, "..", ".verify");

// Objectives avoid double quotes so they are safe in the Windows shell
const FLOWS = [
  {
    name: "size-price",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, choose the '100 ml' size, and confirm the pay button reads 'Pay $49.30'`,
  },
  {
    name: "pay-quantity-total",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button once, confirm the pay button reads 'Pay $58.00', click it, and confirm a receipt appears with the text 'Payment successful' and 'Total paid: $58.00'`,
  },
  {
    name: "vouchers-popup",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'My vouchers' button, and confirm a dialog titled 'My vouchers' is shown listing the code 'BUY3SAVE10' with a note saying that only 1 item gets 10% off, even if you buy 6`,
  },
  {
    name: "promo-welcome-receipt",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button once, type 'WELCOME10' into the 'Promo code' field, click 'Apply', confirm the text 'Promo WELCOME10 applied: 10% off' and that the pay button reads 'Pay $55.10', then click the pay button and confirm the receipt shows 'Discount: -$2.90' and 'Total paid: $55.10'`,
  },
  {
    name: "promo-min-order",
    objective: `Go to ${APP_URL}, click the glazing milk product on the shelf, click the 'Increase quantity' button once so the quantity is 2, type 'BIG20' into the 'Promo code' field, click 'Apply', and confirm the text 'Promo BIG20 applied: 20% off' and that the pay button reads 'Pay $54.00'`,
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
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button twice so the quantity is 3, type 'BUY3SAVE10' into the 'Promo code' field, click 'Apply', and confirm the text 'Promo BUY3SAVE10 applied: 10% off' and that the pay button reads 'Pay $84.10'`,
  },
  {
    name: "promo-buy6-one-item",
    objective: `Go to ${APP_URL}, click the Barrier Restore Cream product, click the 'Increase quantity' button 5 times so the quantity is 6, type 'BUY3SAVE10' into the 'Promo code' field, click 'Apply', and confirm the pay button reads 'Pay $171.10'`,
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