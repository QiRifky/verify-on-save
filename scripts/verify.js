const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const OUT_DIR = path.join(__dirname, "..", ".verify");

// Tulis objective tanpa tanda kutip ganda agar aman di Windows
const FLOWS = [
  {
    name: "add-todo",
    objective: `Go to ${APP_URL}, type 'Buy milk' into the 'Add a todo' input, click the 'Add' button, and confirm 'Buy milk' appears in the todo list`,
  },
  {
    name: "items-left-counter",
    objective: `Go to ${APP_URL}, add a todo 'Buy milk' and another todo 'Walk dog', tick the checkbox next to 'Buy milk', and confirm the counter text reads '1 items left'`,
  },
  {
    name: "delete-todo",
    objective: `Go to ${APP_URL}, add a todo 'Buy milk', click its 'Delete' button, and confirm the list is empty and the counter reads '0 items left'`,
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