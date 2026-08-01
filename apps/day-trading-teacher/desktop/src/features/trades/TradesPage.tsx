import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarRange,
  CandlestickChart,
  CheckCircle2,
  ClipboardList,
  FileUp,
  Flag,
  FolderSync,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { LessonWorkspaceBanner } from "../../components/LessonWorkspaceBanner";
import { MetricCard } from "../../components/MetricCard";
import { Modal } from "../../components/Modal";
import { OutcomeBadge } from "../../components/OutcomeBadge";
import { PageHeader } from "../../components/PageHeader";
import { dollars } from "../../domain/calculations";
import { readLessonWorkspaceContext } from "../../domain/lesson-session";
import {
  parseFidelityOrdersCsv,
  type FidelityImportPreview,
  type FidelityRoundTrip,
} from "../../domain/fidelity-import";
import { calculateResult, scanFidelityExports } from "../../platform/bridge";
import { useAppState } from "../../state/AppStateContext";
import type {
  JournalReflection,
  Trade,
  TradeReview,
  TradeSide,
} from "../../domain/types";
import {
  MAX_JOURNAL_SCREENSHOTS,
  prepareJournalScreenshot,
} from "../../domain/image-attachments";
import { JournalDashboard } from "./JournalDashboard";
import { JournalCalendar } from "./JournalCalendar";
import { JournalInsights } from "./JournalInsights";
import { JournalGoals } from "./JournalGoals";

const blank = {
  symbol: "",
  side: "long" as TradeSide,
  entry: "",
  exit: "",
  quantity: "",
  fees: "0",
  planId: "",
  followedPlan: true,
  respectedStop: true,
  notes: "",
};

const blankJournal = (): JournalReflection => ({
  status: "needs_review",
  setup: "",
  strategy: "",
  marketContext: "",
  entryReason: "",
  exitReason: "",
  whatWentWell: "",
  whatToImprove: "",
  emotionBefore: "",
  emotionAfter: "",
  focusRating: null,
  confidenceRating: null,
  tags: [],
  mistakes: [],
  lessonsLearned: "",
  preTradeChecklist: {},
  postTradeChecklist: {},
  screenshotRefs: [],
  reviewedAt: null,
});

function buildReview(
  input: typeof blank,
  plannedQuantity: number | null,
  outcome: "profitable" | "losing" | "flat",
): TradeReview {
  if (!input.planId)
    return {
      processClassification: "not_scorable",
      outcome,
      processScore: null,
      dataQuality: "partial",
      strength: input.respectedStop
        ? "You recorded whether the exit respected your limit."
        : "You captured the completed trade for review.",
      primaryCorrection:
        "Write and timestamp the trigger, invalidation, and maximum risk before the next entry.",
      evidence: [
        "No pre-trade plan was linked",
        `User reported stop respected: ${input.respectedStop ? "yes" : "no"}`,
      ],
      assignedLessonId: "builtin-tf-009",
    };
  const sizeWithinPlan =
    plannedQuantity !== null && Number(input.quantity) <= plannedQuantity;
  const score =
    20 +
    (sizeWithinPlan ? 30 : 0) +
    (input.followedPlan ? 25 : 0) +
    (input.respectedStop ? 25 : 0);
  return {
    processClassification:
      score >= 85 ? "strong" : score >= 65 ? "adequate" : "weak",
    outcome,
    processScore: score,
    dataQuality: "complete",
    strength: input.followedPlan
      ? "You compared the trade with a plan created before the result was known."
      : sizeWithinPlan
        ? "Position quantity stayed within the planned maximum."
        : "You preserved enough evidence to identify a concrete correction.",
    primaryCorrection: !sizeWithinPlan
      ? "Recalculate size from the active stop and reduce quantity to the planned maximum."
      : !input.respectedStop
        ? "Define and rehearse the exact action required when invalidation is reached."
        : !input.followedPlan
          ? "Record what evidence justified departing from the written plan before changing it."
          : "Repeat the same planning and risk process in an unseen setup.",
    evidence: [
      `Quantity ${input.quantity} compared with planned maximum ${plannedQuantity ?? "unknown"}`,
      `User reported plan followed: ${input.followedPlan ? "yes" : "no"}`,
      `User reported stop respected: ${input.respectedStop ? "yes" : "no"}`,
    ],
    assignedLessonId: !sizeWithinPlan ? "builtin-rm-004" : "builtin-tf-009",
  };
}

async function importedTrade(candidate: FidelityRoundTrip): Promise<Trade> {
  const result = await calculateResult({
    entry: candidate.entry,
    exit: candidate.exit,
    quantity: candidate.quantity,
    fees: "0",
    multiplier: "1",
    side: candidate.side,
    planned_risk: null,
  });
  return {
    id: crypto.randomUUID(),
    symbol: candidate.symbol,
    side: candidate.side,
    entry: candidate.entry,
    exit: candidate.exit,
    quantity: candidate.quantity,
    fees: "0",
    planId: null,
    followedPlan: false,
    respectedStop: false,
    notes:
      "Imported from a Fidelity Orders CSV. Add the setup, decisions, and emotional context in the journal.",
    occurredAt: candidate.exitAt,
    grossPnl: result.gross_pnl,
    netPnl: result.net_pnl,
    rMultiple: null,
    review: {
      processClassification: "not_scorable",
      outcome: result.outcome,
      processScore: null,
      dataQuality: "partial",
      strength:
        "Execution facts were reconstructed from filled Fidelity orders.",
      primaryCorrection:
        "Complete the reflection while the decision context is still fresh.",
      evidence: [
        "Imported from filled orders",
        `Holding time: ${candidate.holdingSeconds} seconds`,
        `Order path: ${candidate.orderType}`,
        `Fill path: ${candidate.entryFillCount} entr${candidate.entryFillCount === 1 ? "y" : "ies"} and ${candidate.exitFillCount} exit${candidate.exitFillCount === 1 ? "" : "s"}`,
        `Quantity interpretation: ${candidate.quantityBasis.replace("_", " ")} · ${candidate.reconciliationConfidence} confidence`,
      ],
      assignedLessonId: "builtin-tr-002",
    },
    importSource: "fidelity_csv",
    sourceId: candidate.sourceId,
    entryAt: candidate.entryAt,
    exitAt: candidate.exitAt,
    holdingSeconds: candidate.holdingSeconds,
    orderType: candidate.orderType,
    journal: blankJournal(),
  };
}

