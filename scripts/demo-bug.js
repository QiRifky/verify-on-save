const fs = require("fs");
const file = "index.html";
const good = "todos.filter(t => !t.done).length + ' items left'";
const bad = "todos.length + ' items left'";
const html = fs.readFileSync(file, "utf8");
if (!html.includes(good)) {
  console.log("Line not found or bug already injected.");
  process.exit(1);
}
fs.writeFileSync(file, html.replace(good, bad));
console.log("Demo bug injected. Reset with: git checkout index.html");