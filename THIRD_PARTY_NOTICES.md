# Third-party notices

Day-Trading Teacher includes or links against third-party software. Those components remain governed by their own licenses; the project's all-rights-reserved license does not replace or restrict rights granted by a third-party license.

Every tagged GitHub release publishes an SPDX software bill of materials identifying the resolved release components. Every source-built portable package also generates `licenses/THIRD-PARTY-LICENSES.md` from the locked JavaScript production graph and Cargo metadata, bundles the available license texts beside it, and fails portable verification if that evidence is absent.

## Main technology families

- React and React DOM
- TypeScript, Vite, and Vitest development tooling
- TanStack Router
- Tauri and its Rust/webview dependencies
- Rust crates used for serialization, decimal calculations, HTTP, dates, and validation
- Lucide icons

The generated release report is authoritative for the exact versions in a particular build. Review the [latest GitHub release](https://github.com/NouraldinFarge/day-trading-teacher/releases/latest) for its SBOM, checksum, provenance attestation, and bundled notices.

## Data and service names

Historical-data providers are optional external services selected and configured by the user. Provider names do not imply endorsement. The user remains responsible for provider account terms, data entitlements, request limits, attribution, storage, and redistribution restrictions.

Fidelity export support is a local file-compatibility workflow and does not bundle Fidelity software, credentials, account data, or market data. See [`TRADEMARKS.md`](TRADEMARKS.md).

## Reporting an omission

Open a documentation issue if a distributed component's notice or license text appears to be missing. Do not attach credentials, account exports, private journals, or unlicensed market data.
