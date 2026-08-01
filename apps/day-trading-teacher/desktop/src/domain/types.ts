export type TradeSide = "long" | "short";

export type Profile = {
  displayName: string;
  experience: "beginner" | "developing" | "advanced";
  broker: string;
  accountType: "cash" | "margin" | "paper";
  maxRiskPerTrade: string;
  dailyLossLimit: string;
  studyMinutes: 10 | 20 | 45 | 90;
  plainLanguage: boolean;
  reducedMotion: boolean;
  theme: "system" | "light" | "dark";
  startingBalance?: string;
  standaloneTools?: boolean;
};

export type PositionSizeResult = {
  technical_risk_per_unit: string;
  risk_per_unit: string;
  quantity: number;
  planned_risk: string;
  binding_constraint: string;
};

export type TradePlan = {
  id: string;
  symbol: string;
  side: TradeSide;
  setup: string;
  thesis: string;
  trigger?: string;
  entry: string;
  stop: string;
  target: string;
  executionPlan?: string;
  exitPlan?: string;
  timeStop?: string;
  maximumRisk: string;
  slippagePerUnit: string;
  plannedQuantity: number;
  plannedRisk: string;
  noTradeConditions: string;
  sourceLessonId?: string;
  sourceLessonTitle?: string;
  createdAt: string;
  lockedAt: string | null;
};

export type TradeReview = {
  processClassification: "strong" | "adequate" | "weak" | "not_scorable";
  outcome: "profitable" | "losing" | "flat";
  processScore: number | null;
  dataQuality: "complete" | "partial";
  strength: string;
  primaryCorrection: string;
  evidence: string[];
  assignedLessonId: string;
};

export type JournalReflection = {
  status: "needs_review" | "reviewed";
  setup: string;
  marketContext: string;
  entryReason: string;
  exitReason: string;
  whatWentWell: string;
  whatToImprove: string;
  emotionBefore: string;
  emotionAfter: string;
  focusRating: number | null;
  tags: string[];
  reviewedAt: string | null;
  strategy?: string;
  mistakes?: string[];
  lessonsLearned?: string;
  confidenceRating?: number | null;
  preTradeChecklist?: Record<string, boolean>;
  postTradeChecklist?: Record<string, boolean>;
  screenshotRefs?: string[];
};

export type Trade = {
  id: string;
  symbol: string;
  side: TradeSide;
  entry: string;
  exit: string;
  quantity: string;
  fees: string;
  planId: string | null;
  followedPlan: boolean;
  respectedStop: boolean;
  notes: string;
  occurredAt: string;
  grossPnl: string;
  netPnl: string;
  rMultiple: string | null;
  review: TradeReview;
  importSource?: "manual" | "fidelity_csv";
  sourceId?: string;
  entryAt?: string;
  exitAt?: string;
  holdingSeconds?: number;
  orderType?: string;
  journal?: JournalReflection;
};

export type MarketBar = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type MarketDataSet = {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  sourceType: "csv" | "sample" | "provider";
  sourceFile: string;
  importedAt: string;
  bars: MarketBar[];
  provider?: MarketDataProvider;
  feed?: string;
  freshness?: string;
  session?: "regular" | "extended";
  adjusted?: boolean;
  importSummary?: {
    firstTimestamp: string;
    lastTimestamp: string;
    indicatorColumns: string[];
    discontinuityCount: number;
    matchedTradeCount: number;
  };
};

export type MarketDataProvider =
  "massive" | "alpaca" | "tradier" | "alpha_vantage";

export type ChartAcquisitionSubscription = {
  provider: MarketDataProvider;
  symbol: string;
  interval: "daily" | "1min";
};

export type ChartAcquisitionSettings = {
  provider: MarketDataProvider;
  subscriptions: ChartAcquisitionSubscription[];
  autoRefresh: boolean;
  refreshIntervalHours: number;
  intradayRefreshMinutes: number;
  lastRefreshAt: string | null;
  lastDailyRefreshAt: string | null;
  lastOneMinuteRefreshAt: string | null;
  lastRefreshMessage: string;
};

export type ChartStylePreference = "candles" | "hollow" | "line";
export type ChartLowerStudy = "volume" | "rsi" | "macd" | "atr" | "none";
export type ChartScaleMode = "linear" | "log";
export type ChartTemplateId =
  "price_action" | "trend" | "momentum" | "risk_review" | "custom";

