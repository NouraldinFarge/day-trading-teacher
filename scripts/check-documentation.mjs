import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const ignoredDirectories = new Set([
  ".git",
  ".tmp-github-audit",
  "active-build",
  "cache",
  "dist",
  "node_modules",
  "portable-builds",
  "target",
  "versions",
]);
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

function display(absolute) {
  return path.relative(root, absolute).replaceAll("\\", "/");
}

function localTarget(rawTarget) {
  const withoutTitle = rawTarget.trim().replace(/^<|>$/g, "");
  if (
    !withoutTitle ||
    withoutTitle.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(withoutTitle)
  ) {
    return null;
  }
  const pathname = withoutTitle.split(/[?#]/, 1)[0];
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

async function checkMarkdown(file) {
  const source = await readFile(file, "utf8");
  const linkPattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of source.matchAll(linkPattern)) {
    const [, imageMarker, label, rawTarget] = match;
    if (imageMarker && !label.trim()) {
      failures.push(
        `${display(file)}: image ${rawTarget} has empty alternative text`,
      );
    }
    const target = localTarget(rawTarget);
    if (!target) continue;
    const resolved = path.resolve(path.dirname(file), target);
    try {
      await stat(resolved);
    } catch {
      failures.push(`${display(file)}: missing local target ${rawTarget}`);
    }
  }
}

function pngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function checkMedia() {
  const media = [
    ["docs/images/day-trading-teacher-social-preview.png", 1280, 640, true],
    ["docs/images/day-trading-teacher-lessons.png", 1200, 600, false],
    ["docs/images/day-trading-teacher-lesson.png", 1200, 600, false],
    ["docs/images/day-trading-teacher-chart.png", 1200, 600, false],
    ["docs/images/day-trading-teacher-journal.png", 1200, 600, false],
    ["docs/images/day-trading-teacher-calendar.png", 1200, 600, false],
    ["docs/images/day-trading-teacher-progress.png", 1200, 600, false],
  ];
  for (const [relative, minimumWidth, minimumHeight, exact] of media) {
    const absolute = path.join(root, relative);
    let dimensions;
    try {
      dimensions = pngDimensions(await readFile(absolute));
    } catch {
      failures.push(`${relative}: required product image is missing`);
      continue;
    }
    if (!dimensions) {
      failures.push(`${relative}: expected a valid PNG`);
      continue;
    }
    const valid = exact
      ? dimensions.width === minimumWidth && dimensions.height === minimumHeight
      : dimensions.width >= minimumWidth && dimensions.height >= minimumHeight;
    if (!valid) {
      failures.push(
        `${relative}: ${dimensions.width}x${dimensions.height} does not meet ${
          exact ? "the required" : "the minimum"
        } ${minimumWidth}x${minimumHeight} size`,
      );
    }
  }

  try {
    const manifest = JSON.parse(
      await readFile(path.join(root, "docs/images/manifest.json"), "utf8"),
    );
    const expectedNames = new Set(
      media.map(([relative]) => path.basename(relative)),
    );
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files))
      failures.push("docs/images/manifest.json: unsupported media manifest");
    else {
      for (const item of manifest.files) {
        const relative = `docs/images/${item.name}`;
        expectedNames.delete(item.name);
        try {
          const raw = await readFile(path.join(root, relative));
          const dimensions = pngDimensions(raw);
          const hash = createHash("sha256").update(raw).digest("hex");
          if (
            !dimensions ||
            dimensions.width !== item.width ||
            dimensions.height !== item.height
          )
            failures.push(
              `${relative}: dimensions do not match the media manifest`,
            );
          if (hash !== item.sha256)
            failures.push(
              `${relative}: SHA-256 does not match the media manifest`,
            );
          if (!item.synthetic || !item.dataClassification)
            failures.push(
              `${relative}: synthetic classification is incomplete`,
            );
        } catch {
          failures.push(`${relative}: manifest entry is missing`);
        }
      }
      for (const name of expectedNames)
        failures.push(`docs/images/manifest.json: missing ${name}`);
    }
  } catch {
    failures.push(
      "docs/images/manifest.json: required media manifest is missing or invalid",
    );
  }
}

async function checkProjectSite() {
  const site = await readFile(path.join(root, "site/index.html"), "utf8");
  const workflow = await readFile(
    path.join(root, ".github/workflows/pages.yml"),
    "utf8",
  );
  for (const required of [
    "day-trading-teacher-chart.png",
    "day-trading-teacher-lesson.png",
    "day-trading-teacher-lessons.png",
    "day-trading-teacher-journal.png",
    "day-trading-teacher-calendar.png",
    "day-trading-teacher-progress.png",
    "Educational software only",
    "releases/latest",
  ]) {
    if (!site.includes(required))
      failures.push(
        `site/index.html: missing required presentation content ${required}`,
      );
  }
  for (const action of [
    "actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b",
    "actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b",
    "actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e",
  ]) {
    if (!workflow.includes(action))
      failures.push(
        `.github/workflows/pages.yml: missing pinned official action ${action}`,
      );
  }
}

async function checkReleaseReference() {
  const version = (await readFile(path.join(root, "VERSION"), "utf8")).trim();
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  if (!readme.includes(`Current development version **${version}**`)) {
    failures.push(
      `README.md: current development version does not match VERSION (${version})`,
    );
  }
  for (const required of [
    "docs/README.md",
    "docs/images/day-trading-teacher-lessons.png",
    "docs/images/day-trading-teacher-chart.png",
    "docs/images/day-trading-teacher-journal.png",
    "docs/images/day-trading-teacher-progress.png",
    "PRIVACY.md",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "TRADEMARKS.md",
  ]) {
    if (!readme.includes(required)) {
      failures.push(
        `README.md: missing required presentation reference ${required}`,
      );
    }
  }
}

const files = await walk(root);
const markdown = files.filter((file) => file.endsWith(".md"));
await Promise.all(markdown.map(checkMarkdown));
await checkMedia();
await checkReleaseReference();
await checkProjectSite();

if (failures.length) {
  console.error("Documentation check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation check passed: ${markdown.length} Markdown files and 7 product images verified.`,
  );
}
