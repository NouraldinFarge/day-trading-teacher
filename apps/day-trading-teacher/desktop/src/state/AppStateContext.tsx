import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadState, saveState } from "../platform/bridge";
import { evaluateAchievements } from "../domain/achievements";
import { buildRecallRecord, type RecallRating } from "../domain/learning-tools";
import { defaultChartWorkspace } from "../domain/chart-workspace";
import type {
  AppState,
  ChartAcquisitionSettings,
  ChartWorkspacePreferences,
  CustomLessonPlan,
  FidelityImportSettings,
  JournalDashboardPreferences,
  JournalGoal,
  LessonPracticeEvidence,
  MarketDataSet,
  PaperTradingSession,
  Profile,
  Progress,
  Trade,
  TradePlan,
} from "../domain/types";
import { normalizeAppState } from "./state-migration";
import { validateAppState } from "./app-state-validation";

export const defaultProfile: Profile = {
  displayName: "Learner",
  experience: "beginner",
  broker: "Fidelity Trader+ Desktop",
  accountType: "paper",
  maxRiskPerTrade: "25",
  dailyLossLimit: "75",
  studyMinutes: 20,
  plainLanguage: true,
  reducedMotion: false,
  theme: "system",
  startingBalance: "10000",
  standaloneTools: false,
};

export const defaultState: AppState = {
  schemaVersion: 1,
  onboardingComplete: false,
  profile: defaultProfile,
  plans: [],
  trades: [],
  customLessonPlans: [],
  progress: {
    completedLessonIds: [],
    practiceAttempts: 0,
    lessonConfidence: {},
    lessonActivityByDate: {},
    lessonLastPracticed: {},
    lessonMastery: {},
    toolPracticeAttempts: 0,
    toolActivityByDate: {},
    toolLastPracticed: {},
    conceptRecall: {},
  },
  fidelityImport: {
    folderPath: "",
    autoScan: false,
    lastScanAt: null,
    lastFileKey: null,
  },
  journalGoals: [],
  journalDashboard: {
    defaultRange: "month",
    calendarMetric: "pnl",
    compactCards: false,
    visibleWidgets: ["performance", "insights", "records", "activity"],
  },
  achievementUnlocks: {},
  marketDataSets: [],
  chartAcquisition: {
    provider: "massive",
    subscriptions: [],
    autoRefresh: true,
    refreshIntervalHours: 24,
    intradayRefreshMinutes: 30,
    lastRefreshAt: null,
    lastDailyRefreshAt: null,
    lastOneMinuteRefreshAt: null,
    lastRefreshMessage: "",
  },
  chartWorkspace: defaultChartWorkspace,
  paperTradingSessions: [],
};

function freshDefaultState() {
  return structuredClone(defaultState);
}

type AppStateActions = {
  state: AppState;
  ready: boolean;
  persistence: {
    status: "loading" | "saving" | "saved" | "error";
    message: string;
    canRetry: boolean;
  };
  retryPersistence(): void;
  updateProfile(profile: Profile): void;
  addPlan(plan: TradePlan): void;
  addTrade(trade: Trade): void;
  addTrades(trades: Trade[]): void;
  updateTrade(trade: Trade): void;
  updateFidelityImport(settings: FidelityImportSettings): void;
  addJournalGoal(goal: JournalGoal): void;
  updateJournalGoal(goal: JournalGoal): void;
  updateJournalDashboard(preferences: JournalDashboardPreferences): void;
  addMarketDataSet(dataSet: MarketDataSet): void;
  removeMarketDataSet(dataSetId: string): void;
  updateChartAcquisition(settings: ChartAcquisitionSettings): void;
  updateChartWorkspace(preferences: ChartWorkspacePreferences): void;
  upsertPaperTradingSession(session: PaperTradingSession): void;
  removePaperTradingSession(sessionId: string): void;
  completeLesson(
    lessonId: string,
    confidence?: 1 | 2 | 3,
    evidence?: LessonPracticeEvidence,
  ): void;
  recordLearningToolPractice(toolId: string): void;
  recordConceptRecall(conceptId: string, rating: RecallRating): void;
  installLessonPlan(plan: CustomLessonPlan): void;
  removeLessonPlan(planId: string): void;
  replaceState(state: AppState): void;
  resetState(): void;
  completeOnboarding(profile: Profile): void;
};

