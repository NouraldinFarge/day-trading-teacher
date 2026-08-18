# Dependency audit notes

Last reviewed: 2026-08-17 for the current `0.37.0` development lockfiles. The latest public release remains immutable at `v0.36.0`; this document does not relabel development code as released.

## JavaScript

`npm audit --audit-level=high` reports zero known vulnerabilities across the complete runtime-and-development lock graph. `npm run dependencies:check:production` remains available as a narrower runtime-only view, but it is not used to make the repository-wide claim. Semantic-major upgrades follow [`DEPENDENCY_POLICY.md`](../DEPENDENCY_POLICY.md).

## Rust

`cargo audit` reports `RUSTSEC-2026-0235` against `rkyv 0.7.46` because `Cargo.lock` records an optional dependency declared by `rust_decimal`. The application does not enable `rust_decimal`'s `rkyv` feature, and `cargo tree --locked --target all -e all -i rkyv` confirms that `rkyv` is absent from every enabled dependency edge and target. The finding is therefore not reachable in the compiled application. Reproduce the guarded audit with:

```powershell
npm run dependencies:check:rust
```

[`scripts/check-rust-advisory-exceptions.mjs`](../scripts/check-rust-advisory-exceptions.mjs) fails before the audit if `rkyv` becomes reachable, then runs `cargo audit --file Cargo.lock --ignore RUSTSEC-2026-0235`. The exception must be removed if the feature becomes active or the lockfile no longer contains the advisory. It is not a blanket waiver for any other advisory.

RustSec also lists GTK3 and related crates as unmaintained and reports an old `glib` iterator soundness issue. Those crates are Tauri's Linux-only transitive GUI path and are absent from the Windows x64 target used for this application and its releases. The project remains Windows-only; adding Linux as a supported target requires a fresh dependency and platform review.

The dedicated [`Dependency audit`](../.github/workflows/dependency-audit.yml) workflow runs the full npm audit and machine-checked Rust exception on relevant changes, monthly, and on demand. The current audit therefore has no actionable advisory in the Windows application dependency graph. Dependabot, CodeQL, compatible lockfile refreshes, and the pinned Windows CI gate remain separate ongoing controls.
