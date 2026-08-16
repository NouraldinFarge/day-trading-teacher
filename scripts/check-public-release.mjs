import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

const { stdout } = await execFileAsync(
  "git",
  ["ls-files", "-co", "--exclude-standard"],
  {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
  },
);

const files = [...new Set(stdout.split(/\r?\n/).filter(Boolean))];
const forbiddenPathRoots = [
  "active-build/",
  "cache/",
  "config/",
  "data/",
  "logs/",
  "portable-builds/",
  "runtime/",
  "versions/",
];

for (const relative of files) {
  const normalized = relative.replaceAll("\\", "/");
  if (forbiddenPathRoots.some((prefix) => normalized.startsWith(prefix))) {
    failures.push(
      `${normalized}: private or generated runtime path is publishable`,
    );
  }
}

const textExtensions = new Set([
  ".bat",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ps1",
  ".rs",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const contentRules = [
  {
    pattern: /C:\\Users\\Nah|D:\\Extensions_Programs/gi,
    reason: "contains a private absolute workstation path",
  },
  {
    pattern: /Individual \*(?!0000)\d{4}/g,
    reason: "contains a non-synthetic brokerage account suffix",
  },
  {
    pattern:
      /trade_learning_current_private_state|trading_records_actual_folder_validation/g,
    reason: "contains a private-runtime release-manifest field",
  },
  {
    pattern:
      /current \d+-record private state|verified the real \d+-day Trading Records/gi,
    reason: "publishes user-derived validation or behavioral totals",
  },
];

for (const relative of files) {
  if (relative.replaceAll("\\", "/") === "scripts/check-public-release.mjs")
    continue;
  if (!textExtensions.has(path.extname(relative).toLowerCase())) continue;
  let source;
  try {
    source = await readFile(path.join(root, relative), "utf8");
  } catch {
    continue;
  }
  for (const rule of contentRules) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(source)) failures.push(`${relative}: ${rule.reason}`);
  }
}

const manifestPath = path.join(root, "VERSION_MANIFEST.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const key of Object.keys(manifest)) {
  if (/private_state|actual_folder_validation/i.test(key)) {
    failures.push(
      `VERSION_MANIFEST.json: private-runtime field ${key} is not public metadata`,
    );
  }
}
if (manifest.private_runtime_validation_metrics_bundled !== false) {
  failures.push(
    "VERSION_MANIFEST.json: private runtime metrics must be explicitly excluded",
  );
}
if (manifest.privacy_public_release_contract !== true) {
  failures.push(
    "VERSION_MANIFEST.json: public-release privacy contract is not enabled",
  );
}

if (failures.length) {
  console.error("Public-release privacy check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Public-release privacy check passed: ${files.length} publishable paths inspected.`,
  );
}
