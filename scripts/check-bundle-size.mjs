import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = path.join(
  root,
  "apps",
  "day-trading-teacher",
  "desktop",
  "dist",
  "assets",
);
const manifestPath = path.join(path.dirname(dist), ".vite", "manifest.json");

const budgets = {
  anyJavaScriptRaw: 210 * 1024,
  anyJavaScriptGzip: 70 * 1024,
  initialJavaScriptGzip: 175 * 1024,
  totalJavaScriptGzip: 390 * 1024,
  cssRaw: 260 * 1024,
  cssGzip: 45 * 1024,
};

const entries = await readdir(dist, { withFileTypes: true });
const files = entries.filter((entry) => entry.isFile());
const failures = [];
let totalJavaScriptGzip = 0;
const gzipByFile = new Map();

function kibibytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

for (const file of files) {
  if (!/\.(?:js|css)$/.test(file.name)) continue;
  const content = await readFile(path.join(dist, file.name));
  const raw = content.byteLength;
  const gzip = gzipSync(content, { level: 9 }).byteLength;
  if (file.name.endsWith(".js")) {
    totalJavaScriptGzip += gzip;
    gzipByFile.set(`assets/${file.name}`, gzip);
    if (raw > budgets.anyJavaScriptRaw)
      failures.push(
        `${file.name} is ${kibibytes(raw)} raw; budget is ${kibibytes(budgets.anyJavaScriptRaw)}`,
      );
    if (gzip > budgets.anyJavaScriptGzip)
      failures.push(
        `${file.name} is ${kibibytes(gzip)} gzip; budget is ${kibibytes(budgets.anyJavaScriptGzip)}`,
      );
  } else {
    if (raw > budgets.cssRaw)
      failures.push(
        `${file.name} is ${kibibytes(raw)} raw; budget is ${kibibytes(budgets.cssRaw)}`,
      );
    if (gzip > budgets.cssGzip)
      failures.push(
        `${file.name} is ${kibibytes(gzip)} gzip; budget is ${kibibytes(budgets.cssGzip)}`,
      );
  }
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const entry = Object.values(manifest).find((record) => record.isEntry);
if (!entry)
  throw new Error("Vite manifest does not contain an application entry");
const initialFiles = new Set();
function includeInitial(record) {
  if (!record || initialFiles.has(record.file)) return;
  initialFiles.add(record.file);
  for (const importKey of record.imports ?? [])
    includeInitial(manifest[importKey]);
}
includeInitial(entry);
const initialJavaScriptGzip = [...initialFiles].reduce(
  (total, file) => total + (gzipByFile.get(file) ?? 0),
  0,
);
if (initialJavaScriptGzip > budgets.initialJavaScriptGzip)
  failures.push(
    `initial JavaScript is ${kibibytes(initialJavaScriptGzip)} gzip; budget is ${kibibytes(budgets.initialJavaScriptGzip)}`,
  );

if (totalJavaScriptGzip > budgets.totalJavaScriptGzip)
  failures.push(
    `all JavaScript is ${kibibytes(totalJavaScriptGzip)} gzip; budget is ${kibibytes(budgets.totalJavaScriptGzip)}`,
  );

if (failures.length) {
  console.error("Bundle-size check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Bundle-size check passed: ${kibibytes(initialJavaScriptGzip)} initial and ${kibibytes(totalJavaScriptGzip)} total JavaScript gzip; every route chunk and stylesheet is within budget.`,
  );
}
