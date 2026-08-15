# External-AI journal workflow

Status: current for v0.36.0.

Day-Trading Teacher does not run an AI model or upload trading data. It can create a redacted evidence package that the learner explicitly shares with an external AI, then validate the returned journal drafts locally.

## End-to-end flow

1. Put supported Fidelity Orders and chart CSV files inside dated `YYYY-MM-DD/` folders under `Trading_Records/`.
2. Open **Journal → Evidence inbox**. The portable app detects a root-level sibling `Trading_Records/` folder when available; manual selection remains available in Settings.
3. Scan the folder. The inbox inventories supported CSV files, reconstructs completed long equity positions, and pairs one-minute chart sessions by New York date and symbol.
4. Select **Create AI journal package**. The app downloads one JSON file locally and does not transmit it.
5. Select **Copy AI request**, upload the JSON package to the external AI chosen by the learner, paste the request, and ask for JSON only.
6. Save the returned JSON and select **Import AI response** in the inbox.
7. Review validation errors, warnings, trade matches, strategy hypotheses, mental-state hypotheses, and proposed corrections. Choose which drafts to import.
8. The app locally creates or refreshes **Lessons → Trade Lessons** for the chosen drafts. It preserves each original lesson, separates contemporaneous evidence from hindsight, and links repeated decision mechanisms newest-to-oldest.
9. Open each imported draft in **Trades**, compare it with personal memory, correct unsupported text, and explicitly save it. Until that step, its status remains **needs review**. Separately review its Trade Lesson; that review records reflection and never claims mastery.

## Evidence package contents

The package includes only:

- sanitized filled-order facts;
- Fidelity unit meaning (`Buy Amount/Filled = dollars invested`, `Sell Amount/Filled = shares sold`);
- reconstructed entry, exit, share quantity, holding time, fill path, gross cash arithmetic, and reconciliation status;
- same-day chart measures such as entry location, calculated VWAP, MFE, MAE, day range, and chart coverage;
- day-level cadence measures such as session span, median holding time, and rapid same-symbol re-entry count;
- explicit unknowns and a strict response contract.

The package excludes Fidelity account columns, credentials, absolute paths, screenshots, learner-authored journal text, and raw chart histories. It contains historical evidence only.

## Import validation

The app rejects a response when:

- it is malformed, oversized, or not the declared response schema;
- its package identity is stale or different;
- a trade ID, symbol, or date does not match the evidence package;
- an inference cites an evidence reference absent from the package;
- a mental-state item omits `nonDiagnostic: true` or uses high confidence;
- text contains a clinical diagnostic claim, live buy/sell directive, risk-free claim, or guaranteed-profit claim.

A valid response is still not treated as truth. The importer fills only empty fields in incomplete reflections, preserves learner-authored text, never changes a completed reflection, and marks provenance as `external_ai` with `awaiting_user_review` status.

The generated Trade Lessons system uses only validated entries selected during import. Regeneration keeps any existing per-trade lesson-review timestamp for a still-matched source record. It does not turn the external-AI strategy label into a confirmed thesis, infer a missing plan, or overwrite the original lesson. See the [Trade-derived learning system](trade-derived-learning-system.md) for its evidence and synthesis rules.

## Mental-state boundary

Orders and candles cannot reveal private thoughts, intent, stress, or emotion. The response may provide no mental-state hypothesis when evidence is insufficient. If it provides one, the item must:

- be framed as a possible behavioral explanation rather than a memory;
- use low or medium confidence;
- cite supplied evidence;
- name at least one plausible alternative explanation;
- remain non-clinical and non-diagnostic;
- be reviewed and rewritten or rejected by the learner.

## Financial-safety boundary

The workflow is retrospective education. It must not recommend a security, live entry, live exit, price target, position size, trading frequency, or expected profit. Suggested improvements should concern planning, bounded risk, execution quality, record completeness, thoughtful review, and deliberate practice.

Implementation and deterministic tests are in [`ai-journal.ts`](../apps/day-trading-teacher/desktop/src/domain/ai-journal.ts), [`trading-records.ts`](../apps/day-trading-teacher/desktop/src/domain/trading-records.ts), [`trade-learning.ts`](../apps/day-trading-teacher/desktop/src/domain/trade-learning.ts), and their adjacent test files.
