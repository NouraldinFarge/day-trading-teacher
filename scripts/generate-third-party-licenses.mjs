import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const outputArgument =
  args[args.indexOf("--output") + 1] ?? "output/license-preview";
const output = path.resolve(root, outputArgument);
const generatedRoot = path.resolve(root, "output");
if (
  output !== generatedRoot &&
  !output.startsWith(`${generatedRoot}${path.sep}`)
)
  throw new Error(
    "License output must remain inside the workspace output directory",
  );

function safeName(value) {
  return value.replace(/^@/, "").replaceAll(/[\\/:*?"<>|@]/g, "-");
}

function licenseExpression(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.map(licenseExpression).filter(Boolean).join(" OR ");
  if (value && typeof value === "object" && "type" in value)
    return licenseExpression(value.type);
  return "UNKNOWN";
}

async function findLicenseFile(directory) {
  try {
    const files = await readdir(directory, { withFileTypes: true });
    return (
      files.find(
        (file) =>
          file.isFile() &&
          /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(file.name),
      )?.name ?? null
    );
  } catch {
    return null;
  }
}

await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });

const lock = JSON.parse(
  await readFile(path.join(root, "package-lock.json"), "utf8"),
);
const javascript = new Map();
for (const [location, record] of Object.entries(lock.packages ?? {})) {
  if (
    !location.startsWith("node_modules/") ||
    record.dev === true ||
    !record.version
  )
    continue;
  const packageDirectory = path.join(root, location);
  let packageManifest;
  try {
    packageManifest = JSON.parse(
      await readFile(path.join(packageDirectory, "package.json"), "utf8"),
    );
  } catch {
    continue;
  }
  const identity = `${packageManifest.name}@${packageManifest.version}`;
  if (javascript.has(identity)) continue;
  const license = licenseExpression(
    packageManifest.license ?? packageManifest.licenses,
  );
  const licenseFile = await findLicenseFile(packageDirectory);
  let copiedLicense = "Not bundled; use the SPDX identifier and release SBOM.";
  if (licenseFile) {
    const target = `javascript-${safeName(identity)}-${safeName(licenseFile)}`;
    await copyFile(
      path.join(packageDirectory, licenseFile),
      path.join(output, target),
    );
    copiedLicense = target;
  }
  javascript.set(identity, {
    name: packageManifest.name,
    version: packageManifest.version,
    license,
    repository:
      typeof packageManifest.repository === "string"
        ? packageManifest.repository
        : (packageManifest.repository?.url ?? ""),
    copiedLicense,
  });
}

const cargo = process.platform === "win32" ? "cargo.exe" : "cargo";
const cargoMetadata = JSON.parse(
  execFileSync(
    cargo,
    [
      "metadata",
      "--locked",
      "--format-version",
      "1",
      "--filter-platform",
      "x86_64-pc-windows-msvc",
    ],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  ),
);
const packageById = new Map(
  cargoMetadata.packages.map((crate) => [crate.id, crate]),
);
const nodeById = new Map(
  (cargoMetadata.resolve?.nodes ?? []).map((node) => [node.id, node]),
);
const desktopRoot = cargoMetadata.packages.find(
  (crate) => crate.name === "day-trading-teacher-desktop" && !crate.source,
);
if (!desktopRoot)
  throw new Error(
    "Cargo metadata does not contain the desktop release package",
  );
const reachableRustPackages = new Set();
const pendingRustPackages = [desktopRoot.id];
while (pendingRustPackages.length) {
  const id = pendingRustPackages.pop();
  if (!id || reachableRustPackages.has(id)) continue;
  reachableRustPackages.add(id);
  const node = nodeById.get(id);
  for (const dependency of node?.deps ?? []) {
    const usedOutsideTests = dependency.dep_kinds.some(
      (kind) => kind.kind !== "dev",
    );
    if (usedOutsideTests) pendingRustPackages.push(dependency.pkg);
  }
}
const rust = [];
for (const id of reachableRustPackages) {
  const crate = packageById.get(id);
  if (!crate) continue;
  if (!crate.source) continue;
  const directory = path.dirname(crate.manifest_path);
  const licenseFile = await findLicenseFile(directory);
  let copiedLicense = "Not bundled; use the SPDX identifier and release SBOM.";
  if (licenseFile) {
    const target = `rust-${safeName(crate.name)}-${safeName(crate.version)}-${safeName(licenseFile)}`;
    await copyFile(
      path.join(directory, licenseFile),
      path.join(output, target),
    );
    copiedLicense = target;
  }
  rust.push({
    name: crate.name,
    version: crate.version,
    license: crate.license ?? "UNKNOWN",
    repository: crate.repository ?? "",
    copiedLicense,
  });
}

const unknown = [...javascript.values(), ...rust].filter(
  (entry) =>
    !entry.license ||
    entry.license === "UNKNOWN" ||
    entry.license === "UNLICENSED",
);
if (unknown.length)
  throw new Error(
    `Third-party packages without a declared license: ${unknown
      .map((entry) => `${entry.name}@${entry.version}`)
      .join(", ")}`,
  );

function table(entries) {
  return entries
    .sort((left, right) =>
      `${left.name}@${left.version}`.localeCompare(
        `${right.name}@${right.version}`,
      ),
    )
    .map(
      (entry) =>
        `| ${entry.name.replaceAll("|", "\\|")} | ${entry.version} | ${entry.license.replaceAll("|", "\\|")} | ${entry.copiedLicense} |`,
    )
    .join("\n");
}

const report = `# Third-party license inventory

Generated from the locked JavaScript production graph and Cargo metadata. This inventory accompanies the SPDX release SBOM; it is not legal advice and does not change any dependency's license.

## JavaScript runtime dependencies

| Package | Version | Declared license | Bundled license text |
| --- | --- | --- | --- |
${table([...javascript.values()])}

## Rust runtime dependencies

| Crate | Version | Declared license | Bundled license text |
| --- | --- | --- | --- |
${table(rust)}

## Application license

Day-Trading Teacher itself remains all rights reserved. See the repository's LICENSE.md. Third-party names and marks belong to their respective owners.
`;
await writeFile(path.join(output, "THIRD-PARTY-LICENSES.md"), report, "utf8");
console.log(
  `Generated license inventory for ${javascript.size} JavaScript packages and ${rust.length} Rust crates in ${path.relative(root, output)}.`,
);
