import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);

function argument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const version = (argument("--version") ?? "").replace(/^v/, "");
const output = argument("--output");
if (!/^\d+\.\d+\.\d+$/.test(version))
  throw new Error("--version must be a semantic version");
if (!output) throw new Error("--output is required");

const changelog = await readFile(path.join(root, "CHANGELOG.md"), "utf8");
const escaped = version.replaceAll(".", "\\.");
const heading = new RegExp(`^## ${escaped}[^\\n]*$`, "m").exec(changelog);
if (!heading) throw new Error(`CHANGELOG.md has no section for ${version}`);
const remainder = changelog.slice(heading.index + heading[0].length);
const nextHeading = remainder.search(/^## /m);
const changes = remainder
  .slice(0, nextHeading < 0 ? undefined : nextHeading)
  .trim();
if (!changes) throw new Error(`CHANGELOG.md section for ${version} is empty`);

const repository =
  process.env.GITHUB_REPOSITORY ?? "NouraldinFarge/day-trading-teacher";
const notes = `## What changed\n\n${changes}\n\n## Install or update\n\n1. Download \`day-trading-teacher-v${version}-windows-x64-portable.zip\`.\n2. Verify it with the adjacent SHA-256 file.\n3. Extract the complete folder to a writable location.\n4. Run \`Day-Trading Teacher.exe\` for the graphical app or \`launch-portable.bat\` for a diagnostic fallback.\n\nWhen replacing an existing portable build, preserve its learner-owned \`data/\` directory and non-secret provider \`config/\` directory. Provider credentials remain protected in Windows Credential Manager for the current Windows user. The repository's one-click launcher performs a verified activation and rollback-aware migration automatically.\n\n## Privacy and product boundary\n\n- Educational software only: no investment advice, live signal, return promise, or brokerage order placement.\n- Fidelity support is read-only local export processing; no Fidelity credentials, account scraping, screen watching, or undocumented API.\n- No embedded AI and no automatic upload. External lesson and journal workflows use explicit redacted files, local validation, preview, and learner approval.\n- Release artifacts contain synthetic fixtures and public content only; private runtime validation metrics are excluded.\n\n## Verification\n\nThis release was rebuilt on GitHub's Windows runner and publishes a portable ZIP, SHA-256 checksum, SPDX SBOM, and build-provenance attestation. The release gate checks formatting, linting, accessibility, documentation and privacy contracts, TypeScript, coverage-thresholded frontend tests, portable deployment and rollback, the production bundle budget, Clippy with warnings denied, and Rust tests.\n\n## Current limits\n\n- Windows x64 portable application; no installer is generated.\n- Historical charts are learning context, not an execution-quality live feed.\n- Completed-equity reconstruction does not claim full support for options, multi-leg positions, flips, corporate actions, or every brokerage-ledger edge case.\n- The Daily Session Guard controls only local paper-practice entries and cannot control Fidelity Trader+ Desktop.\n\n[Full changelog](https://github.com/${repository}/blob/v${version}/CHANGELOG.md) · [Privacy](https://github.com/${repository}/blob/v${version}/PRIVACY.md) · [Security](https://github.com/${repository}/blob/v${version}/SECURITY.md)\n`;

const outputPath = path.resolve(root, output);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, notes, "utf8");
console.log(`Release notes generated for v${version}: ${output}`);
