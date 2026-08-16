import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
  Inbox,
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
  aiJournalRequestText,
  createAiJournalEvidencePackage,
  mergeExternalAiJournalDraft,
  validateExternalAiJournalResponse,
  type AiJournalEvidencePackage,
  type ExternalAiJournalValidation,
} from "../../domain/ai-journal";
import {
  parseFidelityOrdersCsv,
  type FidelityImportPreview,
  type FidelityRoundTrip,
} from "../../domain/fidelity-import";
import {
  calculateResult,
  detectTradingRecordsFolder,
  probeFidelityExports,
  scanFidelityExports,
} from "../../platform/bridge";
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
import { FidelityEvidenceInbox } from "./FidelityEvidenceInbox";
import {
  analyzeTradingRecordsScan,
  marketDataSetForTradingRecord,
  type TradingRecordChartSession,
  type TradingRecordsAnalysis,
} from "../../domain/trading-records";
import { buildTradeLearningSystem } from "../../domain/trade-learning";
import { guidedJournalSample } from "../../domain/guided-journal-sample";

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
      "Imported from a Fidelity Orders CSV. Decision context is unknown until a learner reviews a manual or external-AI journal draft.",
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
        `Fidelity buy interpretation: $${candidate.investedDollars.toFixed(2)} invested; quantity calculated from filled dollars ÷ fill price`,
        `Calculated gross exit proceeds: $${candidate.grossExitProceeds.toFixed(2)}`,
        `Quantity reconciliation: ${candidate.quantityBasis.replace("_", " ")} · ${candidate.reconciliationConfidence} confidence`,
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

