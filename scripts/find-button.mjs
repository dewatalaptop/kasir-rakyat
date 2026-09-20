// Prints "x y" (center) of the first node in a uiautomator dump whose text or
// content-desc contains the given label. Prints nothing if absent.
import { readFileSync } from "node:fs";
const [file, label] = process.argv.slice(2);
const xml = readFileSync(file, "utf8");
for (const m of xml.matchAll(/<node [^>]*>/g)) {
  const n = m[0];
  const text = (n.match(/ text="([^"]*)"/) || [])[1] || "";
  const desc = (n.match(/ content-desc="([^"]*)"/) || [])[1] || "";
  if (text.includes(label) || desc.includes(label)) {
    const b = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (b) {
      console.log(`${Math.round((+b[1] + +b[3]) / 2)} ${Math.round((+b[2] + +b[4]) / 2)}`);
      break;
    }
  }
}
