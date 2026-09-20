// Prints "x y" (center) of the first VISIBLE node in a uiautomator dump whose
// text or content-desc contains the given label (prefix the label with "=" for
// an exact match). Prints nothing if absent.
import { readFileSync } from "node:fs";
const [file, rawLabel] = process.argv.slice(2);
const exact = rawLabel.startsWith("=");
const label = exact ? rawLabel.slice(1) : rawLabel;
const hit = (s) => (exact ? s === label : s.includes(label));
const xml = readFileSync(file, "utf8");
for (const m of xml.matchAll(/<node [^>]*>/g)) {
  const n = m[0];
  const text = (n.match(/ text="([^"]*)"/) || [])[1] || "";
  const desc = (n.match(/ content-desc="([^"]*)"/) || [])[1] || "";
  if (hit(text) || hit(desc)) {
    const b = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    // Skip zero-size (invisible) nodes — a first attempt tapped "0 0" on one.
    if (b && +b[3] > +b[1] && +b[4] > +b[2]) {
      console.log(`${Math.round((+b[1] + +b[3]) / 2)} ${Math.round((+b[2] + +b[4]) / 2)}`);
      break;
    }
  }
}