function downloadText(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

type JournalTab =
  "overview" | "inbox" | "trades" | "calendar" | "insights" | "goals";

export function TradesPage() {
  const {
    state,
    addTrade,
    addTrades,
    updateTrade,
    updateTradeLearningSystem,
    updateFidelityImport,
    addMarketDataSet,
    addJournalGoal,
    updateJournalGoal,
    updateJournalDashboard,
    linkLearningCaseEvidence,
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
  const [recordsAnalysis, setRecordsAnalysis] =
    useState<TradingRecordsAnalysis | null>(null);
  const recordsAnalysisRef = useRef<TradingRecordsAnalysis | null>(null);
  const [recordsScanBusy, setRecordsScanBusy] = useState(false);
  const [recordsScanError, setRecordsScanError] = useState("");
  const [aiPreview, setAiPreview] = useState<{
    validation: ExternalAiJournalValidation;
    package: AiJournalEvidencePackage;
    fileName: string;
  } | null>(null);
  const [selectedAiDrafts, setSelectedAiDrafts] = useState<Set<string>>(
    () => new Set(),
  );
  const [guidedSampleActive, setGuidedSampleActive] = useState(false);
  const [guidedSampleNotice, setGuidedSampleNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const aiResponseRef = useRef<HTMLInputElement>(null);
  const sampleTrades = useMemo(() => guidedJournalSample(), []);
  const journalTrades =
    guidedSampleActive && state.trades.length === 0
      ? sampleTrades
      : state.trades;

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
    if (
      state.fidelityImport?.folderPath ||
      state.fidelityImport?.autoDetect === false
    )
      return;
    let stopped = false;
    void detectTradingRecordsFolder()
      .then((folderPath) => {
        if (stopped || !folderPath) return;
        updateFidelityImport({
          folderPath,
          autoScan: true,
          autoDetect: true,
          lastScanAt: null,
          lastFileKey: null,
          lastDiscoveryKey: null,
          processedFileKeys: [],
        });
        setSavedMessage(
          "Trading_Records was detected beside the project and connected automatically.",
        );
      })
      .catch(() => {
        // Manual folder selection remains available in Settings.
      });
    return () => {
      stopped = true;
    };
  }, [
    state.fidelityImport?.autoDetect,
    state.fidelityImport?.folderPath,
    updateFidelityImport,
  ]);

  const runRecordsScan = useCallback(
    async (force = false) => {
      const folderPath = state.fidelityImport?.folderPath ?? "";
      if (!folderPath) {
        setRecordsScanError(
          "Choose the Trading_Records root folder in Settings first.",
        );
        return;
      }
      setRecordsScanBusy(true);
      setRecordsScanError("");
      setImportError("");
      try {
        const probe = await probeFidelityExports(folderPath);
        if (
          !force &&
          recordsAnalysisRef.current &&
          probe.discoveryKey === state.fidelityImport?.lastDiscoveryKey
        ) {
          updateFidelityImport({
            folderPath,
            autoScan: Boolean(state.fidelityImport?.autoScan),
            autoDetect: state.fidelityImport?.autoDetect,
            lastScanAt: new Date().toISOString(),
            lastFileKey: state.fidelityImport?.lastFileKey ?? null,
            lastDiscoveryKey: probe.discoveryKey,
            processedFileKeys: state.fidelityImport?.processedFileKeys ?? [],
            lastScanSummary: state.fidelityImport?.lastScanSummary,
          });
          return;
        }
        const scan = await scanFidelityExports(folderPath);
        const fileKey = scan.files
          .map((file) => `${file.fingerprint}:${file.kind}`)
          .join("\n");
        if (
          !force &&
          recordsAnalysisRef.current &&
          fileKey === state.fidelityImport?.lastFileKey
        ) {
          updateFidelityImport({
            folderPath,
            autoScan: Boolean(state.fidelityImport?.autoScan),
            autoDetect: state.fidelityImport?.autoDetect,
            lastScanAt: new Date().toISOString(),
            lastFileKey: fileKey,
            lastDiscoveryKey: probe.discoveryKey,
            processedFileKeys: state.fidelityImport?.processedFileKeys ?? [],
            lastScanSummary: state.fidelityImport?.lastScanSummary,
          });
          return;
        }

        const analysis = analyzeTradingRecordsScan(scan);
        recordsAnalysisRef.current = analysis;
        setRecordsAnalysis(analysis);
        const batchSourceIds = new Set(knownSourceIds);
        const candidates = analysis.trades.filter((candidate) => {
          if (batchSourceIds.has(candidate.sourceId)) return false;
          batchSourceIds.add(candidate.sourceId);
          return true;
        });
        const trades = await Promise.all(candidates.map(importedTrade));
        if (trades.length) addTrades(trades);
        const chartMatchedTradeCount = analysis.trades.filter(
          (trade) => analysis.chartContextByTrade[trade.sourceId]?.available,
        ).length;
        const unresolvedOrderCount = analysis.days.reduce(
          (sum, day) => sum + day.unresolvedOrderCount,
          0,
        );
        const warningCount =
          analysis.warnings.length +
          analysis.days.reduce((sum, day) => sum + day.warnings.length, 0);
        const previouslyProcessed = new Set(
          state.fidelityImport?.processedFileKeys ?? [],
        );
        const newOrChangedFileCount = scan.files.filter(
          (file) => !previouslyProcessed.has(file.fingerprint),
        ).length;
        updateFidelityImport({
          folderPath,
          autoScan: Boolean(state.fidelityImport?.autoScan),
          autoDetect: state.fidelityImport?.autoDetect,
          lastScanAt: new Date().toISOString(),
          lastFileKey: fileKey,
          lastDiscoveryKey: probe.discoveryKey,
          processedFileKeys: scan.files.map((file) => file.fingerprint),
          lastScanSummary: {
            tradingDayCount: analysis.days.length,
            filesRead: analysis.filesRead,
            orderFileCount: analysis.orderFileCount,
            chartFileCount: analysis.chartFileCount,
            reconstructedTradeCount: analysis.trades.length,
            chartMatchedTradeCount,
            unresolvedOrderCount,
            unsupportedCsvCount: analysis.unsupportedCsvCount,
            skippedCsvCount: analysis.skippedCsvCount,
            warningCount,
            newOrChangedFileCount,
          },
        });
        setSavedMessage(
          `Read ${analysis.days.length} trading day${analysis.days.length === 1 ? "" : "s"}: ${analysis.orderFileCount} Orders export${analysis.orderFileCount === 1 ? "" : "s"}, ${analysis.chartFileCount} chart export${analysis.chartFileCount === 1 ? "" : "s"}, and ${analysis.trades.length} reconstructed position${analysis.trades.length === 1 ? "" : "s"}. ${newOrChangedFileCount} file${newOrChangedFileCount === 1 ? " was" : "s were"} new or changed since the prior full scan. ${chartMatchedTradeCount}/${analysis.trades.length} positions have same-day chart context.${trades.length ? ` Imported ${trades.length} new position${trades.length === 1 ? "" : "s"}.` : " No duplicate trades were added."}`,
        );
      } catch (reason) {
        const message =
          reason instanceof Error ? reason.message : String(reason);
        setRecordsScanError(message);
        setImportError(message);
      } finally {
        setRecordsScanBusy(false);
      }
    },
    [
      addTrades,
      knownSourceIds,
      state.fidelityImport?.autoScan,
      state.fidelityImport?.autoDetect,
      state.fidelityImport?.folderPath,
      state.fidelityImport?.lastFileKey,
      state.fidelityImport?.lastDiscoveryKey,
      state.fidelityImport?.processedFileKeys,
      state.fidelityImport?.lastScanSummary,
      updateFidelityImport,
    ],
  );

  useEffect(() => {
    if (!state.fidelityImport?.autoScan || !state.fidelityImport.folderPath)
      return;
    void runRecordsScan(false);
    const timer = window.setInterval(() => void runRecordsScan(false), 60_000);
    return () => window.clearInterval(timer);
  }, [
    runRecordsScan,
    state.fidelityImport?.autoScan,
    state.fidelityImport?.folderPath,
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

  const currentAiPackage = () => {
    if (!recordsAnalysis)
      throw new Error(
        "Scan the Trading_Records folder before creating or importing an AI journal package.",
      );
    return createAiJournalEvidencePackage(recordsAnalysis, state.trades);
  };

  const createAiPackage = () => {
    setRecordsScanError("");
    try {
      const pkg = currentAiPackage();
      const newest = pkg.days[0]?.date ?? new Date().toISOString().slice(0, 10);
      const oldest = pkg.days.at(-1)?.date ?? newest;
      downloadText(
        `day-trading-teacher_ai-journal-evidence_${oldest}_to_${newest}.json`,
        JSON.stringify(pkg, null, 2),
        "application/json",
      );
      setSavedMessage(
        `Sanitized AI journal package created for ${pkg.days.length} trading day${pkg.days.length === 1 ? "" : "s"}. Nothing was uploaded; choose where to share it.`,
      );
    } catch (reason) {
      setRecordsScanError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const copyAiRequest = async () => {
    setRecordsScanError("");
    try {
      const pkg = currentAiPackage();
      await navigator.clipboard.writeText(aiJournalRequestText(pkg));
      setSavedMessage(
        "AI request copied. Upload the evidence JSON to the AI you choose, paste the request, and save its JSON response.",
      );
    } catch (reason) {
      setRecordsScanError(
        reason instanceof Error
          ? reason.message
          : "The AI request could not be copied.",
      );
    }
  };

  const readAiResponse = async (file?: File) => {
    if (!file) return;
    setRecordsScanError("");
    try {
      if (file.size > 8_000_000)
        throw new Error("The AI response exceeds the 8 MB safety limit.");
      const pkg = currentAiPackage();
      const validation = validateExternalAiJournalResponse(
        await file.text(),
        pkg,
      );
      const defaultSelected = validation.entries.flatMap((entry) => {
        const trade = state.trades.find(
          (candidate) => candidate.sourceId === entry.tradeSourceId,
        );
        return trade && trade.journal?.status !== "reviewed"
          ? [entry.tradeSourceId]
          : [];
      });
      setSelectedAiDrafts(new Set(defaultSelected));
      setAiPreview({ validation, package: pkg, fileName: file.name });
    } catch (reason) {
      setRecordsScanError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const applyAiDrafts = () => {
    if (!aiPreview?.validation.valid) return;
    const selectedEntries = aiPreview.validation.entries.filter((entry) =>
      selectedAiDrafts.has(entry.tradeSourceId),
    );
    let learningSystem;
    try {
      learningSystem = buildTradeLearningSystem(
        aiPreview.package,
        selectedEntries,
        state.trades,
        new Date().toISOString(),
        state.tradeLearningSystem,
      );
    } catch (reason) {
      setRecordsScanError(
        reason instanceof Error
          ? reason.message
          : "The trade-derived lessons could not be created.",
      );
      return;
    }
    let applied = 0;
    let preserved = 0;
    for (const entry of selectedEntries) {
      const trade = state.trades.find(
        (candidate) => candidate.sourceId === entry.tradeSourceId,
      );
      if (!trade || trade.journal?.status === "reviewed") {
        preserved += 1;
        continue;
      }
      try {
        updateTrade(
          mergeExternalAiJournalDraft(
            trade,
            entry,
            aiPreview.package.packageId,
          ),
        );
        applied += 1;
      } catch {
        preserved += 1;
      }
    }
    if (applied) updateTradeLearningSystem(learningSystem);
    setAiPreview(null);
    setActiveTab("trades");
    setSavedMessage(
      `${applied} AI journal draft${applied === 1 ? " was" : "s were"} imported with a newest-to-oldest lesson audit.${preserved ? ` ${preserved} completed or unmatched reflection${preserved === 1 ? " was" : "s were"} preserved.` : ""} No draft or lesson was marked complete automatically.`,
    );
  };

  const openTradingRecordChart = (session: TradingRecordChartSession) => {
    const matched = recordsAnalysis
      ? recordsAnalysis.trades.filter(
          (trade) =>
            trade.tradingDate === session.date &&
            trade.symbol === session.symbol,
        ).length
      : 0;
    const dataSet = marketDataSetForTradingRecord(session, matched);
    addMarketDataSet(dataSet);
    if (lessonContext)
      linkLearningCaseEvidence(lessonContext.learningCaseId, {
        id: crypto.randomUUID(),
        kind: "chart_dataset",
        referenceId: dataSet.id,
        label: `${dataSet.symbol} trading-record chart context`,
        workspace: "journal",
        linkedAt: new Date().toISOString(),
      });
  };

  const openJournal = (trade: Trade) => {
    setJournalTrade(trade);
    setJournalDraft(trade.journal ?? blankJournal());
    setReflectionMode(
      trade.journal?.aiDraft?.reviewStatus === "awaiting_user_review"
        ? "deep"
        : "quick",
    );
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
    const reviewedAt = new Date().toISOString();
    const journal = {
      ...journalDraft,
      status: "reviewed" as const,
      tags: journalDraft.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      reviewedAt,
      aiDraft: journalDraft.aiDraft
        ? {
            ...journalDraft.aiDraft,
            reviewStatus: "reviewed_by_user" as const,
          }
        : undefined,
    };
    updateTrade({
      ...journalTrade,
      followedPlan:
        journal.postTradeChecklist?.followedEntry ?? journalTrade.followedPlan,
      respectedStop:
        journal.postTradeChecklist?.respectedRisk ?? journalTrade.respectedStop,
      journal,
    });
    if (lessonContext)
      linkLearningCaseEvidence(lessonContext.learningCaseId, {
        id: crypto.randomUUID(),
        kind: "journal_entry",
        referenceId: journalTrade.id,
        label: `${journalTrade.symbol} reviewed journal entry`,
        workspace: "journal",
        linkedAt: reviewedAt,
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
            ? "Read your full Trading Records evidence set, pair executions with charts, review externally generated journal hypotheses, and use the evidence to choose what deserves practice next."
            : "Read execution and chart evidence, bring back externally generated journal drafts for review, and explore patterns without treating P&L or trade count as a verdict."
        }
        actions={
          <>
            {state.tradeLearningSystem?.tradeAudits.length ? (
              <Link to="/learn/trade-lessons" className="button primary">
                <BookOpenCheck size={16} />
                Trade lessons
              </Link>
            ) : null}
            <Link to="/chart" className="button secondary">
              <CandlestickChart size={16} />
              Chart & backtest
            </Link>
            {state.trades.length === 0 ? (
              <button
                className="button secondary"
                onClick={() => {
                  setGuidedSampleActive(true);
                  setGuidedSampleNotice("");
                  setShowForm(false);
                  setActiveTab("overview");
                  updateJournalDashboard({
                    ...dashboardPreferences,
                    defaultRange: "quarter",
                  });
                }}
              >
                <Sparkles size={16} />
                Guided sample
              </button>
            ) : null}
            <button
              className={
                activeTab === "inbox" ? "button secondary" : "button primary"
              }
              onClick={() => setActiveTab("inbox")}
            >
              <Inbox size={16} />
              Evidence inbox
            </button>
            <button
              className="button ghost"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp size={16} />
              Import one CSV
            </button>
            <input
              ref={fileRef}
              className="file-input"
              type="file"
              accept=".csv,text/csv"
              aria-label="Choose one trade CSV file"
              onChange={(event) => void readCsv(event.target.files?.[0])}
            />
            <button
              className={
                activeTab === "trades" && showForm
                  ? "button secondary"
                  : "button ghost"
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
            { id: "inbox", label: "Evidence inbox", icon: Inbox },
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

      {guidedSampleActive && state.trades.length === 0 ? (
        <section className="synthetic-data-banner" role="status">
          <span>
            <Sparkles size={20} />
          </span>
          <div>
            <strong>Synthetic journal preview</strong>
            <p>
              Twelve fictional, mixed-outcome records are temporarily powering
              the analytics, calendar, and patterns. They are not saved, do not
              affect XP or achievements, and disappear when you import or record
              a real trade.
            </p>
            {guidedSampleNotice ? <small>{guidedSampleNotice}</small> : null}
          </div>
          <button
            className="button secondary compact"
            onClick={() => {
              setGuidedSampleActive(false);
              setGuidedSampleNotice("");
            }}
          >
            Exit preview
          </button>
        </section>
      ) : null}

      {pendingTrades.length ? (
        <section className="journal-attention-banner" role="status">
          <span>
            <BookOpenCheck size={21} />
          </span>
          <div>
            <span className="eyebrow">Journal draft queue</span>
            <strong>
              {pendingTrades.length} completed{" "}
              {pendingTrades.length === 1 ? "trade needs" : "trades need"}{" "}
              context
            </strong>
            <p>
              Start with {pendingTrades[0].symbol}. You can review it manually
              or use the evidence inbox to create externally generated drafts
              for every supported trade.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() =>
              recordsAnalysis
                ? setActiveTab("inbox")
                : openJournal(pendingTrades[0])
            }
          >
            {recordsAnalysis
              ? "Create AI drafts"
              : `Review ${pendingTrades[0].symbol}`}
          </button>
        </section>
      ) : null}

      {activeTab === "inbox" ? (
        <FidelityEvidenceInbox
          analysis={recordsAnalysis}
          settings={state.fidelityImport}
          busy={recordsScanBusy}
          error={recordsScanError}
          canCreateAiPackage={Boolean(
            recordsAnalysis?.trades.some((trade) =>
              knownSourceIds.has(trade.sourceId),
            ),
          )}
          responseInputRef={aiResponseRef}
          onScan={() => void runRecordsScan(true)}
          onCreateAiPackage={createAiPackage}
          onCopyAiRequest={() => void copyAiRequest()}
          onReadAiResponse={(file) => void readAiResponse(file)}
          onOpenChart={openTradingRecordChart}
        />
      ) : null}

      {activeTab === "overview" ? (
        <JournalDashboard
          trades={journalTrades}
          profile={state.profile}
          preferences={dashboardPreferences}
          onPreferences={updateJournalDashboard}
          onOpenTrade={(trade) =>
            guidedSampleActive && state.trades.length === 0
              ? setGuidedSampleNotice(
                  `${trade.symbol} is a read-only synthetic example. Exit the preview to work with your records.`,
                )
              : openJournal(trade)
          }
          onNavigate={setActiveTab}
        />
      ) : null}
      {activeTab === "calendar" ? (
        <JournalCalendar
          trades={journalTrades}
          preferences={dashboardPreferences}
          onPreferences={updateJournalDashboard}
          onOpenTrade={(trade) =>
            guidedSampleActive && state.trades.length === 0
              ? setGuidedSampleNotice(
                  `${trade.symbol} is a read-only synthetic example. Exit the preview to work with your records.`,
                )
              : openJournal(trade)
          }
        />
      ) : null}
      {activeTab === "insights" ? (
        <JournalInsights trades={journalTrades} profile={state.profile} />
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
                        {trade.journal?.aiDraft?.reviewStatus ===
                        "awaiting_user_review" ? (
                          <span className="badge ai-draft-badge">
                            AI draft · review required
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
                              : trade.journal?.aiDraft?.reviewStatus ===
                                  "awaiting_user_review"
                                ? "External AI draft ready"
                                : "Reflection needed"}
                          </strong>
                        </div>
                        <p>
                          {trade.journal?.status === "reviewed"
                            ? trade.journal.whatToImprove ||
                              trade.journal.whatWentWell ||
                              "Context preserved for pattern review."
                            : trade.journal?.aiDraft?.reviewStatus ===
                                "awaiting_user_review"
                              ? "Evidence-cited hypotheses were imported. Check them against your memory before accepting anything."
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
                          : trade.journal?.aiDraft?.reviewStatus ===
                              "awaiting_user_review"
                            ? "Review AI draft"
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
              This creates factual execution records only. Fidelity buy Amount
              and Filled values are treated as dollars invested—not shares. The
              app does not connect to your account, place orders, or treat the
              export as a tax record.
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

      {aiPreview ? (
        <Modal
          wide
          title="Review the external AI journal draft"
          description={`${aiPreview.fileName} was validated locally. Nothing in this response is accepted as fact or marked complete automatically.`}
          onClose={() => setAiPreview(null)}
        >
          <div className="import-summary-grid ai-draft-summary">
            <div>
              <strong>{aiPreview.validation.entries.length}</strong>
              <span>drafts matched to trades</span>
            </div>
            <div>
              <strong>{selectedAiDrafts.size}</strong>
              <span>selected for import</span>
            </div>
            <div>
              <strong>
                {
                  aiPreview.validation.entries.filter(
                    (entry) => entry.mentalStateHypotheses.length > 0,
                  ).length
                }
              </strong>
              <span>with mental-state hypotheses</span>
            </div>
            <div>
              <strong>
                {aiPreview.validation.aiProvider ?? "External AI"}
              </strong>
              <span>declared source</span>
            </div>
          </div>
          {aiPreview.validation.errors.length ? (
            <ul className="validation-list errors" role="alert">
              {aiPreview.validation.errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {aiPreview.validation.warnings.length ? (
            <ul className="validation-list warnings">
              {aiPreview.validation.warnings.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {aiPreview.validation.valid ? (
            <div className="ai-draft-preview-list">
              {aiPreview.validation.entries.map((entry) => {
                const trade = state.trades.find(
                  (candidate) => candidate.sourceId === entry.tradeSourceId,
                );
                const preserved = trade?.journal?.status === "reviewed";
                const mental = entry.mentalStateHypotheses[0];
                return (
                  <label
                    className={`ai-draft-preview-card ${preserved ? "preserved" : ""}`}
                    key={entry.tradeSourceId}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAiDrafts.has(entry.tradeSourceId)}
                      disabled={preserved}
                      onChange={(event) =>
                        setSelectedAiDrafts((current) => {
                          const next = new Set(current);
                          if (event.target.checked)
                            next.add(entry.tradeSourceId);
                          else next.delete(entry.tradeSourceId);
                          return next;
                        })
                      }
                    />
                    <div>
                      <div className="record-topline">
                        <strong>
                          {entry.symbol} · {entry.tradingDate}
                        </strong>
                        <span
                          className={`badge ${entry.strategy.confidence === "high" ? "badge-strong" : "badge-partial"}`}
                        >
                          Strategy · {entry.strategy.confidence}
                        </span>
                      </div>
                      <p>{entry.strategy.statement}</p>
                      <small>
                        Mental state:{" "}
                        {mental?.statement ??
                          "No hypothesis—evidence insufficient"}
                      </small>
                      <div className="ai-draft-correction">
                        <span>Proposed correction</span>
                        <strong>{entry.whatToImprove}</strong>
                      </div>
                      {preserved ? (
                        <em>
                          Completed reflection preserved. Reopen that trade
                          manually if you want to change it.
                        </em>
                      ) : (
                        <em>
                          Imports as “needs review” and fills only currently
                          empty reflection fields.
                        </em>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          ) : null}
          <div className="callout warning">
            <ShieldAlert size={18} />
            <p>
              Orders and candles cannot reveal private thoughts. Strategy,
              behavior, and mental-state text remains an AI hypothesis until you
              compare it with your own memory. Mental-state language is never a
              diagnosis.
            </p>
          </div>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setAiPreview(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={
                !aiPreview.validation.valid || selectedAiDrafts.size === 0
              }
              onClick={applyAiDrafts}
            >
              <CheckCircle2 size={16} />
              Import {selectedAiDrafts.size} draft
              {selectedAiDrafts.size === 1 ? "" : "s"} for review
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
          {journalDraft.aiDraft?.reviewStatus === "awaiting_user_review" ? (
            <div className="ai-draft-review-notice">
              <BrainCircuit size={20} />
              <div>
                <strong>External AI draft—review every statement</strong>
                <p>{journalDraft.aiDraft.inferenceNotice}</p>
                <small>
                  {journalDraft.aiDraft.evidenceRefs.length} evidence citation
                  {journalDraft.aiDraft.evidenceRefs.length === 1 ? "" : "s"} ·
                  imported{" "}
                  {new Date(journalDraft.aiDraft.importedAt).toLocaleString()}
                </small>
              </div>
            </div>
          ) : null}
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
