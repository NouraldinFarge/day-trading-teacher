# Roadmap

Day-Trading Teacher prioritizes measurable learning, evidence quality, privacy, accessibility, and recoverability over engagement, trade frequency, or simulated profit. This roadmap describes direction rather than a delivery promise.

Last reviewed: 2026-08-15 for v0.36.0.

## Now — strengthen the evidence loop

- Add more fault-injection coverage for interrupted state writes, malformed restores, provider failures, and portable rollback.
- Deepen keyboard, screen-reader, contrast, reduced-motion, and resized-window checks across lesson handoffs, Chart Replay, and Journal review.
- Extend the new Trade Lessons system with prospective Decision Card adherence evidence so future audits can distinguish a missing plan, a followed plan, and a documented deviation without rewriting old records.
- Improve the link from a lesson artifact to its Decision Card, exact chart moment, completed execution, reflection, and remediation evidence without duplicating records.
- Surface the new persistent Daily Session Guard records in the Journal timeline and contribution views, including explicit no-trade, study-only, and stop-work evidence.
- Extend the new Setup Playbook and Tail Audit records with version-to-version comparisons and direct links to their preserved replay cases.
- Expand synthetic fixtures for Fidelity reconciliation edge cases while keeping unsupported options, multi-leg, flip, and corporate-action records explicit.

## Next — make review easier to use and share safely

- Add redacted HTML/PDF weekly reviews with a pre-export privacy inspection step.
- Add a learner-confirmation workflow for accepting, correcting, or rejecting each inferred strategy and behavioral explanation while retaining both the imported draft and correction history.
- Move compact screenshot evidence to encrypted native attachments with account-number redaction and integrity metadata.
- Add stable tag-taxonomy tools for merging aliases without corrupting historical analytics.
- Add more versioned curricula and open-practice cases with explicit provenance and facilitator-material separation.

## Later — evaluate only with a new threat and evidence review

- User-controlled encrypted backup or sync that preserves the local-first default and never becomes mandatory.
- Additional historical-data providers with documented APIs, user-owned credentials, visible provider identity, and bounded refresh behavior.
- Dedicated validation engines for options, multi-leg positions, flips, corporate actions, and other records the current equity round-trip model cannot establish safely.

## Non-goals

- Live buy/sell signals, current-market recommendations, investment advice, return promises, or “readiness” claims based on lesson completion.
- Brokerage credential storage, account scraping, screen watching, undocumented APIs, or automatic order entry.
- Hidden model calls, an embedded AI tutor, cloud accounts, mandatory telemetry, or data monetization.
- Rewards for trade count, position size, screen time, continuous streaks, or simulated profit.

See the [documentation hub](docs/README.md) for current behavior and [GitHub Issues](https://github.com/NouraldinFarge/day-trading-teacher/issues) for scoped, reviewable work.
