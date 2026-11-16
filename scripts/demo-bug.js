const fs = require("fs");
const file = "src/components/ui/skincare-product-shelf.tsx";
const good = "qty < v.minQty";
const bad = "qty <= v.minQty";
const src = fs.readFileSync(file, "utf8");
if (!src.includes(good)) {
  console.log("Line not found or bug already injected.");
  process.exit(1);
}
fs.writeFileSync(file, src.replace(good, bad));
console.log("Demo bug injected. Reset with: git checkout src/components/ui/skincare-product-shelf.tsx");