const AppStateContext = createContext<AppStateActions | null>(null);

function progressWithToolPractice(
  progress: Progress,
  toolId: string,
  now: Date,
): Progress {
  const activityDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return {
    ...progress,
    toolPracticeAttempts: (progress.toolPracticeAttempts ?? 0) + 1,
    toolActivityByDate: {
      ...(progress.toolActivityByDate ?? {}),
      [activityDate]: (progress.toolActivityByDate?.[activityDate] ?? 0) + 1,
    },
    toolLastPracticed: {
      ...(progress.toolLastPracticed ?? {}),
      [toolId]: now.toISOString(),
    },
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(freshDefaultState);
  const [ready, setReady] = useState(false);
  const [persistence, setPersistence] = useState<
    AppStateActions["persistence"]
  >({
    status: "loading",
    message: "Opening local data…",
    canRetry: false,
  });
  const persistenceEnabled = useRef(true);
  const pendingSave = useRef<AppState | null>(null);
  const saveInFlight = useRef(false);
  const latestState = useRef(state);
  const saveRetryCount = useRef(0);
  const saveTimer = useRef<number | null>(null);
  const [saveWake, setSaveWake] = useState(0);

  useEffect(() => {
    let active = true;
    void loadState()
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const validation = validateAppState(stored);
          if (!validation.valid)
            throw new Error(
              `Saved app data failed validation: ${validation.errors.join("; ")}`,
            );
          setState(normalizeAppState(validation.state, defaultState));
        }
        setPersistence({
          status: "saved",
          message: "Stored on this device",
          canRetry: false,
        });
      })
      .catch((reason) => {
        if (!active) return;
        persistenceEnabled.current = false;
        setPersistence({
          status: "error",
          message:
            reason instanceof Error
              ? reason.message
              : "Saved app data could not be opened.",
          canRetry: false,
        });
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const scheduleSave = useCallback((delay: number) => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      setSaveWake((current) => current + 1);
    }, delay);
  }, []);

  const flushPendingSave = useCallback(async () => {
    if (
      !persistenceEnabled.current ||
      saveInFlight.current ||
      !pendingSave.current
    )
      return;

    saveInFlight.current = true;
    const next = pendingSave.current;
    pendingSave.current = null;
    let saved = false;
    setPersistence({
      status: "saving",
      message: "Saving changes locally…",
      canRetry: false,
    });
    try {
      await saveState(next);
      saved = true;
      saveRetryCount.current = 0;
      setPersistence({
        status: "saved",
        message: "Stored on this device",
        canRetry: false,
      });
    } catch (reason) {
      pendingSave.current ??= latestState.current;
      saveRetryCount.current += 1;
      const retryDelay =
        [1_000, 3_000, 10_000][saveRetryCount.current - 1] ?? null;
      setPersistence({
        status: "error",
        message:
          reason instanceof Error
            ? `${reason.message}${retryDelay ? " Retrying automatically…" : " Your unsaved changes are still queued."}`
            : retryDelay
              ? "The latest changes could not be saved. Retrying automatically…"
              : "The latest changes could not be saved. Your changes are still queued.",
        canRetry: true,
      });
      if (retryDelay !== null) scheduleSave(retryDelay);
    } finally {
      saveInFlight.current = false;
      if (saved && pendingSave.current) scheduleSave(100);
    }
  }, [scheduleSave]);

  useEffect(() => {
    if (!ready || !persistenceEnabled.current) return;
    latestState.current = state;
    pendingSave.current = state;
    scheduleSave(650);
  }, [ready, scheduleSave, state]);

  useEffect(() => {
    if (!saveWake) return;
    void flushPendingSave();
  }, [flushPendingSave, saveWake]);

  useEffect(() => {
    if (!ready) return;
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden" && pendingSave.current)
        scheduleSave(0);
    };
    const flushWhenLeaving = () => {
      if (pendingSave.current) scheduleSave(0);
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("beforeunload", flushWhenLeaving);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("beforeunload", flushWhenLeaving);
    };
  }, [ready, scheduleSave]);

  useEffect(
    () => () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!ready) return;
    const missing = evaluateAchievements(state).filter(
      (achievement) =>
        achievement.unlocked && !state.achievementUnlocks?.[achievement.id],
    );
    if (!missing.length) return;
    const unlockedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      achievementUnlocks: {
        ...(current.achievementUnlocks ?? {}),
        ...Object.fromEntries(
          missing.map((achievement) => [achievement.id, unlockedAt]),
        ),
      },
    }));
  }, [ready, state.trades, state.marketDataSets, state.progress]);

  const updateProfile = useCallback(
    (profile: Profile) => setState((current) => ({ ...current, profile })),
    [],
  );
  const addPlan = useCallback(
    (plan: TradePlan) =>
      setState((current) => ({ ...current, plans: [plan, ...current.plans] })),
    [],
  );
  const addTrade = useCallback(
    (trade: Trade) =>
      setState((current) => ({
        ...current,
        trades: [trade, ...current.trades],
      })),
    [],
  );
  const addTrades = useCallback(
    (trades: Trade[]) =>
      setState((current) => {
        const known = new Set(
          current.trades.map((trade) => trade.sourceId).filter(Boolean),
        );
        const unique = trades
          .filter((trade) => !trade.sourceId || !known.has(trade.sourceId))
          .filter((trade) => {
            if (!trade.sourceId) return true;
            known.add(trade.sourceId);
            return true;
          });
        return unique.length
          ? { ...current, trades: [...unique, ...current.trades] }
          : current;
      }),
    [],
  );
  const updateTrade = useCallback(
    (trade: Trade) =>
      setState((current) => ({
        ...current,
        trades: current.trades.map((candidate) =>
          candidate.id === trade.id ? trade : candidate,
        ),
      })),
    [],
  );
  const updateFidelityImport = useCallback(
    (settings: FidelityImportSettings) =>
      setState((current) => ({ ...current, fidelityImport: settings })),
    [],
  );
  const addJournalGoal = useCallback(
    (goal: JournalGoal) =>
      setState((current) => ({
        ...current,
        journalGoals: [goal, ...(current.journalGoals ?? [])],
      })),
    [],
  );
  const updateJournalGoal = useCallback(
    (goal: JournalGoal) =>
      setState((current) => ({
        ...current,
        journalGoals: (current.journalGoals ?? []).map((candidate) =>
          candidate.id === goal.id ? goal : candidate,
        ),
      })),
    [],
  );
  const updateJournalDashboard = useCallback(
    (preferences: JournalDashboardPreferences) =>
      setState((current) => ({ ...current, journalDashboard: preferences })),
    [],
  );
  const addMarketDataSet = useCallback(
    (dataSet: MarketDataSet) =>
      setState((current) => ({
        ...current,
        marketDataSets: [
          dataSet,
          ...(current.marketDataSets ?? []).filter(
            (candidate) => candidate.id !== dataSet.id,
          ),
        ].slice(0, 8),
      })),
    [],
  );
  const removeMarketDataSet = useCallback(
    (dataSetId: string) =>
      setState((current) => ({
        ...current,
        marketDataSets: (current.marketDataSets ?? []).filter(
          (candidate) => candidate.id !== dataSetId,
        ),
      })),
    [],
  );
  const updateChartAcquisition = useCallback(
    (settings: ChartAcquisitionSettings) =>
      setState((current) => ({ ...current, chartAcquisition: settings })),
    [],
  );
  const updateChartWorkspace = useCallback(
    (preferences: ChartWorkspacePreferences) =>
      setState((current) => ({ ...current, chartWorkspace: preferences })),
    [],
  );
  const upsertPaperTradingSession = useCallback(
    (session: PaperTradingSession) =>
      setState((current) => ({
        ...current,
        paperTradingSessions: [
          session,
          ...(current.paperTradingSessions ?? []).filter(
            (candidate) => candidate.id !== session.id,
          ),
        ].slice(0, 50),
      })),
    [],
  );
  const removePaperTradingSession = useCallback(
    (sessionId: string) =>
      setState((current) => ({
        ...current,
        paperTradingSessions: (current.paperTradingSessions ?? []).filter(
          (session) => session.id !== sessionId,
        ),
      })),
    [],
  );
  const completeLesson = useCallback(
    (
      lessonId: string,
      confidence?: 1 | 2 | 3,
      evidence?: LessonPracticeEvidence,
    ) =>
      setState((current) => {
        const now = new Date();
        const activityDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const previousMastery =
          current.progress.lessonMastery?.[lessonId] ?? null;
        return {
          ...current,
          progress: {
            ...current.progress,
            completedLessonIds: current.progress.completedLessonIds.includes(
              lessonId,
            )
              ? current.progress.completedLessonIds
              : [...current.progress.completedLessonIds, lessonId],
            practiceAttempts: current.progress.practiceAttempts + 1,
            lessonConfidence: confidence
              ? { ...current.progress.lessonConfidence, [lessonId]: confidence }
              : current.progress.lessonConfidence,
            lessonActivityByDate: {
              ...current.progress.lessonActivityByDate,
              [activityDate]:
                (current.progress.lessonActivityByDate?.[activityDate] ?? 0) +
                1,
            },
            lessonLastPracticed: {
              ...(current.progress.lessonLastPracticed ?? {}),
              [lessonId]: now.toISOString(),
            },
            lessonMastery: evidence
              ? {
                  ...(current.progress.lessonMastery ?? {}),
                  [lessonId]: {
                    lessonVersion: evidence.lessonVersion,
                    attempts: (previousMastery?.attempts ?? 0) + 1,
                    lastPracticedAt: now.toISOString(),
                    objectiveChecks: evidence.objectiveChecks,
                    firstTryCorrect: evidence.firstTryCorrect,
                    correctionsCompleted: evidence.correctionsCompleted,
                    bestFirstTryPercent: Math.max(
                      previousMastery?.bestFirstTryPercent ?? 0,
                      evidence.objectiveChecks
                        ? Math.round(
                            (evidence.firstTryCorrect /
                              evidence.objectiveChecks) *
                              100,
                          )
                        : 100,
                    ),
                    practiceDays: Array.from(
                      new Set([
                        ...(previousMastery?.practiceDays ??
                          (previousMastery?.lastPracticedAt
                            ? [previousMastery.lastPracticedAt.slice(0, 10)]
                            : [])),
                        activityDate,
                      ]),
                    ).slice(-366),
                    totalCorrectionsCompleted:
                      (previousMastery?.totalCorrectionsCompleted ??
                        previousMastery?.correctionsCompleted ??
                        0) + evidence.correctionsCompleted,
                    standardPracticeDays: Array.from(
                      new Set([
                        ...(previousMastery?.standardPracticeDays ??
                          previousMastery?.practiceDays ??
                          []),
                        ...(evidence.standardMet ? [activityDate] : []),
                      ]),
                    ).slice(-366),
                    lastStandardMet: evidence.standardMet ?? false,
                    lastIndependentCases: evidence.independentCases ?? 0,
                    lastSuccessfulCases: evidence.successfulCases ?? 0,
                    bestRubricAverage: Math.max(
                      previousMastery?.bestRubricAverage ?? 0,
                      evidence.rubricAverage ?? 0,
                    ),
                  },
                }
              : current.progress.lessonMastery,
          },
        };
      }),
    [],
  );
  const recordLearningToolPractice = useCallback(
    (toolId: string) =>
      setState((current) => ({
        ...current,
        progress: progressWithToolPractice(
          current.progress,
          toolId,
          new Date(),
        ),
      })),
    [],
  );
  const recordConceptRecall = useCallback(
    (conceptId: string, rating: RecallRating) =>
      setState((current) => {
        const now = new Date();
        const progress = progressWithToolPractice(
          current.progress,
          "concept-recall",
          now,
        );
        return {
          ...current,
          progress: {
            ...progress,
            conceptRecall: {
              ...(progress.conceptRecall ?? {}),
              [conceptId]: buildRecallRecord(
                progress.conceptRecall?.[conceptId],
                rating,
                now,
              ),
            },
          },
        };
      }),
    [],
  );
  const installLessonPlan = useCallback(
    (plan: CustomLessonPlan) =>
      setState((current) => ({
        ...current,
        customLessonPlans: [
          plan,
          ...current.customLessonPlans.filter(
            (existing) => existing.plan_id !== plan.plan_id,
          ),
        ],
      })),
    [],
  );
  const removeLessonPlan = useCallback(
    (planId: string) =>
      setState((current) => ({
        ...current,
        customLessonPlans: current.customLessonPlans.filter(
          (plan) => plan.plan_id !== planId,
        ),
      })),
    [],
  );
  const completeOnboarding = useCallback(
    (profile: Profile) =>
      setState((current) => ({
        ...current,
        profile,
        onboardingComplete: true,
      })),
    [],
  );

  const retryPersistence = useCallback(() => {
    if (!ready || !persistenceEnabled.current) return;
    saveRetryCount.current = 0;
    pendingSave.current = latestState.current;
    scheduleSave(0);
  }, [ready, scheduleSave]);

  const replaceState = useCallback((replacement: AppState) => {
    const validation = validateAppState(replacement);
    if (!validation.valid)
      throw new Error(
        `Restored data failed validation: ${validation.errors.join("; ")}`,
      );
    persistenceEnabled.current = true;
    setState(normalizeAppState(validation.state, defaultState));
  }, []);
  const resetState = useCallback(() => {
    persistenceEnabled.current = true;
    setState(freshDefaultState());
  }, []);

  const value = useMemo<AppStateActions>(
    () => ({
      state,
      ready,
      persistence,
      retryPersistence,
      updateProfile,
      addPlan,
      addTrade,
      addTrades,
      updateTrade,
      updateFidelityImport,
      addJournalGoal,
      updateJournalGoal,
      updateJournalDashboard,
      completeLesson,
      recordLearningToolPractice,
      recordConceptRecall,
      installLessonPlan,
      removeLessonPlan,
      addMarketDataSet,
      removeMarketDataSet,
      updateChartAcquisition,
      updateChartWorkspace,
      upsertPaperTradingSession,
      removePaperTradingSession,
      replaceState,
      resetState,
      completeOnboarding,
    }),
    [
      state,
      ready,
      persistence,
      retryPersistence,
      updateProfile,
      addPlan,
      addTrade,
      addTrades,
      updateTrade,
      updateFidelityImport,
      addJournalGoal,
      updateJournalGoal,
      updateJournalDashboard,
      addMarketDataSet,
      removeMarketDataSet,
      updateChartAcquisition,
      updateChartWorkspace,
      upsertPaperTradingSession,
      removePaperTradingSession,
      completeLesson,
      recordLearningToolPractice,
      recordConceptRecall,
      installLessonPlan,
      removeLessonPlan,
      replaceState,
      resetState,
      completeOnboarding,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context)
    throw new Error("useAppState must be used within AppStateProvider");
  return context;
}
