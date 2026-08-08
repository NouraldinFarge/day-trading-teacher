# Dependency audit notes

Last reviewed: 2026-08-08 for v0.32.6.

## JavaScript

`npm audit` reports zero known vulnerabilities after the compatible lockfile refresh. Semantic-major upgrades remain outside this patch release and follow [`DEPENDENCY_POLICY.md`](../DEPENDENCY_POLICY.md).

## Rust

`cargo audit` reports `RUSTSEC-2026-0235` against `rkyv 0.7.46` because Cargo.lock records an optional dependency declared by `rust_decimal`. The application does not enable `rust_decimal`'s `rkyv` feature, and `cargo tree --target all -e all -i rkyv` confirms that `rkyv` is absent from every resolved build target. The finding is therefore not reachable in the compiled application. The release audit uses:

```powershell
cargo audit --ignore RUSTSEC-2026-0235
```

The exception must be removed if the feature becomes active or the lockfile no longer contains the advisory. It is not a blanket waiver for other advisories.

RustSec also lists GTK3 and related crates as unmaintained and reports an old `glib` iterator soundness issue. Those crates are Tauri's Linux-only transitive GUI path and are absent from the Windows x64 target used for this application and its releases. The project remains Windows-only; adding Linux as a supported target requires a fresh dependency and platform review.

The current audit therefore has no actionable advisory in the Windows release dependency graph. Dependabot, CodeQL, compatible lockfile refreshes, and the pinned Windows CI gate remain the ongoing controls.