export type ChartOverlayPreferences = {
  fast: boolean;
  slow: boolean;
  ema: boolean;
  vwap: boolean;
  bollinger: boolean;
  recorded: boolean;
  simulation: boolean;
  paper: boolean;
};

export type ChartWorkspacePreferences = {
  templateId: ChartTemplateId;
  style: ChartStylePreference;
  lowerStudy: ChartLowerStudy;
  scaleMode: ChartScaleMode;
  crosshair: boolean;
  gridLines: boolean;
  extremeLabels: boolean;
  extendedHours: boolean;
  overlays: ChartOverlayPreferences;
};

export type PaperOrderType = "market" | "limit";
export type PaperOrderAction = "open_long" | "open_short" | "close_position";

export type PaperTradingOrder = {
  id: string;
  action: PaperOrderAction;
  type: PaperOrderType;
  quantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  submittedAt: string;
  submittedBarIndex: number;
};

export type PaperTradingPosition = {
  id: string;
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  entryAt: string;
  entryBarIndex: number;
  stopPrice: number;
  targetPrice: number | null;
  initialRisk: number;
  entryFee: number;
};

export type PaperTradingTrade = {
  id: string;
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryAt: string;
  exitAt: string;
  entryBarIndex: number;
  exitBarIndex: number;
  grossPnl: number;
  netPnl: number;
  rMultiple: number;
  exitReason:
    "stop" | "target" | "manual" | "session_end" | "ambiguous_stop_first";
};

export type PaperTradingEvent = {
  id: string;
  kind: "session" | "order" | "fill" | "risk" | "exit";
  at: string;
  barIndex: number;
  message: string;
};

export type PaperTradingSession = {
  id: string;
  dataSetId: string;
  symbol: string;
  timeframe: string;
  status: "active" | "completed";
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
  startingBalance: number;
  realizedPnl: number;
  feesPaid: number;
  peakEquity: number;
  maxDrawdown: number;
  maxRiskPerTrade: number;
  dailyLossLimit: number;
  slippagePerShare: number;
  commissionPerOrder: number;
  replayIndex: number;
  lastProcessedBarIndex: number;
  pendingOrder: PaperTradingOrder | null;
  position: PaperTradingPosition | null;
  trades: PaperTradingTrade[];
  events: PaperTradingEvent[];
};

export type FidelityImportSettings = {
  folderPath: string;
  autoScan: boolean;
  lastScanAt: string | null;
  lastFileKey: string | null;
};

export type JournalGoalMetric =
  | "reflection_rate"
  | "plan_coverage"
  | "rule_adherence"
  | "weekly_reflections"
  | "maximum_daily_loss"
  | "focused_execution";

export type JournalGoal = {
  id: string;
  title: string;
  metric: JournalGoalMetric;
  target: number;
  period: "weekly" | "monthly";
  createdAt: string;
  archivedAt: string | null;
};

export type JournalDashboardPreferences = {
  defaultRange: "day" | "week" | "month" | "quarter" | "year" | "all";
  calendarMetric: "pnl" | "activity" | "reflection" | "discipline";
  compactCards: boolean;
  visibleWidgets: Array<"performance" | "insights" | "records" | "activity">;
};

export type LessonSection = {
  type:
    | "retrieval"
    | "explanation"
    | "worked_example"
    | "practice"
    | "transfer"
    | "commitment"
    | "remediation";
  title: string;
  body: string;
  assessment_phase?:
    | "instruction"
    | "independent_performance"
    | "review"
    | "retention"
    | "remediation";
  prompt?: string;
  answer?: string;
  check?: {
    kind: "single_choice";
    options: string[];
    correctOption: number;
    success: string;
    correction: string;
  };
};

export type LessonMasteryStandard = {
  minimum_first_try_correct: number;
  unseen_cases_required: number;
  minimum_successful_cases: number;
  minimum_rubric_level: 1 | 2 | 3;
  retention_practice_dates: number;
  remediation: string;
};

export type LessonSessionBlock = {
  title: string;
  minutes: number;
  focus: string;
};

export type LessonSource = {
  title: string;
  url?: string;
  last_verified?: string;
  currency_note?: string;
};

export type LessonTimeModel = {
  required_instruction_and_initial_minutes?: number;
  required_two_session_capstone_minutes?: number;
  required_delayed_retention_minutes: number;
  conditional_remediation_minutes?: number;
  conditional_remediation_minutes_per_form?: number;
};