function formatDuration(seconds?: number) {
  if (seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

type JournalTab = "overview" | "trades" | "calendar" | "insights" | "goals";

export function TradesPage() {
  const {
    state,
    addTrade,
    addTrades,
    updateTrade,
    updateFidelityImport,
    addJournalGoal,
    updateJournalGoal,
    updateJournalDashboard,
  } = useAppState();
  const guidedByLesson = !state.profile.standaloneTools;
  const [lessonContext] = useState(() => readLessonWorkspaceContext("journal"));
  const [activeTab, setActiveTab] = useState<JournalTab>(
    lessonContext?.journalTab ?? "overview",
  );
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(state.trades.length === 0);
  const [savedMessage, setSavedMessage] = useState("");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<
    (FidelityImportPreview & { sourceName: string }) | null
  >(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [journalTrade, setJournalTrade] = useState<Trade | null>(null);
  const [journalDraft, setJournalDraft] =
    useState<JournalReflection>(blankJournal());
  const [reflectionMode, setReflectionMode] = useState<"quick" | "deep">(
    "quick",
  );
  const [journalError, setJournalError] = useState("");
  const [screenshotError, setScreenshotError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const visibleTrades = state.trades.filter(
    (trade) =>
      trade.symbol.toLowerCase().includes(query.trim().toLowerCase()) ||
      trade.journal?.tags.some((tag) =>
        tag.toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );
  const reviewed = state.trades.filter(
    (trade) => trade.journal?.status === "reviewed",
  ).length;
  const pendingTrades = state.trades.filter(
    (trade) => trade.journal?.status !== "reviewed",
  );
  const netPnl = state.trades.reduce(
    (total, trade) => total + Number(trade.netPnl),
    0,
  );
  const profitable = state.trades.filter(
    (trade) => Number(trade.netPnl) > 0,
  ).length;
  const winRate = state.trades.length
    ? Math.round((profitable / state.trades.length) * 100)
    : 0;
  const knownSourceIds = useMemo(
    () => new Set(state.trades.map((trade) => trade.sourceId).filter(Boolean)),
    [state.trades],
  );
  const dashboardPreferences = state.journalDashboard ?? {
    defaultRange: "month" as const,
    calendarMetric: "pnl" as const,
    compactCards: false,
    visibleWidgets: ["performance", "insights", "records", "activity"] as Array<
      "performance" | "insights" | "records" | "activity"
    >,
  };

  const createImportedTrades = async (importPreview: FidelityImportPreview) =>
    Promise.all(
      importPreview.trades
        .filter((trade) => !knownSourceIds.has(trade.sourceId))
        .map(importedTrade),
    );

  useEffect(() => {
    const settings = state.fidelityImport;
    if (!settings?.autoScan || !settings.folderPath) return;
    let stopped = false;
    const scan = async () => {
      try {
        const files = await scanFidelityExports(settings.folderPath);
        if (stopped) return;
        const fileKey = files
          .map((file) => `${file.path}:${file.modifiedAt}`)
          .join("\n");
        if (fileKey === settings.lastFileKey) {
          updateFidelityImport({
            ...settings,
            lastScanAt: new Date().toISOString(),
          });
          return;
        }
        const batchSourceIds = new Set(knownSourceIds);
        const candidates: FidelityRoundTrip[] = [];
        let filesNeedingReview = 0;
        for (const file of files) {
          try {
            const importPreview = parseFidelityOrdersCsv(file.content);
            if (
              importPreview.warnings.length ||
              importPreview.unmatchedOrderCount
            )
              filesNeedingReview += 1;
            for (const candidate of importPreview.trades) {
              if (batchSourceIds.has(candidate.sourceId)) continue;
              batchSourceIds.add(candidate.sourceId);
              candidates.push(candidate);
            }
          } catch {
            filesNeedingReview += 1;
          }
        }
        const trades = await Promise.all(candidates.map(importedTrade));
        if (stopped) return;
        if (trades.length) addTrades(trades);
        updateFidelityImport({
          ...settings,
          lastScanAt: new Date().toISOString(),
          lastFileKey: fileKey,
        });
        setSavedMessage(
          trades.length
            ? `Imported ${trades.length} completed position${trades.length === 1 ? "" : "s"} from ${files.length} Fidelity export${files.length === 1 ? "" : "s"}.${filesNeedingReview ? ` ${filesNeedingReview} file${filesNeedingReview === 1 ? " needs" : "s need"} review.` : ""}`
            : files.length
              ? `${files.length} Fidelity export${files.length === 1 ? " is" : "s are"} up to date.`
              : "No supported Fidelity Orders exports were found in the selected folder or its dated subfolders.",
        );
      } catch (reason) {
        if (!stopped)
          setImportError(
            reason instanceof Error ? reason.message : String(reason),
          );
      }
    };
    void scan();
    const timer = window.setInterval(() => void scan(), 60_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [
    state.fidelityImport?.autoScan,
    state.fidelityImport?.folderPath,
    state.fidelityImport?.lastFileKey,
  ]);

  const update = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) => {
    setSavedMessage("");
    setForm((current) => ({ ...current, [field]: value }));
  };
  const selectPlan = (planId: string) => {
    const plan = state.plans.find((candidate) => candidate.id === planId);
    setForm((current) =>
      plan
        ? {
            ...current,
            planId,
            symbol: plan.symbol,
            side: plan.side,
            entry: plan.entry,
          }
        : { ...current, planId },
    );
  };
  const closeForm = () => {
    setShowForm(false);
    setForm(blank);
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.symbol.trim())
      return setError("Enter a symbol for the completed trade.");
    const plan = state.plans.find((candidate) => candidate.id === form.planId);
    try {
      const result = await calculateResult({
        entry: form.entry,
        exit: form.exit,
        quantity: form.quantity,
        fees: form.fees,
        multiplier: "1",
        side: form.side,
        planned_risk: plan?.plannedRisk ?? null,
      });
      const trade: Trade = {
        id: crypto.randomUUID(),
        symbol: form.symbol.trim().toUpperCase(),
        side: form.side,
        entry: form.entry,
        exit: form.exit,
        quantity: form.quantity,
        fees: form.fees,
        planId: plan?.id ?? null,
        followedPlan: form.followedPlan,
        respectedStop: form.respectedStop,
        notes: form.notes.trim(),
        occurredAt: new Date().toISOString(),
        grossPnl: result.gross_pnl,
        netPnl: result.net_pnl,
        rMultiple: result.r_multiple,
        review: buildReview(
          form,
          plan?.plannedQuantity ?? null,
          result.outcome,
        ),
        importSource: "manual",
        journal: { ...blankJournal(), marketContext: form.notes.trim() },
      };
      addTrade(trade);
      setSavedMessage(
        `${trade.symbol} was saved. Complete its reflection to close the learning loop.`,
      );
      setForm(blank);
      setShowForm(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const readCsv = async (file?: File) => {
    if (!file) return;
    setImportError("");
    try {
      if (file.size > 10_000_000)
        throw new Error(
          "The Fidelity export is larger than the 10 MB safety limit.",
        );
      setPreview({
        ...parseFidelityOrdersCsv(await file.text()),
        sourceName: file.name,
      });
    } catch (reason) {
      setImportError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const commitPreview = async () => {
    if (!preview) return;
    setImportBusy(true);
    setImportError("");
    try {
      const trades = await createImportedTrades(preview);
      addTrades(trades);
      setSavedMessage(
        trades.length
          ? `Imported ${trades.length} new completed trade${trades.length === 1 ? "" : "s"}. Add reflection to turn execution history into learning evidence.`
          : "No new completed trades were found; duplicates were left unchanged.",
      );
      setPreview(null);
    } catch (reason) {
      setImportError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setImportBusy(false);
    }
  };

  const openJournal = (trade: Trade) => {
    setJournalTrade(trade);
    setJournalDraft(trade.journal ?? blankJournal());
    setReflectionMode("quick");
    setJournalError("");
    setScreenshotError("");
  };
  const quickReflectionReady = Boolean(
    journalDraft.entryReason.trim() &&
    journalDraft.exitReason.trim() &&
    (journalDraft.whatToImprove.trim() || journalDraft.whatWentWell.trim()),
  );
  const saveJournal = () => {
    if (!journalTrade) return;
    if (!quickReflectionReady) {
      setJournalError(
        "Add the entry reason, exit reason, and at least one repeatable strength or correction before saving.",
      );
      return;
    }
    const journal = {
      ...journalDraft,
      status: "reviewed" as const,
      tags: journalDraft.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      reviewedAt: new Date().toISOString(),
    };
    updateTrade({
      ...journalTrade,
      followedPlan:
        journal.postTradeChecklist?.followedEntry ?? journalTrade.followedPlan,
      respectedStop:
        journal.postTradeChecklist?.respectedRisk ?? journalTrade.respectedStop,
      journal,
    });
    setJournalTrade(null);
    setSavedMessage(
      `${journalTrade.symbol} reflection completed. The lesson is now preserved beyond the P&L.`,
    );
  };
  const addScreenshots = async (files?: FileList | null) => {
    if (!files?.length) return;
    setScreenshotError("");
    const remaining = Math.max(
      0,
      MAX_JOURNAL_SCREENSHOTS - (journalDraft.screenshotRefs?.length ?? 0),
    );
    if (!remaining) {
      setScreenshotError(
        `Remove an attachment before adding another. Each reflection can keep ${MAX_JOURNAL_SCREENSHOTS} screenshots.`,
      );
      return;
    }
    const selected = [...files].slice(0, remaining);
    const results = await Promise.allSettled(
      selected.map(prepareJournalScreenshot),
    );
    const images = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const errors = results.flatMap((result) =>
      result.status === "rejected"
        ? [
            result.reason instanceof Error
              ? result.reason.message
              : "An image could not be prepared.",
          ]
        : [],
    );
    if (files.length > remaining)
      errors.push(
        `Only the first ${remaining} remaining screenshot${remaining === 1 ? "" : "s"} could be considered.`,
      );
    if (images.length)
      setJournalDraft((current) => ({
        ...current,
        screenshotRefs: [...(current.screenshotRefs ?? []), ...images],
      }));
    if (errors.length) setScreenshotError(errors.join(" "));
  };

  return (
    <div>
      <LessonWorkspaceBanner workspace="journal" />
      <PageHeader
        eyebrow={
          guidedByLesson
            ? "Lesson practice · Evidence Journal"
            : "Standalone trading journal"
        }
        title={
          guidedByLesson
            ? "Turn execution evidence into the next lesson"
            : "Understand your trading process"
        }
        description={
          guidedByLesson
            ? "Import execution facts, reconstruct the decision, reflect without hindsight, and use the evidence to choose what deserves practice next."
            : "Import execution facts, add the missing decision context, and explore patterns without treating P&L or trade count as a verdict."
        }
        actions={
          <>
            <Link to="/chart" className="button secondary">
              <CandlestickChart size={16} />
              Chart & backtest
            </Link>
            <button
              className="button secondary"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp size={16} />
              Import from Fidelity
            </button>
            <input
              ref={fileRef}
              className="file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void readCsv(event.target.files?.[0])}
            />
            <button
              className={
                activeTab === "trades" && showForm
                  ? "button secondary"
                  : "button primary"
              }
              onClick={() => {
                if (activeTab === "trades" && showForm) closeForm();
                else {
                  setActiveTab("trades");
                  setShowForm(true);
                }
              }}
            >
              {activeTab === "trades" && showForm ? (
                <X size={16} />
              ) : (
                <Plus size={16} />
              )}
              {activeTab === "trades" && showForm
                ? "Cancel entry"
                : "Record trade"}
            </button>
          </>
        }
      />

      <nav className="journal-tabs" aria-label="Journal sections">
        {(
          [
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "trades", label: "Trades", icon: BarChart3 },
            { id: "calendar", label: "Calendar", icon: CalendarRange },
            { id: "insights", label: "Patterns", icon: BrainCircuit },
            { id: "goals", label: "Goals", icon: Flag },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={activeTab === id ? "active" : ""}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {pendingTrades.length ? (
        <section className="journal-attention-banner" role="status">
          <span>
            <BookOpenCheck size={21} />
          </span>
          <div>
            <span className="eyebrow">Reflection queue</span>
            <strong>
              {pendingTrades.length} completed{" "}
              {pendingTrades.length === 1 ? "trade needs" : "trades need"}{" "}
              context
            </strong>
            <p>
              Start with {pendingTrades[0].symbol}. A focused reflection takes
              only a few minutes; deeper notes remain optional.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => openJournal(pendingTrades[0])}
          >
            Review {pendingTrades[0].symbol}
          </button>
        </section>
      ) : null}

      {activeTab === "overview" ? (
        <JournalDashboard
          trades={state.trades}
          profile={state.profile}
          preferences={dashboardPreferences}
          onPreferences={updateJournalDashboard}
          onOpenTrade={openJournal}
          onNavigate={setActiveTab}
        />
      ) : null}
      {activeTab === "calendar" ? (
        <JournalCalendar
          trades={state.trades}
          preferences={dashboardPreferences}
          onPreferences={updateJournalDashboard}
          onOpenTrade={openJournal}
        />
      ) : null}
      {activeTab === "insights" ? (
        <JournalInsights trades={state.trades} profile={state.profile} />
      ) : null}
      {activeTab === "goals" ? (
        <JournalGoals
          trades={state.trades}
          goals={state.journalGoals ?? []}
          onAdd={addJournalGoal}
          onUpdate={updateJournalGoal}
        />
      ) : null}

      {activeTab === "trades" ? (
        <>
          {state.fidelityImport?.autoScan ? (
            <div className="auto-import-strip">
              <FolderSync size={17} />
              <div>
                <strong>Automatic Fidelity scan is on</strong>
                <span>
                  Checking the selected folder and dated subfolders every 60
                  seconds while this Journal is open.
                </span>
              </div>
              <small>
                {state.fidelityImport.lastScanAt
                  ? `Last checked ${new Date(state.fidelityImport.lastScanAt).toLocaleTimeString()}`
                  : "Scanning…"}
              </small>
            </div>
          ) : null}
          {savedMessage ? (
            <div className="success-message reward-message" role="status">
              <span>
                <CheckCircle2 size={16} /> {savedMessage}
              </span>
              <strong>
                <Zap size={14} />
                Learning loop
              </strong>
            </div>
          ) : null}
          {importError ? (
            <div className="error-message" role="alert">
              {importError}
            </div>
          ) : null}

          <div className="metrics-grid journal-metrics">
            <MetricCard
              label="Journal entries"
              value={`${state.trades.length}`}
              note={`${reviewed} reflections complete`}
              icon={<NotebookPen size={19} />}
            />
            <MetricCard
              label="Net result"
              value={dollars(netPnl.toFixed(2))}
              note="Recorded trades only"
              icon={<LineChart size={19} />}
              tone={netPnl >= 0 ? "positive" : "warning"}
            />
            <MetricCard
              label="Win rate"
              value={`${winRate}%`}
              note="Outcome, not decision quality"
              icon={<Scale size={19} />}
            />
            <MetricCard
              label="Reflection rate"
              value={`${state.trades.length ? Math.round((reviewed / state.trades.length) * 100) : 0}%`}
              note="Context captured after execution"
              icon={<BookOpenCheck size={19} />}
              tone="positive"
            />
          </div>

          {showForm ? (
            <form className="card" onSubmit={(event) => void submit(event)}>
              <div className="card-header">
                <div>
                  <h2>Manual trade capture</h2>
                  <p>
                    Record one completed equity round trip, then complete its
                    journal reflection.
                  </p>
                </div>
                <ClipboardList size={20} className="muted" />
              </div>
              <div className="card-body">
                <div className="form-grid three">
                  <div className="field">
                    <label htmlFor="trade-symbol">
                      Symbol <span className="muted">(required)</span>
                    </label>
                    <input
                      id="trade-symbol"
                      required
                      autoComplete="off"
                      value={form.symbol}
                      onChange={(event) =>
                        update("symbol", event.target.value.toUpperCase())
                      }
                      placeholder="SPY"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="trade-side">Side</label>
                    <select
                      id="trade-side"
                      value={form.side}
                      onChange={(event) =>
                        update("side", event.target.value as TradeSide)
                      }
                    >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="trade-plan">Linked pre-trade plan</label>
                    <select
                      id="trade-plan"
                      value={form.planId}
                      onChange={(event) => selectPlan(event.target.value)}
                    >
                      <option value="">No pre-trade plan</option>
                      {state.plans.map((plan) => (
                        <option value={plan.id} key={plan.id}>
                          {plan.symbol} · {plan.setup} ·{" "}
                          {new Date(plan.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="trade-entry">Average entry</label>
                    <input
                      id="trade-entry"
                      required
                      inputMode="decimal"
                      value={form.entry}
                      onChange={(event) => update("entry", event.target.value)}
                      placeholder="50.00"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="trade-exit">Average exit</label>
                    <input
                      id="trade-exit"
                      required
                      inputMode="decimal"
                      value={form.exit}
                      onChange={(event) => update("exit", event.target.value)}
                      placeholder="50.40"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="trade-quantity">Quantity</label>
                    <input
                      id="trade-quantity"
                      required
                      inputMode="decimal"
                      value={form.quantity}
                      onChange={(event) =>
                        update("quantity", event.target.value)
                      }
                      placeholder="100 or 0.282"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="trade-fees">Known fees</label>
                    <input
                      id="trade-fees"
                      inputMode="decimal"
                      value={form.fees}
                      onChange={(event) => update("fees", event.target.value)}
                    />
                  </div>
                  <div className="field full">
                    <label htmlFor="trade-notes">Known market context</label>
                    <textarea
                      id="trade-notes"
                      value={form.notes}
                      onChange={(event) => update("notes", event.target.value)}
                      placeholder="Catalyst, spread, volatility, and what changed—facts before interpretation."
                    />
                  </div>
                </div>
                <div className="form-grid section-gap">
                  <div className="checkbox-row">
                    <input
                      id="followed-plan"
                      type="checkbox"
                      disabled={!form.planId}
                      checked={form.followedPlan}
                      onChange={(event) =>
                        update("followedPlan", event.target.checked)
                      }
                    />
                    <label htmlFor="followed-plan">
                      I followed the linked plan or documented the change before
                      acting.
                    </label>
                  </div>
                  <div className="checkbox-row">
                    <input
                      id="respected-stop"
                      type="checkbox"
                      checked={form.respectedStop}
                      onChange={(event) =>
                        update("respectedStop", event.target.checked)
                      }
                    />
                    <label htmlFor="respected-stop">
                      I respected the active stop or invalidation rule.
                    </label>
                  </div>
                </div>
                {error ? (
                  <div className="error-message" role="alert">
                    {error}
                  </div>
                ) : null}
                <div className="form-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>
                  <button className="button primary" type="submit">
                    <Scale size={16} />
                    Calculate and save
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          <section className="section-gap">
            {state.trades.length ? (
              <div className="record-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <label className="sr-only" htmlFor="trade-search">
                    Filter journal by symbol or tag
                  </label>
                  <input
                    id="trade-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter by symbol or tag"
                  />
                </div>
                <span>
                  {visibleTrades.length} of {state.trades.length} entries
                </span>
              </div>
            ) : null}
            {state.trades.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<LineChart size={24} />}
                  title="Your journal is ready"
                  body="Import a Fidelity Orders CSV or add a completed trade manually. Brokerage facts stay separate from your reflection."
                  action={
                    <button
                      className="button primary"
                      onClick={() => fileRef.current?.click()}
                    >
                      Import Fidelity CSV
                    </button>
                  }
                />
              </div>
            ) : visibleTrades.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Search size={22} />}
                  title="No matching entries"
                  body={`No symbol or tag matches “${query}”.`}
                  action={
                    <button
                      className="button secondary"
                      onClick={() => setQuery("")}
                    >
                      Clear filter
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="record-list">
                {visibleTrades.map((trade) => (
                  <article
                    className={`record-card journal-card ${trade.journal?.status === "reviewed" ? "reviewed" : "needs-review"}`}
                    key={trade.id}
                  >
                    <div className="record-topline">
                      <div className="record-title">
                        <strong>{trade.symbol}</strong>
                        <span className="side-marker">{trade.side}</span>
                        {trade.importSource === "fidelity_csv" ? (
                          <span className="badge badge-partial">
                            Fidelity import
                          </span>
                        ) : null}
                        <OutcomeBadge value={trade.review.outcome} />
                      </div>
                      <strong
                        className={
                          Number(trade.netPnl) >= 0
                            ? "positive-text"
                            : "negative-text"
                        }
                      >
                        {dollars(trade.netPnl)}
                      </strong>
                    </div>
                    <p>
                      {new Date(trade.occurredAt).toLocaleString()} · Entry{" "}
                      {trade.entry} · Exit {trade.exit} · {trade.quantity}{" "}
                      shares
                    </p>
                    <div className="record-stats">
                      <div>
                        <span>Net P&amp;L</span>
                        <strong>{dollars(trade.netPnl)}</strong>
                      </div>
                      <div>
                        <span>Holding time</span>
                        <strong>{formatDuration(trade.holdingSeconds)}</strong>
                      </div>
                      <div>
                        <span>Order path</span>
                        <strong>{trade.orderType ?? "Manual"}</strong>
                      </div>
                      <div>
                        <span>Process evidence</span>
                        <strong>
                          {trade.review.processScore ?? "Needs plan"}
                        </strong>
                      </div>
                    </div>
                    {trade.journal?.tags.length ? (
                      <div className="journal-tags">
                        {trade.journal.tags.map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                    ) : null}
                    {trade.journal?.status === "reviewed" ? (
                      <details className="trade-replay">
                        <summary>Replay the decision</summary>
                        <div className="replay-timeline">
                          <div>
                            <span>1</span>
                            <div>
                              <strong>Before entry</strong>
                              <p>
                                {trade.journal.marketContext ||
                                  "No market context recorded."}
                              </p>
                              <small>
                                {trade.journal.strategy ||
                                  "Unclassified strategy"}{" "}
                                · {trade.journal.setup || "Unnamed setup"}
                              </small>
                            </div>
                          </div>
                          <div>
                            <span>2</span>
                            <div>
                              <strong>Entry decision</strong>
                              <p>
                                {trade.journal.entryReason ||
                                  "No entry reasoning recorded."}
                              </p>
                              <small>
                                Focus {trade.journal.focusRating ?? "—"}/5 ·
                                Confidence{" "}
                                {trade.journal.confidenceRating ?? "—"}/5
                              </small>
                            </div>
                          </div>
                          <div>
                            <span>3</span>
                            <div>
                              <strong>Exit and lesson</strong>
                              <p>
                                {trade.journal.exitReason ||
                                  "No exit reasoning recorded."}
                              </p>
                              <small>
                                {trade.journal.lessonsLearned ||
                                  trade.journal.whatToImprove ||
                                  "No lesson recorded."}
                              </small>
                            </div>
                          </div>
                        </div>
                        {trade.journal.screenshotRefs?.length ? (
                          <div className="replay-screenshots">
                            {trade.journal.screenshotRefs.map(
                              (image, index) => (
                                <img
                                  src={image}
                                  alt={`${trade.symbol} trade screenshot ${index + 1}`}
                                  key={`${trade.id}-${index}`}
                                />
                              ),
                            )}
                          </div>
                        ) : null}
                      </details>
                    ) : null}
                    <div className="review-panel">
                      <div>
                        <div className="record-title">
                          <Sparkles size={16} />
                          <strong>
                            {trade.journal?.status === "reviewed"
                              ? "Reflection complete"
                              : "Reflection needed"}
                          </strong>
                        </div>
                        <p>
                          {trade.journal?.status === "reviewed"
                            ? trade.journal.whatToImprove ||
                              trade.journal.whatWentWell ||
                              "Context preserved for pattern review."
                            : "The CSV knows what filled—not why you acted, what you noticed, or what you will repeat."}
                        </p>
                      </div>
                      <button
                        className={
                          trade.journal?.status === "reviewed"
                            ? "button secondary compact"
                            : "button primary compact"
                        }
                        onClick={() => openJournal(trade)}
                      >
                        {trade.journal?.status === "reviewed"
                          ? "Edit reflection"
                          : "Complete reflection"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="callout warning section-gap">
            <ShieldAlert size={18} />
            <p>
              CSV reconciliation supports completed long stock/ETF positions,
              including multiple entries and partial exits. Open positions,
              shorts, and unsupported actions remain unresolved. Review every
              quantity marked “Needs review” against Fidelity confirmations.
            </p>
          </div>
        </>
      ) : null}

      {preview ? (
        <Modal
          wide
          title="Review the Fidelity import"
          description={`${preview.sourceName} was parsed locally. Account identifiers and raw rows will not be stored.`}
          onClose={() => setPreview(null)}
        >
          <div className="import-summary-grid">
            <div>
              <strong>{preview.filledOrderCount}</strong>
              <span>filled orders read</span>
            </div>
            <div>
              <strong>{preview.trades.length}</strong>
              <span>positions reconstructed</span>
            </div>
            <div>
              <strong>{preview.unmatchedOrderCount}</strong>
              <span>orders or quantities unresolved</span>
            </div>
            <div>
              <strong>
                {
                  preview.trades.filter((trade) =>
                    knownSourceIds.has(trade.sourceId),
                  ).length
                }
              </strong>
              <span>duplicates ignored</span>
            </div>
          </div>
          {preview.warnings.length ? (
            <ul className="validation-list warnings">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <div className="callout">
              <CheckCircle2 size={18} />
              <p>
                All supported filled orders were reconciled without warnings.
              </p>
            </div>
          )}
          <div className="import-preview-list">
            {preview.trades.slice(0, 12).map((trade) => (
              <div key={trade.sourceId}>
                <strong>
                  {trade.symbol}
                  <span
                    className={`badge ${trade.reconciliationConfidence === "high" ? "badge-strong" : "badge-partial"}`}
                  >
                    {trade.reconciliationConfidence === "high"
                      ? "Reconciled"
                      : "Needs review"}
                  </span>
                </strong>
                <span>
                  {trade.quantity} shares · {trade.entry} → {trade.exit}
                </span>
                <small>
                  {trade.entryFillCount} entr
                  {trade.entryFillCount === 1 ? "y" : "ies"} ·{" "}
                  {trade.exitFillCount} exit
                  {trade.exitFillCount === 1 ? "" : "s"} ·{" "}
                  {formatDuration(trade.holdingSeconds)}
                </small>
              </div>
            ))}
          </div>
          <div className="callout">
            <ShieldAlert size={18} />
            <p>
              This creates factual journal entries only. It does not connect to
              your Fidelity account, place orders, or treat the export as a tax
              record.
            </p>
          </div>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={
                importBusy ||
                preview.trades.every((trade) =>
                  knownSourceIds.has(trade.sourceId),
                )
              }
              onClick={() => void commitPreview()}
            >
              <FileUp size={16} />
              {importBusy ? "Importing…" : "Import new trades"}
            </button>
          </div>
        </Modal>
      ) : null}

      {journalTrade ? (
        <Modal
          wide
          title={`Reflect on ${journalTrade.symbol}`}
          description="Start with three focused prompts. Add deeper context only when it helps you recognize a repeatable pattern."
          onClose={() => setJournalTrade(null)}
        >
          <div className="reflection-prompt">
            <BookOpenCheck size={20} />
            <div>
              <strong>Execution snapshot</strong>
              <p>
                {journalTrade.quantity} shares · {journalTrade.entry} →{" "}
                {journalTrade.exit} ·{" "}
                {formatDuration(journalTrade.holdingSeconds)} ·{" "}
                {dollars(journalTrade.netPnl)}
              </p>
            </div>
          </div>
          <div
            className="reflection-mode-tabs"
            role="group"
            aria-label="Reflection depth"
          >
            <button
              type="button"
              aria-pressed={reflectionMode === "quick"}
              className={reflectionMode === "quick" ? "active" : ""}
              onClick={() => setReflectionMode("quick")}
            >
              <BookOpenCheck size={18} />
              <span>
                <strong>Quick reflection</strong>
                <small>Three focused prompts</small>
              </span>
            </button>
            <button
              type="button"
              aria-pressed={reflectionMode === "deep"}
              className={reflectionMode === "deep" ? "active" : ""}
              onClick={() => setReflectionMode("deep")}
            >
              <BrainCircuit size={18} />
              <span>
                <strong>Deep review</strong>
                <small>Optional context and evidence</small>
              </span>
            </button>
          </div>
          {reflectionMode === "quick" ? (
            <>
              <div
                className={`reflection-readiness ${quickReflectionReady ? "ready" : ""}`}
                role="status"
              >
                {quickReflectionReady ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <NotebookPen size={18} />
                )}
                <div>
                  <strong>
                    {quickReflectionReady
                      ? "Ready to save"
                      : "Capture the decision, not an essay"}
                  </strong>
                  <p>
                    Entry reason + exit reason + one repeatable strength or
                    correction.
                  </p>
                </div>
              </div>
              <div className="form-grid section-gap">
                <div className="field full">
                  <label htmlFor="journal-market">
                    Market context <span className="muted">(optional)</span>
                  </label>
                  <textarea
                    id="journal-market"
                    value={journalDraft.marketContext}
                    onChange={(event) =>
                      setJournalDraft({
                        ...journalDraft,
                        marketContext: event.target.value,
                      })
                    }
                    placeholder="Trend, volatility, session, catalyst, or reason not to trade…"
                  />
                </div>
                <div className="field">
                  <label htmlFor="journal-entry">
                    Entry reason <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="journal-entry"
                    required
                    value={journalDraft.entryReason}
                    onChange={(event) => {
                      setJournalDraft({
                        ...journalDraft,
                        entryReason: event.target.value,
                      });
                      setJournalError("");
                    }}
                    placeholder="What observable evidence justified the entry?"
                  />
                  <small className="field-hint">
                    Describe evidence known before the outcome.
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="journal-exit">
                    Exit reason <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="journal-exit"
                    required
                    value={journalDraft.exitReason}
                    onChange={(event) => {
                      setJournalDraft({
                        ...journalDraft,
                        exitReason: event.target.value,
                      });
                      setJournalError("");
                    }}
                    placeholder="What changed or triggered the exit?"
                  />
                  <small className="field-hint">
                    Separate the exit decision from whether the trade won.
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="journal-good">Repeatable strength</label>
                  <textarea
                    id="journal-good"
                    value={journalDraft.whatWentWell}
                    onChange={(event) => {
                      setJournalDraft({
                        ...journalDraft,
                        whatWentWell: event.target.value,
                      });
                      setJournalError("");
                    }}
                    placeholder="What process behavior should you repeat?"
                  />
                </div>
                <div className="field">
                  <label htmlFor="journal-improve">One correction</label>
                  <textarea
                    id="journal-improve"
                    value={journalDraft.whatToImprove}
                    onChange={(event) => {
                      setJournalDraft({
                        ...journalDraft,
                        whatToImprove: event.target.value,
                      });
                      setJournalError("");
                    }}
                    placeholder="What is one controllable change for next time?"
                  />
                </div>
                <fieldset className="checklist-field full">
                  <legend>
                    Post-trade evidence{" "}
                    <span className="muted">(optional)</span>
                  </legend>
                  {[
                    ["followedEntry", "Entry followed the written trigger"],
                    ["respectedRisk", "Stop or invalidation respected"],
                    ["documentedChange", "Any change was documented"],
                    ["reviewedPromptly", "Reflection completed promptly"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={Boolean(
                          journalDraft.postTradeChecklist?.[key],
                        )}
                        onChange={(event) =>
                          setJournalDraft({
                            ...journalDraft,
                            postTradeChecklist: {
                              ...(journalDraft.postTradeChecklist ?? {}),
                              [key]: event.target.checked,
                            },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </div>
            </>
          ) : (
            <div className="form-grid three section-gap">
              <div className="field">
                <label htmlFor="journal-strategy">Strategy</label>
                <input
                  id="journal-strategy"
                  value={journalDraft.strategy ?? ""}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      strategy: event.target.value,
                    })
                  }
                  placeholder="Momentum, mean reversion…"
                />
              </div>
              <div className="field">
                <label htmlFor="journal-setup">Setup name</label>
                <input
                  id="journal-setup"
                  value={journalDraft.setup}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      setup: event.target.value,
                    })
                  }
                  placeholder="Opening range break, pullback, reversal…"
                />
              </div>
              <div className="field">
                <label htmlFor="journal-focus">Focus before entry</label>
                <select
                  id="journal-focus"
                  value={journalDraft.focusRating ?? ""}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      focusRating: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                >
                  <option value="">Not recorded</option>
                  <option value="1">1 — Distracted</option>
                  <option value="2">2 — Unsettled</option>
                  <option value="3">3 — Neutral</option>
                  <option value="4">4 — Focused</option>
                  <option value="5">5 — Calm and deliberate</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="journal-confidence">
                  Confidence before entry
                </label>
                <select
                  id="journal-confidence"
                  value={journalDraft.confidenceRating ?? ""}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      confidenceRating: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                >
                  <option value="">Not recorded</option>
                  <option value="1">1 — Very uncertain</option>
                  <option value="2">2 — Low</option>
                  <option value="3">3 — Neutral</option>
                  <option value="4">4 — Clear</option>
                  <option value="5">5 — High conviction</option>
                </select>
              </div>
              <div className="field full">
                <label htmlFor="journal-context">
                  Market context and catalyst
                </label>
                <textarea
                  id="journal-context"
                  value={journalDraft.marketContext}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      marketContext: event.target.value,
                    })
                  }
                  placeholder="Trend, relative volume, spread, nearby levels, news, and volatility."
                />
              </div>
              <div className="field">
                <label htmlFor="journal-entry-reason">Why did you enter?</label>
                <textarea
                  id="journal-entry-reason"
                  value={journalDraft.entryReason}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      entryReason: event.target.value,
                    })
                  }
                  placeholder="Objective trigger and invalidation known at entry."
                />
              </div>
              <div className="field">
                <label htmlFor="journal-exit-reason">Why did you exit?</label>
                <textarea
                  id="journal-exit-reason"
                  value={journalDraft.exitReason}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      exitReason: event.target.value,
                    })
                  }
                  placeholder="Target, invalidation, time stop, discretion, or uncertainty."
                />
              </div>
              <div className="field">
                <label htmlFor="journal-before">Emotion before</label>
                <input
                  id="journal-before"
                  value={journalDraft.emotionBefore}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      emotionBefore: event.target.value,
                    })
                  }
                  placeholder="Calm, rushed, fearful, excited…"
                />
              </div>
              <div className="field">
                <label htmlFor="journal-after">Emotion after</label>
                <input
                  id="journal-after"
                  value={journalDraft.emotionAfter}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      emotionAfter: event.target.value,
                    })
                  }
                  placeholder="Relieved, frustrated, neutral…"
                />
              </div>
              <div className="field">
                <label htmlFor="journal-well">What was done well?</label>
                <textarea
                  id="journal-well"
                  value={journalDraft.whatWentWell}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      whatWentWell: event.target.value,
                    })
                  }
                  placeholder="One repeatable process behavior."
                />
              </div>
              <div className="field">
                <label htmlFor="journal-improve">
                  One correction for next time
                </label>
                <textarea
                  id="journal-improve"
                  value={journalDraft.whatToImprove}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      whatToImprove: event.target.value,
                    })
                  }
                  placeholder="One observable behavior, not a P&L goal."
                />
              </div>
              <div className="field full">
                <label htmlFor="journal-tags">Pattern tags</label>
                <input
                  id="journal-tags"
                  value={journalDraft.tags.join(", ")}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      tags: event.target.value.split(","),
                    })
                  }
                  placeholder="patient, wide-spread, chase, followed-stop"
                />
                <small className="field-hint">
                  Separate tags with commas. Use the same tags consistently to
                  reveal patterns.
                </small>
              </div>
              <div className="field">
                <label htmlFor="journal-mistakes">Mistakes noticed</label>
                <textarea
                  id="journal-mistakes"
                  value={(journalDraft.mistakes ?? []).join(", ")}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      mistakes: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Late entry, size drift, ignored spread…"
                />
              </div>
              <div className="field">
                <label htmlFor="journal-lesson">Lesson learned</label>
                <textarea
                  id="journal-lesson"
                  value={journalDraft.lessonsLearned ?? ""}
                  onChange={(event) =>
                    setJournalDraft({
                      ...journalDraft,
                      lessonsLearned: event.target.value,
                    })
                  }
                  placeholder="What should your future self recognize sooner?"
                />
              </div>
              <fieldset className="checklist-field">
                <legend>Pre-trade checklist</legend>
                {[
                  ["planWritten", "Plan written before entry"],
                  ["riskDefined", "Maximum risk defined"],
                  ["triggerConfirmed", "Objective trigger confirmed"],
                  ["noTradeChecked", "No-trade conditions checked"],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(journalDraft.preTradeChecklist?.[key])}
                      onChange={(event) =>
                        setJournalDraft({
                          ...journalDraft,
                          preTradeChecklist: {
                            ...(journalDraft.preTradeChecklist ?? {}),
                            [key]: event.target.checked,
                          },
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <fieldset className="checklist-field">
                <legend>Post-trade checklist</legend>
                {[
                  ["followedEntry", "Entry followed the written trigger"],
                  ["respectedRisk", "Stop or invalidation respected"],
                  ["documentedChange", "Any change was documented"],
                  ["reviewedPromptly", "Reflection completed promptly"],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(journalDraft.postTradeChecklist?.[key])}
                      onChange={(event) =>
                        setJournalDraft({
                          ...journalDraft,
                          postTradeChecklist: {
                            ...(journalDraft.postTradeChecklist ?? {}),
                            [key]: event.target.checked,
                          },
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <div className="field full screenshot-field">
                <label htmlFor="journal-screenshots">
                  Trade screenshots <span className="muted">(up to 3)</span>
                </label>
                <input
                  id="journal-screenshots"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  multiple
                  aria-describedby="journal-screenshots-hint"
                  onChange={(event) => {
                    const input = event.currentTarget;
                    void addScreenshots(input.files).finally(() => {
                      input.value = "";
                    });
                  }}
                />
                <small id="journal-screenshots-hint" className="field-hint">
                  PNG, JPEG, or WebP up to 5 MB. Images are resized locally and
                  stay in this device’s journal data. Remove account identifiers
                  before attaching.
                </small>
                {screenshotError ? (
                  <div className="error-message" role="alert">
                    {screenshotError}
                  </div>
                ) : null}
                {journalDraft.screenshotRefs?.length ? (
                  <div className="screenshot-preview-grid">
                    {journalDraft.screenshotRefs.map((image, index) => (
                      <figure key={index}>
                        <img
                          src={image}
                          alt={`Attached trade screenshot ${index + 1}`}
                        />
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove screenshot ${index + 1}`}
                          onClick={() => {
                            setScreenshotError("");
                            setJournalDraft({
                              ...journalDraft,
                              screenshotRefs:
                                journalDraft.screenshotRefs?.filter(
                                  (_, imageIndex) => imageIndex !== index,
                                ),
                            });
                          }}
                        >
                          <X size={14} />
                        </button>
                      </figure>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
          {journalError ? (
            <div className="error-message" role="alert">
              {journalError}
            </div>
          ) : null}
          <div className="form-actions reflection-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setJournalTrade(null)}
            >
              Cancel
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() =>
                setReflectionMode(reflectionMode === "quick" ? "deep" : "quick")
              }
            >
              {reflectionMode === "quick" ? (
                <BrainCircuit size={16} />
              ) : (
                <BookOpenCheck size={16} />
              )}
              {reflectionMode === "quick"
                ? "Add deeper context"
                : "Back to quick reflection"}
            </button>
            <button
              className="button primary"
              type="button"
              onClick={saveJournal}
            >
              <NotebookPen size={16} />
              Save reflection
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
