import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const tree = spawnSync(
  "cargo",
  ["tree", "--locked", "--target", "all", "-e", "all", "-i", "rkyv"],
  { cwd: root, encoding: "utf8" },
);

if (tree.status !== 0) {
  process.stderr.write(tree.stderr);
  throw new Error("Could not verify the Rust advisory reachability exception.");
}

const treeOutput = `${tree.stdout}\n${tree.stderr}`;
if (/^rkyv v\d/m.test(treeOutput)) {
  process.stderr.write(treeOutput);
  throw new Error(
    "RUSTSEC-2026-0235 may be reachable: rkyv is active in the resolved build graph.",
  );
}

console.log(
  "Reachability check passed: rkyv is absent from every enabled dependency edge and target.",
);

const audit = spawnSync(
  "cargo",
  ["audit", "--file", "Cargo.lock", "--ignore", "RUSTSEC-2026-0235"],
  { cwd: root, stdio: "inherit" },
);

if (audit.error) throw audit.error;
if (audit.status !== 0) process.exit(audit.status ?? 1);