export type LessonAssessmentAdministration = {
  minimum_case_minutes?: number;
  scoring_target?: string;
  key_separation: string;
  not_scorable_policy?: Record<string, string>;
  packet_release: string;
  replacement_policy: string;
  active_case_bank: string;
};

export type LessonCalculationExample = {
  entry: string;
  stop: string;
  maximum_risk: string;
  slippage_per_unit: string;
  side: TradeSide;
  expected_quantity: number;
};

export type Lesson = {
  lesson_id: string;
  version: string;
  title: string;
  skill_ids: string[];
  objective: string;
  estimated_minutes: number;
  sections: LessonSection[];
  mastery_criteria: string[];
  mastery_standard?: LessonMasteryStandard;
  curriculum_role?: "core" | "extension" | "remediation" | "assessment";
  extension_of?: string;
  extension_focus?: string;
  session_blocks?: LessonSessionBlock[];
  sources?: LessonSource[];
  calculation_examples?: LessonCalculationExample[];
  materials_index?: string;
  time_model?: LessonTimeModel;
  delivery_schedule?: string[];
  mastery_evidence?: string[];
  assessment_administration?: LessonAssessmentAdministration;
  assessment_rule?: string;
};

export type LessonPlanScopeBoundary = {
  included: string[];
  excluded: string[];
  certification_boundary: string;
};

export type LessonPlanAssessmentSecurity = {
  learner_distribution: string;
  outcome_hiding: string;
  replacement_forms: string;
  certification_boundary: string;
  public_exposure_rule: string;
};

export type CustomLessonPlan = {
  schema_version: "1.0";
  plan_id: string;
  version: string;
  title: string;
  origin: {
    type: "external_generated" | "user_authored";
    provider: string;
    model?: string;
  };
  target_skill_ids: string[];
  prerequisites: string[];
  lessons: Lesson[];
  sources: Array<{
    title: string;
    url?: string;
    last_verified?: string;
    currency_note?: string;
  }>;
  created_at: string;
  scope_boundary?: LessonPlanScopeBoundary;
  required_program_minutes?: number;
  conditional_remediation_minutes?: string;
  assessment_security?: LessonPlanAssessmentSecurity;
  importedAt: string;
  fileHash: string;
};

export type Progress = {
  completedLessonIds: string[];
  practiceAttempts: number;
  lessonConfidence?: Record<string, 1 | 2 | 3>;
  lessonActivityByDate?: Record<string, number>;
  lessonLastPracticed?: Record<string, string>;
  lessonMastery?: Record<string, LessonMasteryRecord>;
  toolPracticeAttempts?: number;
  toolActivityByDate?: Record<string, number>;
  toolLastPracticed?: Record<string, string>;
  conceptRecall?: Record<string, ConceptRecallRecord>;
};

export type LessonMasteryRecord = {
  lessonVersion: string;
  attempts: number;
  lastPracticedAt: string;
  objectiveChecks: number;
  firstTryCorrect: number;
  correctionsCompleted: number;
  bestFirstTryPercent: number;
  practiceDays?: string[];
  totalCorrectionsCompleted?: number;
  standardPracticeDays?: string[];
  lastStandardMet?: boolean;
  lastIndependentCases?: number;
  lastSuccessfulCases?: number;
  bestRubricAverage?: number;
};

export type LessonPracticeEvidence = {
  lessonVersion: string;
  objectiveChecks: number;
  firstTryCorrect: number;
  correctionsCompleted: number;
  standardMet?: boolean;
  independentCases?: number;
  successfulCases?: number;
  rubricAverage?: number;
};

export type ConceptRecallRecord = {
  strength: 0 | 1 | 2 | 3;
  attempts: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  lastRating: "again" | "hard" | "good";
};

export type AppState = {
  schemaVersion: 1;
  onboardingComplete?: boolean;
  profile: Profile;
  plans: TradePlan[];
  trades: Trade[];
  customLessonPlans: CustomLessonPlan[];
  progress: Progress;
  fidelityImport?: FidelityImportSettings;
  journalGoals?: JournalGoal[];
  journalDashboard?: JournalDashboardPreferences;
  achievementUnlocks?: Record<string, string>;
  marketDataSets?: MarketDataSet[];
  chartAcquisition?: ChartAcquisitionSettings;
  chartWorkspace?: ChartWorkspacePreferences;
  paperTradingSessions?: PaperTradingSession[];
};
