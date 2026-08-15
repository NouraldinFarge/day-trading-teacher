import { useMemo, useState } from "react";
import {
  Archive,
  BookOpenCheck,
  CirclePlus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  blankSetupPlaybook,
  cleanPlaybookLines,
  evaluateSetupPlaybook,
} from "../../../domain/setup-playbook";
import type { SetupPlaybook } from "../../../domain/types";

const fromLines = (value: string) => value.split("\n").slice(0, 20);
const toLines = (value: string[]) => value.join("\n");

export function SetupPlaybookLab({
  playbooks,
  onSave,
  onRemove,
  onPractice,
}: {
  playbooks: SetupPlaybook[];
  onSave(playbook: SetupPlaybook): void;
  onRemove(playbookId: string): void;
  onPractice(): void;
}) {
  const [draft, setDraft] = useState<SetupPlaybook>(() =>
    playbooks[0] ? structuredClone(playbooks[0]) : blankSetupPlaybook(),
  );
  const [notice, setNotice] = useState("");
  const [removeArmed, setRemoveArmed] = useState(false);
  const quality = useMemo(() => evaluateSetupPlaybook(draft), [draft]);

  const update = <Key extends keyof SetupPlaybook>(
    key: Key,
    value: SetupPlaybook[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const open = (id: string) => {
    const playbook = playbooks.find((item) => item.id === id);
    if (!playbook) return;
    setDraft(structuredClone(playbook));
    setNotice("");
    setRemoveArmed(false);
  };

  const createBlank = () => {
    setDraft(blankSetupPlaybook());
    setNotice("Blank practice hypothesis opened.");
    setRemoveArmed(false);
  };

  const loadFieldGuide = () => {
    const next = blankSetupPlaybook();
    setDraft({
      ...next,
      title: "Orderly pullback study",
      market: "US equities — historical data only",
      timeframe: "1-minute decision chart; higher timeframe named separately",
      contextRequirements: [
        "Data source, freshness, and session are known",
        "The broader structure and current volatility regime are named",
      ],
      confirmationRequirements: [
        "The pause remains inside the prewritten structural boundary",
        "Available participation evidence does not conflict with the hypothesis",
      ],
      trigger: "Write the exact observable event before revealing another bar",
      invalidation:
        "Name the structural evidence that disproves the hypothesis before sizing",
      liquidityRule:
        "Contemporaneous spread and liquidity must fit the learner's written practice limit",
      disqualifiers: [
        "A required data field is missing or stale",
        "The structural invalidation exceeds the preset risk boundary",
        "The move is outside the context represented in reviewed examples",
      ],
      managementRule:
        "Use the locked exit architecture; never rewrite it after later bars appear",
      reviewQuestions: [
        "Which facts were visible before reveal?",
        "Did every required field pass at the same timestamp?",
        "Was the outcome graded separately from adherence?",
      ],
    });
    setNotice(
      "A field-complete starter is loaded. Replace every sentence with your own observable rules before replay.",
    );
  };

  const save = () => {
    const now = new Date().toISOString();
    const normalized: SetupPlaybook = {
      ...draft,
      title: draft.title.trim(),
      market: draft.market.trim(),
      timeframe: draft.timeframe.trim(),
      contextRequirements: cleanPlaybookLines(draft.contextRequirements),
      confirmationRequirements: cleanPlaybookLines(
        draft.confirmationRequirements,
      ),
      trigger: draft.trigger.trim(),
      invalidation: draft.invalidation.trim(),
      liquidityRule: draft.liquidityRule.trim(),
      disqualifiers: cleanPlaybookLines(draft.disqualifiers),
      managementRule: draft.managementRule.trim(),
      reviewQuestions: cleanPlaybookLines(draft.reviewQuestions),
      reviewedExamples: Math.max(0, Math.floor(draft.reviewedExamples)),
      status:
        draft.status === "practice_only" && !quality.readyForReplay
          ? "draft"
          : draft.status,
      updatedAt: now,
    };
    onSave(normalized);
    onPractice();
    setDraft(normalized);
    setNotice(
      quality.missing.length
        ? `Saved as a draft. ${quality.missing.length} evidence field${quality.missing.length === 1 ? " remains" : "s remain"}.`
        : normalized.status === "practice_only"
          ? "Saved for outcome-hidden replay. This is practice evidence, not validation."
          : "Complete draft saved. Mark it practice-only when you are ready to test unseen historical cases.",
    );
  };

  const remove = () => {
    if (!playbooks.some((item) => item.id === draft.id)) {
      createBlank();
      return;
    }
    if (!removeArmed) {
      setRemoveArmed(true);
      setNotice("Select Remove again to delete this local playbook.");
      return;
    }
    onRemove(draft.id);
    setDraft(blankSetupPlaybook());
    setRemoveArmed(false);
    setNotice(
      "Playbook removed. Historical plans and journal entries were not changed.",
    );
  };

  return (
    <section className="card learning-tool-card playbook-lab">
      <div className="card-header">
        <div>
          <span className="eyebrow accent">Practice-only playbooks</span>
          <h2>Turn a chart idea into an auditable hypothesis</h2>
          <p>
            A pattern is only one field. Define context, confirmation,
            invalidation, liquidity, disqualifiers, and review rules before an
            example can enter replay.
          </p>
        </div>
        <BookOpenCheck size={22} />
      </div>

      <div className="playbook-command-row">
        <label>
          <span>Saved playbook</span>
          <select
            value={
              playbooks.some((item) => item.id === draft.id) ? draft.id : ""
            }
            onChange={(event) => open(event.target.value)}
          >
            <option value="">Unsaved draft</option>
            {playbooks.map((playbook) => (
              <option value={playbook.id} key={playbook.id}>
                {playbook.title || "Untitled draft"} ·{" "}
                {playbook.status.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button secondary"
          onClick={createBlank}
        >
          <CirclePlus size={16} /> New blank
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={loadFieldGuide}
        >
          <ShieldCheck size={16} /> Load field guide
        </button>
      </div>

      <div className="playbook-quality" aria-label="Playbook completeness">
        <div>
          <span>Evidence completeness</span>
          <strong>{quality.percent}%</strong>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${quality.percent}%` }} />
        </div>
        <p>
          {quality.missing.length
            ? `Still needed: ${quality.missing.join(", ")}.`
            : "All required fields are present. Replay still has to test the hypothesis on unseen cases."}
        </p>
      </div>

      <div className="playbook-form-grid">
        <label className="wide-field">
          <span>Playbook name</span>
          <input
            value={draft.title}
            maxLength={120}
            onChange={(event) => update("title", event.target.value)}
            placeholder="A specific setup hypothesis"
          />
        </label>
        <label>
          <span>Market boundary</span>
          <input
            value={draft.market}
            maxLength={200}
            onChange={(event) => update("market", event.target.value)}
            placeholder="Instrument class and session scope"
          />
        </label>
        <label>
          <span>Timeframe boundary</span>
          <input
            value={draft.timeframe}
            maxLength={200}
            onChange={(event) => update("timeframe", event.target.value)}
            placeholder="Decision and context timeframes"
          />
        </label>
        <label>
          <span>Context requirements · one per line</span>
          <textarea
            rows={4}
            value={toLines(draft.contextRequirements)}
            onChange={(event) =>
              update("contextRequirements", fromLines(event.target.value))
            }
            placeholder="What must already be true?"
          />
        </label>
        <label>
          <span>Confirmation requirements · one per line</span>
          <textarea
            rows={4}
            value={toLines(draft.confirmationRequirements)}
            onChange={(event) =>
              update("confirmationRequirements", fromLines(event.target.value))
            }
            placeholder="What observable evidence must agree?"
          />
        </label>
        <label>
          <span>Observable trigger</span>
          <textarea
            rows={3}
            value={draft.trigger}
            onChange={(event) => update("trigger", event.target.value)}
            placeholder="An event another reviewer could verify"
          />
        </label>
        <label>
          <span>Structural invalidation</span>
          <textarea
            rows={3}
            value={draft.invalidation}
            onChange={(event) => update("invalidation", event.target.value)}
            placeholder="Evidence that proves the hypothesis wrong"
          />
        </label>
        <label className="wide-field">
          <span>Liquidity and spread rule</span>
          <textarea
            rows={3}
            value={draft.liquidityRule}
            onChange={(event) => update("liquidityRule", event.target.value)}
            placeholder="Required evidence and the fail-closed boundary"
          />
        </label>
        <label>
          <span>Disqualifiers · one per line</span>
          <textarea
            rows={4}
            value={toLines(draft.disqualifiers)}
            onChange={(event) =>
              update("disqualifiers", fromLines(event.target.value))
            }
            placeholder="Conditions that force wait or no trade"
          />
        </label>
        <label>
          <span>Management rule</span>
          <textarea
            rows={4}
            value={draft.managementRule}
            onChange={(event) => update("managementRule", event.target.value)}
            placeholder="Exit, time failure, and cancellation behavior"
          />
        </label>
        <label className="wide-field">
          <span>Review questions · one per line</span>
          <textarea
            rows={4}
            value={toLines(draft.reviewQuestions)}
            onChange={(event) =>
              update("reviewQuestions", fromLines(event.target.value))
            }
            placeholder="Questions that separate evidence, adherence, and outcome"
          />
        </label>
        <label>
          <span>Reviewed historical examples</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={draft.reviewedExamples}
            onChange={(event) =>
              update("reviewedExamples", Number(event.target.value) || 0)
            }
          />
        </label>
        <label>
          <span>Lifecycle</span>
          <select
            value={draft.status}
            onChange={(event) =>
              update("status", event.target.value as SetupPlaybook["status"])
            }
          >
            <option value="draft">Draft</option>
            <option value="practice_only" disabled={quality.missing.length > 0}>
              Practice-only replay
            </option>
            <option value="retired">Retired / review-only</option>
          </select>
        </label>
      </div>

      <div className="playbook-actions">
        <button type="button" className="button primary" onClick={save}>
          <Save size={16} /> Save playbook
        </button>
        <button
          type="button"
          className={`button secondary ${removeArmed ? "danger" : ""}`}
          onClick={remove}
        >
          {draft.status === "retired" ? (
            <Archive size={16} />
          ) : (
            <Trash2 size={16} />
          )}
          {removeArmed ? "Confirm remove" : "Remove"}
        </button>
        <p aria-live="polite">{notice}</p>
      </div>

      <p className="analysis-boundary">
        Playbooks are local learning hypotheses. Completeness and historical
        examples do not validate a strategy, certify readiness, or recommend a
        live trade.
      </p>
    </section>
  );
}
