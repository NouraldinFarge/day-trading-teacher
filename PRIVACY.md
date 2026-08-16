# Privacy and local data

Day-Trading Teacher is a local-first educational application. It does not require an account, does not contain an analytics SDK, does not run an AI model, and does not automatically upload lessons, brokerage exports, chart data, journal text, or behavioral observations.

## Data stored by the portable application

| Location | Purpose | Sensitivity |
| --- | --- | --- |
| `data/` | Compact state core plus coordinated collection files for plans, imported trades, lessons, chart datasets, paper sessions, journal reflections, progress, and learning cases | Private learner data |
| `config/` | Non-secret provider configuration plus legacy credential files awaiting one-time migration | Treat as sensitive when upgrading from an older release |
| Windows Credential Manager | User-supplied historical-data provider keys and secrets | Protected for the current Windows user; never included in app-state exports or portable ZIPs |
| `cache/` | Re-creatable local provider or chart cache | May reveal symbols and date ranges |
| `logs/` | Local operational diagnostics | Review and redact before sharing |
| `assets/` | Bundled synthetic curricula and learning resources | Public application material |

These directories sit beside the executable in a portable build. Anyone who can read that folder may be able to read the learner's data. Protect the folder with the Windows account and disk-encryption controls appropriate for the computer. Do not place an active build in a publicly synchronized or shared folder.

## Network behavior

The application does not need a network connection to open, use bundled lessons, import local files, replay imported bars, paper-practice, or review a journal.

Network requests occur only when the learner explicitly requests historical data from a configured provider. The request goes to the named provider and contains the provider credential, selected symbol, timeframe, and date range required for that request. Provider terms and privacy policies apply.

The application does not send data to Fidelity. Fidelity support reads user-selected or locally detected export files and can open the installed Fidelity Trader+ Desktop application as a separate program. It never requests Fidelity credentials, reads an account directly, watches the screen, or places an order.

## External AI handoffs

No AI service is embedded in the application. A learner can explicitly export either a lesson-plan request or a redacted journal-evidence package, submit that file to an external service, and import a returned JSON file after local validation and preview.

The journal-evidence package excludes account columns, credentials, absolute paths, raw chart histories, screenshots, and existing learner-authored journal text. It can still contain sensitive trading facts, timestamps, calculated outcomes, and non-diagnostic behavioral hypotheses. Review the preview before sharing it and apply the external service's privacy policy independently.

## Public repository boundary

The public repository and release artifacts must contain only source code, synthetic fixtures, public documentation, and reproducible build assets. They must not contain:

- Raw brokerage exports or chart histories
- Account identifiers or credentials
- Learner journals or generated private trade audits
- Absolute local paths
- User-derived dataset totals or behavioral-pattern counts
- Active portable `data/`, `config/`, `cache/`, or `logs/` contents

`npm run privacy:check` enforces machine-checkable parts of this boundary. Human review remains required for screenshots, prose, examples, and any new data source.

## Backup, export, and deletion

- Back up `data/` to preserve learning records.
- State collections use atomic current/recovery pairs under `data/`; copy the complete directory rather than selecting individual collection files.
- Current releases protect provider credentials in Windows Credential Manager with local-user persistence. A successfully read legacy plaintext credential is migrated and its old primary, temporary, and backup files are removed.
- Treat `config/` from an older build as potentially secret and do not include it in ordinary support bundles. Moving the portable folder to another Windows user does not move protected credentials; add them again on that account.
- Use the in-app export preview before sharing a state or AI handoff file.
- Use the in-app reset flow to remove application-controlled records and the app's protected provider entries from Windows Credential Manager.
- Review separately created copies, backups, external-AI uploads, screenshots, and exported reports; the application cannot delete copies outside its portable folder.

## Reporting a privacy problem

Do not attach private evidence to a public issue. Report credential exposure, unsafe import behavior, path leakage, state/export leakage, or a product-boundary bypass through [GitHub private vulnerability reporting](https://github.com/NouraldinFarge/day-trading-teacher/security/advisories/new).

Include the affected application version, Windows version, smallest synthetic reproduction, expected privacy boundary, and whether the issue persists without personal data.
