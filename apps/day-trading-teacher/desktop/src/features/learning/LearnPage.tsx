import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BrainCircuit,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileUp,
  Lightbulb,
  LockKeyhole,
  Rocket,
  Route,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import {
  LessonActivityWorkspacePrompt,
  LessonPracticeHub,
  LessonWorkspaceLinks,
} from "../../components/LessonPracticeHub";
import { builtInLessons } from "../../domain/builtin-lessons";
import {
  loadBundledLessonPlans,
  type ReviewableLessonPlan,
} from "../../domain/bundled-lesson-plans";
import { corePathStages } from "../../domain/core-path";
import { getSkillTitle } from "../../domain/skills";
import { sha256 } from "../../domain/lesson-plan-schema";
import {
  buildExternalLessonPrompt,
  type ExternalLessonRequest,
} from "../../domain/lesson-plan-prompt";
import { validateLessonPlanAtBoundary } from "../../platform/bridge";
import { useAppState } from "../../state/AppStateContext";
import type { CustomLessonPlan, Lesson } from "../../domain/types";
import { xpRules } from "../../domain/engagement";
import { recommendLessonPractice } from "../../domain/learning-schedule";
import { summarizeImportedLessonPlan } from "../../domain/imported-lesson-plan";
import {
  clearLessonWorkspaceContext,
  consumeLessonWorkspaceContext,
  saveLessonWorkspaceContext,
  type LessonSessionSnapshot,
} from "../../domain/lesson-session";
import { lessonRationaleFor } from "../../domain/lesson-rationale";
import {
  buildOptionOrder,
  createAssessmentSeed,
  emptyRubricScores,
  evaluateMasteryStandard,
  masteryStandardFor,
  rubricDimensions,
  rubricLevelLabels,
  type RubricScores,
} from "../../domain/lesson-assessment";
import {
  lessonWorkspacesFor,
  type LessonWorkspaceMission,
} from "../../domain/lesson-workspaces";
import {
  evaluateAchievements,
  lessonAchievementIdFor,
} from "../../domain/achievements";
import { CoreLearningPath } from "./CoreLearningPath";

const ImportedLessonLibrary = lazy(() =>
  import("./ImportedLessonLibrary").then((module) => ({
    default: module.ImportedLessonLibrary,
  })),
);

type LessonStage = "intro" | "activity" | "reflection" | "celebration";

const coachingCues: Record<Lesson["sections"][number]["type"], string> = {
  retrieval:
    "Pull the idea from memory before looking for help. Effort here strengthens recall.",
  explanation:
    "Connect this idea to something you already understand. Look for the why, not just the rule.",
  worked_example:
    "Follow each decision in order. Notice where the constraint changes the answer.",
  practice:
    "Make the decision yourself. A careful no-trade choice is still a complete decision.",
  transfer:
    "The surface details changed. Find the principle that stayed the same.",
  commitment:
    "Turn the idea into a specific action you can recognize and repeat later.",
  remediation:
    "Repair one weak dimension with a fresh case. Do not reuse a revealed prompt or memorize its outcome.",
};

const sectionGuide: Record<Lesson["sections"][number]["type"], string> = {
  retrieval:
    "Answer from memory first; accuracy matters less than making an honest attempt.",
  explanation:
    "Study the principle and connect it to a decision you may face in the ticket.",
  worked_example:
    "Follow the evidence and calculation in order before generalizing the result.",
  practice:
    "Make the decision yourself, then compare your reasoning with the guide.",
  transfer:
    "Apply the same principle after the prices, direction, or context changes.",
  commitment:
    "Convert the lesson into one observable action for your next workflow.",
  remediation:
    "Review the failed dimension, then apply the correction to a fresh unopened case.",
};

const humanizeLessonLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function requestFor(skillIds: string[], level: string): ExternalLessonRequest {
  return {
    schema_version: "1.0",
    request_id: crypto.randomUUID(),
    curriculum_version: "5.0",
    learner_level: level,
    target_skill_ids: skillIds,
    learning_goals: skillIds.map(getSkillTitle),
    accessibility_preferences: {
      plain_language: true,
      visual_alternative_required: true,
    },
    requested_lesson_count: 3,
    allowed_instruments: ["equity", "etf"],
    prohibited_content: [
      "live trade signals",
      "personalized security recommendations",
      "profit promises",
      "options calculations",
    ],
  };
}

export function LearnPage() {
  const { state, completeLesson, installLessonPlan, removeLessonPlan } =
    useAppState();
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [lessonStep, setLessonStep] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [lessonStage, setLessonStage] = useState<LessonStage>("intro");
  const [confidence, setConfidence] = useState<1 | 2 | 3 | null>(null);
  const [lessonWasComplete, setLessonWasComplete] = useState(false);
  const [confidenceWasRecorded, setConfidenceWasRecorded] = useState(false);
  const [lessonAchievementWasUnlocked, setLessonAchievementWasUnlocked] =
    useState(false);
  const [resumedFromWorkspace, setResumedFromWorkspace] = useState("");
  const [resumedEvidenceArtifact, setResumedEvidenceArtifact] = useState("");
  const [responseReviews, setResponseReviews] = useState<
    Record<number, "matched" | "corrected">
  >({});
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [checkChoices, setCheckChoices] = useState<Record<number, number>>({});
  const [checkAttempts, setCheckAttempts] = useState<Record<number, number>>(
    {},
  );
  const [passedChecks, setPassedChecks] = useState<Set<number>>(new Set());
  const [firstTryChecks, setFirstTryChecks] = useState<Set<number>>(new Set());
  const [assessmentSeed, setAssessmentSeed] = useState(createAssessmentSeed);
  const [independentCases, setIndependentCases] = useState(0);
  const [successfulCases, setSuccessfulCases] = useState(0);
  const [rubricScores, setRubricScores] =
    useState<RubricScores>(emptyRubricScores);
  const [importRaw, setImportRaw] = useState("");
  const [importReport, setImportReport] = useState<Awaited<
    ReturnType<typeof validateLessonPlanAtBoundary>
  > | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [removePlanId, setRemovePlanId] = useState<string | null>(null);
  const [bundledPlanCatalog, setBundledPlanCatalog] = useState<
    ReviewableLessonPlan[]
  >([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const lessonBodyRef = useRef<HTMLDivElement>(null);
  const resumeAttemptedRef = useRef(false);
  const customLessons = useMemo(
    () =>
      state.customLessonPlans.flatMap((plan) =>
        plan.lessons.map((lesson) => ({ ...lesson, planId: plan.plan_id })),
      ),
    [state.customLessonPlans],
  );
  const allLessons = useMemo(
    () => [...builtInLessons, ...customLessons],
    [customLessons],
  );
  const achievementSnapshot = useMemo(
    () => evaluateAchievements(state),
    [state],
  );
  const lessonAchievementByLesson = useMemo(
    () =>
      Object.fromEntries(
        achievementSnapshot
          .filter((achievement) => achievement.lessonId)
          .map((achievement) => [achievement.lessonId!, achievement]),
      ),
    [achievementSnapshot],
  );
  const assignedLesson = builtInLessons.find(
    (lesson) => lesson.lesson_id === state.trades[0]?.review.assignedLessonId,
  );
  const focusSkills = assignedLesson?.skill_ids.slice(0, 3) ?? ["RM-004"];
  const recommendedPractice = useMemo(
    () => recommendLessonPractice(state.progress, builtInLessons),
    [state.progress],
  );

  useEffect(() => {
    if (resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;
    const context = consumeLessonWorkspaceContext();
    if (!context) return;
    const lesson = allLessons.find(
      (candidate) => candidate.lesson_id === context.lessonId,
    );
    if (!lesson) return;
    const session = context.session;
    setSelected(lesson);
    setLessonStage(session.stage);
    setLessonStep(Math.min(session.step, lesson.sections.length - 1));
    setRevealed(new Set(session.revealed));
    setResponses(session.responses);
    setResponseReviews(session.responseReviews);
    setCorrections(session.corrections);
    setCheckChoices(session.checkChoices);
    setCheckAttempts(session.checkAttempts);
    setPassedChecks(new Set(session.passedChecks));
    setFirstTryChecks(new Set(session.firstTryChecks));
    setConfidence(session.confidence);
    setLessonWasComplete(session.lessonWasComplete);
    setConfidenceWasRecorded(session.confidenceWasRecorded);
    setLessonAchievementWasUnlocked(session.lessonAchievementWasUnlocked);
    setAssessmentSeed(session.assessmentSeed ?? createAssessmentSeed());
    setIndependentCases(session.independentCases ?? 0);
    setSuccessfulCases(session.successfulCases ?? 0);
    setRubricScores({
      ...emptyRubricScores(),
      ...(session.rubricScores ?? {}),
    } as RubricScores);
    setResumedFromWorkspace(context.workspaceTitle);
    setResumedEvidenceArtifact(context.evidenceReady ? context.artifact : "");
  }, [allLessons]);

  useEffect(() => {
    let active = true;
    void loadBundledLessonPlans()
      .then((plans) => {
        if (active) setBundledPlanCatalog(plans);
      })
      .catch(() => {
        if (active) setBundledPlanCatalog([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const openLesson = (lesson: Lesson) => {
    clearLessonWorkspaceContext();
    setSelected(lesson);
    setRevealed(new Set());
    setLessonStep(0);
    setResponses({});
    setLessonStage("intro");
    setConfidence(null);
    setResponseReviews({});
    setCorrections({});
    setCheckChoices({});
    setCheckAttempts({});
    setPassedChecks(new Set());
    setFirstTryChecks(new Set());
    setAssessmentSeed(createAssessmentSeed());
    setIndependentCases(0);
    setSuccessfulCases(0);
    setRubricScores(emptyRubricScores());
    setResumedFromWorkspace("");
    setResumedEvidenceArtifact("");
    setLessonWasComplete(
      state.progress.completedLessonIds.includes(lesson.lesson_id),
    );
    setConfidenceWasRecorded(
      Boolean(state.progress.lessonConfidence?.[lesson.lesson_id]),
    );
    const achievementId = lessonAchievementIdFor(lesson.lesson_id);
    setLessonAchievementWasUnlocked(
      Boolean(
        achievementId &&
        achievementSnapshot.find(
          (achievement) => achievement.id === achievementId,
        )?.unlocked,
      ),
    );
  };

  const closeLesson = () => {
    clearLessonWorkspaceContext();
    setSelected(null);
    setResumedFromWorkspace("");
    setResumedEvidenceArtifact("");
  };

  const preserveLessonForReturn = (workspace: LessonWorkspaceMission) => {
    if (!selected) return;
    const session: LessonSessionSnapshot = {
      stage: lessonStage,
      step: lessonStep,
      revealed: [...revealed],
      responses,
      responseReviews,
      corrections,
      checkChoices,
      checkAttempts,
      passedChecks: [...passedChecks],
      firstTryChecks: [...firstTryChecks],
      confidence,
      lessonWasComplete,
      confidenceWasRecorded,
      lessonAchievementWasUnlocked,
      assessmentSeed,
      independentCases,
      successfulCases,
      rubricScores,
    };
    saveLessonWorkspaceContext({
      lessonId: selected.lesson_id,
      lessonTitle: selected.title,
      workspaceId: workspace.id,
      workspaceTitle: workspace.title,
      purpose: workspace.purpose,
      artifact: workspace.artifact,
      labTool: workspace.labTool,
      journalTab: workspace.journalTab,
      activityTitle: selected.sections[lessonStep]?.title,
      savedAt: new Date().toISOString(),
      session,
    });
  };

  const selectedPathStage = selected
    ? corePathStages.find((stage) =>
        stage.lessonIds.includes(selected.lesson_id),
      )
    : undefined;
  const activeSection = selected?.sections[lessonStep];
  const activeAttemptRequired = Boolean(activeSection?.prompt);
  const activeAttempted = activeSection?.check
    ? passedChecks.has(lessonStep)
    : Boolean(responses[lessonStep]?.trim());
  const activeFeedbackReviewed = activeSection?.check
    ? passedChecks.has(lessonStep)
    : !activeSection?.answer ||
      (revealed.has(lessonStep) &&
        Boolean(responseReviews[lessonStep]) &&
        (responseReviews[lessonStep] !== "corrected" ||
          Boolean(corrections[lessonStep]?.trim())));
  const canAdvance =
    (!activeAttemptRequired || activeAttempted) && activeFeedbackReviewed;
  const objectiveCheckCount = selected
    ? selected.sections.filter((section) => section.check).length
    : 0;
  const correctionsCompleted = Object.values(responseReviews).filter(
    (review) => review === "corrected",
  ).length;
  const firstTryPercent = objectiveCheckCount
    ? Math.round((firstTryChecks.size / objectiveCheckCount) * 100)
    : 100;
  const masteryStandard = selected ? masteryStandardFor(selected) : null;
  const masteryEvaluation = masteryStandard
    ? evaluateMasteryStandard(
        masteryStandard,
        firstTryChecks.size,
        independentCases,
        successfulCases,
        rubricScores,
      )
    : null;
  const linkedAchievement = selected
    ? lessonAchievementByLesson[selected.lesson_id]
    : undefined;
  const selectedImportedPlan = selected
    ? state.customLessonPlans.find((plan) =>
        plan.lessons.some((lesson) => lesson.lesson_id === selected.lesson_id),
      )
    : undefined;
  const selectedImportedLessonIndex =
    selected && selectedImportedPlan
      ? selectedImportedPlan.lessons.findIndex(
          (lesson) => lesson.lesson_id === selected.lesson_id,
        )
      : -1;
  const selectedSources =
    selected?.sources ?? selectedImportedPlan?.sources ?? [];
  const importSummary = importReport?.plan
    ? summarizeImportedLessonPlan(importReport.plan)
    : null;
  const availableBundledPlans = bundledPlanCatalog.filter(
    (plan) =>
      !state.customLessonPlans.some(
        (installed) => installed.plan_id === plan.plan_id,
      ),
  );

  const chooseCheckAnswer = (option: number) => {
    if (!activeSection?.check || passedChecks.has(lessonStep)) return;
    const priorAttempts = checkAttempts[lessonStep] ?? 0;
    setCheckChoices((current) => ({ ...current, [lessonStep]: option }));
    setCheckAttempts((current) => ({
      ...current,
      [lessonStep]: (current[lessonStep] ?? 0) + 1,
    }));
    if (option !== activeSection.check.correctOption) return;
    setPassedChecks((current) => new Set(current).add(lessonStep));
    setRevealed((current) => new Set(current).add(lessonStep));
    if (priorAttempts === 0)
      setFirstTryChecks((current) => new Set(current).add(lessonStep));
  };

  const resetLessonScroll = () => {
    window.requestAnimationFrame(() => {
      lessonBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  const moveToLessonStage = (stage: LessonStage) => {
    setLessonStage(stage);
    resetLessonScroll();
  };

  const moveToLessonStep = (step: number) => {
    setLessonStep(step);
    resetLessonScroll();
  };

  const exportRequest = () => {
    const request = requestFor(focusSkills, state.profile.experience);
    downloadJson(
      `lesson-plan-request_${new Date().toISOString().slice(0, 10)}.json`,
      request,
    );
  };

  const copyPrompt = async () => {
    const request = requestFor(focusSkills, state.profile.experience);
    setCopyError("");
    try {
      await navigator.clipboard.writeText(buildExternalLessonPrompt(request));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(
        "Clipboard access was unavailable. Export the request file instead.",
      );
    }
  };

  const chooseFile = () => fileRef.current?.click();
  const reviewBundledPlan = async (plan: ReviewableLessonPlan) => {
    const raw = JSON.stringify(plan, null, 2);
    const report = await validateLessonPlanAtBoundary(raw);
    setImportRaw(raw);
    setImportReport(report);
    setImportOpen(true);
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 500_000)
        throw new Error("The lesson file exceeds the 500 KB safety limit.");
      const raw = await file.text();
      const report = await validateLessonPlanAtBoundary(raw);
      setImportRaw(raw);
      setImportReport(report);
    } catch (reason) {
      setImportRaw("");
      setImportReport({
        valid: false,
        errors: [
          reason instanceof Error
            ? reason.message
            : "The lesson file could not be read.",
        ],
        warnings: [],
      });
    } finally {
      setImportOpen(true);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const install = async () => {
    if (!importReport?.valid || !importReport.plan) return;
    const plan: CustomLessonPlan = {
      ...importReport.plan,
      importedAt: new Date().toISOString(),
      fileHash: await sha256(importRaw),
    };
    installLessonPlan(plan);
    setImportOpen(false);
    setImportReport(null);
    setImportRaw("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Lesson workspace"
        title="Learn, apply, reflect, and return"
        description="Lessons are the center of the app. Each one teaches a decision, connects it to the right practice workspace, and closes the loop with reflection and spaced retrieval."
        actions={
          <>
            <button className="button secondary" onClick={chooseFile}>
              <FileUp size={16} />
              Import custom lesson
            </button>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept=".json,.dtlesson.json,application/json"
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
          </>
        }
      />

      <section
        className="learning-prescription"
        aria-labelledby="learning-prescription-title"
      >
        <span>
          {recommendedPractice.kind === "review" ? (
            <Clock3 size={20} />
          ) : (
            <Route size={20} />
          )}
        </span>
        <div>
          <small>Your next learning move</small>
          <h2 id="learning-prescription-title">
            {recommendedPractice.lesson
              ? `${recommendedPractice.kind === "review" ? "Retrieve again: " : "Continue the path: "}${recommendedPractice.lesson.title}`
              : "Let the lesson spacing work"}
          </h2>
          <p>{recommendedPractice.reason}</p>
        </div>
        {recommendedPractice.lesson ? (
          <button
            className="button secondary"
            type="button"
            onClick={() => openLesson(recommendedPractice.lesson!)}
          >
            {recommendedPractice.kind === "review"
              ? "Begin retrieval"
              : "Open lesson"}
            <ChevronRight size={16} />
          </button>
        ) : (
          <Link to="/learn/tools" className="button secondary">
            Use a short lab
            <ChevronRight size={16} />
          </Link>
        )}
      </section>

      <LessonPracticeHub />

      <CoreLearningPath
        lessons={builtInLessons}
        completedLessonIds={state.progress.completedLessonIds}
        lessonMastery={state.progress.lessonMastery}
        lessonAchievements={lessonAchievementByLesson}
        onOpen={openLesson}
      />

      <section
        className="learning-lab-invite section-gap"
        aria-labelledby="learning-lab-invite-title"
      >
        <div className="learning-lab-invite-icon">
          <BrainCircuit size={27} />
        </div>
        <div>
          <span className="eyebrow accent">Short practice between lessons</span>
          <h2 id="learning-lab-invite-title">Open the Learning Lab</h2>
          <p>
            Reinforce one weak link with risk sizing, expectancy, decision
            order, plan quality, or spaced recall—without needing to place a
            trade.
          </p>
          <div className="learning-lab-topics" aria-label="Learning Lab topics">
            <span>
              <Calculator size={14} /> Risk
            </span>
            <span>
              <BrainCircuit size={14} /> Decisions
            </span>
            <span>
              <Clipboard size={14} /> Plan evidence
            </span>
          </div>
        </div>
        <Link to="/learn/tools" className="button secondary">
          Start a focused drill
          <ChevronRight size={16} />
        </Link>
      </section>

      <details className="external-lesson-guide section-gap">
        <summary>
          <span>
            <Sparkles size={18} />
            <span>
              <strong>Need a different lesson?</strong>
              <small>
                Create one externally with ChatGPT, then import it safely.
              </small>
            </span>
          </span>
          <ChevronRight size={18} />
        </summary>
        <div className="external-lesson-body">
          <div
            className="workflow-strip"
            aria-label="Custom lesson plan workflow"
          >
            <div className="workflow-step">
              <span>1</span>
              <div>
                <strong>Copy a safe request</strong>
                <small>
                  The prompt includes learning needs, not your journal.
                </small>
              </div>
            </div>
            <div className="workflow-step">
              <span>2</span>
              <div>
                <strong>Use ChatGPT separately</strong>
                <small>Save its JSON response as a file.</small>
              </div>
            </div>
            <div className="workflow-step">
              <span>3</span>
              <div>
                <strong>Import and approve</strong>
                <small>The app validates the file locally first.</small>
              </div>
            </div>
          </div>
          <div className="data-actions">
            <button className="button secondary" onClick={copyPrompt}>
              {copied ? <Check size={16} /> : <Clipboard size={16} />}
              {copied ? "Prompt copied" : "Copy ChatGPT prompt"}
            </button>
            <button className="button secondary" onClick={exportRequest}>
              <Download size={16} />
              Export request JSON
            </button>
            <button className="button primary" onClick={chooseFile}>
              <FileUp size={16} />
              Import finished plan
            </button>
          </div>
          <div className="callout section-gap">
            <LockKeyhole size={18} />
            <p>
              Nothing is sent automatically. You choose what to share and
              approve every imported file after local validation.
            </p>
          </div>
          {copyError ? (
            <div className="error-message" role="alert">
              {copyError}
            </div>
          ) : null}
        </div>
      </details>

      {availableBundledPlans.map((plan) => {
        const summary = summarizeImportedLessonPlan(plan);
        return (
          <section className="bundled-plan-invite" key={plan.plan_id}>
            <span className="bundled-plan-invite-icon">
              <Sparkles size={22} />
            </span>
            <div>
              <span className="eyebrow accent">
                {plan.assessment_security
                  ? "Learner-safe curriculum included"
                  : "Expanded practice plan included"}
              </span>
              <h2>{plan.title}</h2>
              <p>
                {summary.lessonCount} sequenced lessons · {summary.totalMinutes}{" "}
                minutes · {summary.objectiveCheckCount} objective checks ·
                tailored Decision Card, Chart Replay, Journal, and Learning Lab
                missions.
              </p>
              <small>
                {plan.assessment_security
                  ? `${plan.assessment_security.learner_distribution} ${plan.assessment_security.certification_boundary}`
                  : "This externally authored plan remains optional and will open in the same local review screen before installation."}
              </small>
            </div>
            <button
              className="button primary"
              onClick={() => void reviewBundledPlan(plan)}
            >
              Review included plan
              <ChevronRight size={16} />
            </button>
          </section>
        );
      })}

      {state.customLessonPlans.length > 0 ? (
        <Suspense
          fallback={
            <div className="imported-library-loading" role="status">
              Preparing your imported curriculum…
            </div>
          }
        >
          <ImportedLessonLibrary
            plans={state.customLessonPlans}
            progress={state.progress}
            availableUpdates={bundledPlanCatalog}
            onOpenLesson={openLesson}
            onRemovePlan={setRemovePlanId}
            onReviewUpdate={(plan) => void reviewBundledPlan(plan)}
          />
        </Suspense>
      ) : null}

      {selected ? (
        <Modal
          wide
          title={selected.title}
          description={selected.objective}
          bodyRef={lessonBodyRef}
          onClose={closeLesson}
        >
          {resumedFromWorkspace ? (
            <div className="lesson-resume-note" role="status">
              <Check size={16} />
              <span>
                <strong>Lesson resumed after {resumedFromWorkspace}</strong>
                <small>
                  {resumedEvidenceArtifact
                    ? `Evidence marked ready: ${resumedEvidenceArtifact}. Compare it with the lesson reasoning before moving on.`
                    : "Your activity position, attempts, and corrections were kept for this app session."}
                </small>
              </span>
            </div>
          ) : null}
          {lessonStage === "intro" ? (
            <div className="lesson-intro">
              <div className="lesson-intro-visual">
                <span className="intro-orbit one" />
                <span className="intro-orbit two" />
                <span className="intro-core">
                  <Rocket size={31} />
                </span>
              </div>
              <span className="eyebrow">
                {selectedPathStage
                  ? `Core path · Phase ${selectedPathStage.phase} · ${selectedPathStage.title}`
                  : selectedImportedPlan
                    ? `Imported plan · Lesson ${selectedImportedLessonIndex + 1} of ${selectedImportedPlan.lessons.length}`
                    : "Personalized lesson briefing"}
              </span>
              <h3>{selected.title}</h3>
              <p className="lesson-summary">
                <strong>Brief summary:</strong> {selected.objective}
              </p>
              <div className="lesson-purpose">
                <Lightbulb size={18} />
                <div>
                  <strong>Why this matters</strong>
                  <p>{lessonRationaleFor(selected)}</p>
                </div>
              </div>
              {selectedImportedPlan ? (
                <div className="lesson-import-context" role="note">
                  <FileCheck2 size={18} />
                  <div>
                    <strong>{selectedImportedPlan.title}</strong>
                    <p>
                      External content from{" "}
                      {selectedImportedPlan.origin.provider}
                      {selectedImportedPlan.origin.model
                        ? ` · ${selectedImportedPlan.origin.model}`
                        : ""}
                      . Version {selectedImportedPlan.version} was reviewed and
                      installed locally; app workspaces are suggested from this
                      lesson&apos;s declared skills.
                    </p>
                    <small>
                      {selectedImportedPlan.sources.length} declared source
                      {selectedImportedPlan.sources.length === 1 ? "" : "s"} ·
                      imported{" "}
                      {new Date(
                        selectedImportedPlan.importedAt,
                      ).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ) : null}
              {selectedImportedPlan?.assessment_security ? (
                <div className="lesson-assessment-boundary" role="note">
                  <LockKeyhole size={19} />
                  <div>
                    <span className="eyebrow">
                      Learner-safe assessment boundary
                    </span>
                    <strong>
                      Practice is visible; facilitator outcomes stay hidden
                    </strong>
                    <p>
                      {
                        selectedImportedPlan.assessment_security
                          .learner_distribution
                      }
                    </p>
                    <small>
                      {
                        selectedImportedPlan.assessment_security
                          .certification_boundary
                      }
                    </small>
                  </div>
                </div>
              ) : null}
              <div className="lesson-brief">
                <span>
                  <Clock3 size={18} />
                  <strong>{selected.estimated_minutes} minutes</strong>
                  <small>Suggested pace</small>
                </span>
                <span>
                  <BrainCircuit size={18} />
                  <strong>{selected.sections.length} activities</strong>
                  <small>One at a time</small>
                </span>
                <span>
                  <Award size={18} />
                  <strong>
                    {objectiveCheckCount
                      ? `${objectiveCheckCount} objective checks`
                      : `${selected.skill_ids.length} skills`}
                  </strong>
                  <small>
                    {objectiveCheckCount
                      ? "Retry until the reasoning holds"
                      : selected.skill_ids.join(" · ")}
                  </small>
                </span>
              </div>
              {state.progress.lessonMastery?.[selected.lesson_id] ? (
                <div className="lesson-history-note">
                  <BrainCircuit size={18} />
                  <span>
                    <strong>
                      Practice pass{" "}
                      {state.progress.lessonMastery[selected.lesson_id]
                        .attempts + 1}
                    </strong>
                    <small>
                      Previous best:{" "}
                      {
                        state.progress.lessonMastery[selected.lesson_id]
                          .bestFirstTryPercent
                      }
                      % first-try checks. This pass uses the same principles for
                      retrieval, not familiarity.
                    </small>
                  </span>
                </div>
              ) : null}
              {linkedAchievement ? (
                <div className="lesson-achievement-preview">
                  <span className="lesson-achievement-icon">
                    <Award size={19} />
                  </span>
                  <div>
                    <span className="eyebrow">
                      {linkedAchievement.achievementType} artifact ·{" "}
                      {linkedAchievement.tier}
                    </span>
                    <strong>{linkedAchievement.title}</strong>
                    <p>{linkedAchievement.purpose}</p>
                    <div
                      className="progress-bar"
                      aria-label={`${linkedAchievement.title}: ${Math.min(linkedAchievement.current, linkedAchievement.target)} of ${linkedAchievement.target} practice dates`}
                    >
                      <span
                        style={{ width: `${linkedAchievement.progress}%` }}
                      />
                    </div>
                    <small>
                      {linkedAchievement.unlocked
                        ? `Earned · ${linkedAchievement.target} separated practice dates recorded`
                        : `${Math.min(linkedAchievement.current, linkedAchievement.target)} of ${linkedAchievement.target} separated practice dates · repeated passes today count once`}
                    </small>
                  </div>
                </div>
              ) : null}
              <LessonWorkspaceLinks
                lesson={selected}
                onNavigate={preserveLessonForReturn}
              />
              <div className="lesson-opening-guide">
                <div className="opening-guide-heading">
                  <Route size={18} />
                  <div>
                    <strong>Your step-by-step guide</strong>
                    <small>
                      Read the route now; complete one activity at a time.
                    </small>
                  </div>
                </div>
                {selected.sections.map((section, index) => (
                  <div
                    className="opening-guide-step"
                    key={`${section.type}-${index}`}
                  >
                    <span>{index + 1}</span>
                    <div>
                      <strong>{section.title}</strong>
                      <small>{sectionGuide[section.type]}</small>
                    </div>
                    <em>{humanizeLessonLabel(section.type)}</em>
                  </div>
                ))}
              </div>
              <div className="lesson-outcomes">
                <span className="eyebrow">
                  By the end, you should be able to
                </span>
                <ul>
                  {selected.mastery_criteria.map((criterion) => (
                    <li key={criterion}>
                      <Check size={15} />
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
              {selected.curriculum_role === "extension" ? (
                <div className="callout lesson-extension-brief">
                  <Rocket size={18} />
                  <div>
                    <strong>Advanced extension practice</strong>
                    <p>
                      This lesson assumes the core explanation and uses harder,
                      less complete cases to test transfer
                      {selected.extension_of
                        ? ` beyond ${
                            allLessons.find(
                              (lesson) =>
                                lesson.lesson_id === selected.extension_of,
                            )?.title ?? "the linked core lesson"
                          }.`
                        : "."}
                    </p>
                    {selected.extension_focus ? (
                      <small>{selected.extension_focus}</small>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {selected.session_blocks?.length ? (
                <div className="lesson-session-plan">
                  <span className="eyebrow">Recommended session plan</span>
                  <div>
                    {selected.session_blocks.map((block, index) => (
                      <article key={block.title}>
                        <span>{index + 1}</span>
                        <div>
                          <strong>{block.title}</strong>
                          <small>{block.focus}</small>
                        </div>
                        <em>{block.minutes} min</em>
                      </article>
                    ))}
                  </div>
                  <small>
                    Pause between blocks if needed. A break does not erase the
                    lesson session or count against mastery.
                  </small>
                </div>
              ) : null}
              {selected.time_model ? (
                <div className="lesson-time-model">
                  <div className="opening-guide-heading">
                    <Clock3 size={18} />
                    <div>
                      <strong>Practice across more than one date</strong>
                      <small>
                        Initial performance and delayed retention are separate
                        evidence—not one long sitting.
                      </small>
                    </div>
                  </div>
                  <div className="lesson-standard-metrics">
                    <span>
                      <strong>
                        {selected.time_model
                          .required_instruction_and_initial_minutes ??
                          selected.time_model
                            .required_two_session_capstone_minutes}{" "}
                        min
                      </strong>
                      <small>
                        {selected.time_model
                          .required_two_session_capstone_minutes
                          ? "required two-session capstone"
                          : "instruction and initial performance"}
                      </small>
                    </span>
                    <span>
                      <strong>
                        {selected.time_model.required_delayed_retention_minutes}{" "}
                        min
                      </strong>
                      <small>delayed retention on another date</small>
                    </span>
                    <span>
                      <strong>
                        {selected.time_model
                          .conditional_remediation_minutes_per_form ??
                          selected.time_model.conditional_remediation_minutes ??
                          "—"}{" "}
                        {(selected.time_model
                          .conditional_remediation_minutes_per_form ??
                        selected.time_model.conditional_remediation_minutes)
                          ? "min"
                          : ""}
                      </strong>
                      <small>conditional fresh-form remediation</small>
                    </span>
                  </div>
                  {selected.delivery_schedule?.length ? (
                    <ol className="lesson-delivery-schedule">
                      {selected.delivery_schedule.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ) : null}
              {selected.mastery_evidence?.length ? (
                <div className="lesson-evidence-checklist">
                  <div className="opening-guide-heading">
                    <FileCheck2 size={18} />
                    <div>
                      <strong>Evidence to preserve</strong>
                      <small>
                        Keep originals and dates. App completion alone is not a
                        facilitator-scored mastery record.
                      </small>
                    </div>
                  </div>
                  <ul>
                    {selected.mastery_evidence.map((evidence) => (
                      <li key={evidence}>
                        <Check size={14} />
                        {evidence}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selected.assessment_administration ? (
                <div className="lesson-assessment-administration">
                  <LockKeyhole size={18} />
                  <div>
                    <strong>Secure-form administration</strong>
                    <p>{selected.assessment_administration.key_separation}</p>
                    <small>
                      {selected.assessment_administration.packet_release}
                    </small>
                  </div>
                </div>
              ) : null}
              {masteryStandard ? (
                <div className="lesson-standard-panel">
                  <div className="opening-guide-heading">
                    <Target size={18} />
                    <div>
                      <strong>Passing standard</strong>
                      <small>
                        Completion records practice; this evidence standard is
                        what advances the mastery artifact.
                      </small>
                    </div>
                  </div>
                  <div className="lesson-standard-metrics">
                    <span>
                      <strong>
                        {masteryStandard.minimum_first_try_correct}/
                        {objectiveCheckCount}
                      </strong>
                      <small>checks correct without feedback</small>
                    </span>
                    <span>
                      <strong>
                        {masteryStandard.minimum_successful_cases}/
                        {masteryStandard.unseen_cases_required}
                      </strong>
                      <small>new cases meeting the rubric</small>
                    </span>
                    <span>
                      <strong>
                        {masteryStandard.retention_practice_dates}
                      </strong>
                      <small>separated dates for retained evidence</small>
                    </span>
                  </div>
                  <div className="lesson-rubric-preview">
                    {rubricDimensions.map((dimension) => (
                      <span key={dimension}>
                        <strong>{dimension}</strong>
                        <small>
                          Level {masteryStandard.minimum_rubric_level} —{" "}
                          {
                            rubricLevelLabels[
                              masteryStandard.minimum_rubric_level
                            ]
                          }
                        </small>
                      </span>
                    ))}
                  </div>
                  <p>
                    <strong>If the standard is missed:</strong>{" "}
                    {masteryStandard.remediation}
                  </p>
                </div>
              ) : null}
              {selectedSources.length ? (
                <div className="lesson-source-list">
                  <span className="eyebrow">Declared references</span>
                  {selectedSources.map((source) => (
                    <div key={`${source.title}-${source.url ?? "local"}`}>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title}
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        <strong>{source.title}</strong>
                      )}
                      {source.last_verified ? (
                        <small>Verified {source.last_verified}</small>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="callout lesson-privacy">
                <LockKeyhole size={17} />
                <p>
                  There is no timer, no live recommendation, and nothing is sent
                  outside this device. Written responses disappear when you
                  close the lesson; only compact practice evidence is retained.
                  Work slowly enough to explain each decision.
                </p>
              </div>
              <button
                className="button primary lesson-start-button"
                onClick={() => moveToLessonStage("activity")}
              >
                <Rocket size={17} />
                Enter focus mode
              </button>
            </div>
          ) : null}

          {lessonStage === "activity" ? (
            <>
              <div className="lesson-reader">
                <div className="lesson-reader-progress">
                  <div>
                    <span className="eyebrow">Focused lesson</span>
                    <strong>
                      Activity {lessonStep + 1} of {selected.sections.length}
                    </strong>
                  </div>
                  <span>
                    {Math.round(
                      ((lessonStep + 1) / selected.sections.length) * 100,
                    )}
                    %
                  </span>
                </div>
                <div
                  className="progress-bar"
                  aria-label={`Lesson progress: activity ${lessonStep + 1} of ${selected.sections.length}`}
                >
                  <span
                    style={{
                      width: `${((lessonStep + 1) / selected.sections.length) * 100}%`,
                    }}
                  />
                </div>
                {(() => {
                  const section = selected.sections[lessonStep];
                  const attempted = section.check
                    ? passedChecks.has(lessonStep)
                    : Boolean(responses[lessonStep]?.trim());
                  const selectedChoice = checkChoices[lessonStep];
                  const selectedChoiceIsWrong =
                    selectedChoice !== undefined &&
                    selectedChoice !== section.check?.correctOption;
                  const optionOrder = section.check
                    ? buildOptionOrder(
                        selected.lesson_id,
                        selected.version,
                        lessonStep,
                        assessmentSeed,
                        section.check.options.length,
                      )
                    : [];
                  return (
                    <article
                      className="lesson-focus-card"
                      key={`${selected.lesson_id}-${lessonStep}`}
                    >
                      <div className="coach-cue">
                        <Lightbulb size={16} />
                        <span>
                          <strong>Coach cue</strong>
                          {coachingCues[section.type]}
                        </span>
                      </div>
                      <div className="lesson-focus-meta">
                        <span className="lesson-type-icon">
                          {section.type === "practice" ||
                          section.type === "retrieval" ? (
                            <BrainCircuit size={20} />
                          ) : (
                            <Target size={20} />
                          )}
                        </span>
                        <span>
                          <span className="eyebrow">
                            {section.assessment_phase
                              ? `${humanizeLessonLabel(section.assessment_phase)} · ${humanizeLessonLabel(section.type)}`
                              : humanizeLessonLabel(section.type)}
                          </span>
                          <h3>{section.title}</h3>
                        </span>
                      </div>
                      <p className="lesson-body">{section.body}</p>
                      {section.prompt && section.check ? (
                        <div className="attempt-panel knowledge-check">
                          <div className="attempt-heading">
                            <strong>Objective check</strong>
                            <span>{section.prompt}</span>
                            <small>
                              Choice order changes on a new lesson attempt.
                            </small>
                          </div>
                          <div
                            className="knowledge-check-options"
                            role="group"
                            aria-label={section.prompt}
                          >
                            {optionOrder.map((optionIndex, displayIndex) => {
                              const option =
                                section.check!.options[optionIndex];
                              const isSelected = selectedChoice === optionIndex;
                              const isCorrect =
                                passedChecks.has(lessonStep) &&
                                optionIndex === section.check?.correctOption;
                              return (
                                <button
                                  type="button"
                                  className={`${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""}`}
                                  key={`${optionIndex}-${option}`}
                                  disabled={passedChecks.has(lessonStep)}
                                  onClick={() => chooseCheckAnswer(optionIndex)}
                                >
                                  <span>
                                    {String.fromCharCode(65 + displayIndex)}
                                  </span>
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                          {selectedChoiceIsWrong ? (
                            <div className="check-feedback retry" role="alert">
                              <strong>
                                Not yet—use the constraint and retry.
                              </strong>
                              {section.check.correction}
                            </div>
                          ) : passedChecks.has(lessonStep) ? (
                            <div
                              className="check-feedback success"
                              role="status"
                            >
                              <Check size={16} />
                              <span>
                                <strong>Reasoning holds.</strong>
                                {section.check.success}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : section.prompt ? (
                        <div className="attempt-panel">
                          <label htmlFor={`lesson-response-${lessonStep}`}>
                            <strong>Your turn</strong>
                            <span>{section.prompt}</span>
                          </label>
                          <textarea
                            id={`lesson-response-${lessonStep}`}
                            value={responses[lessonStep] ?? ""}
                            onChange={(event) =>
                              setResponses((current) => ({
                                ...current,
                                [lessonStep]: event.target.value,
                              }))
                            }
                            placeholder="Write your reasoning before checking the answer…"
                          />
                          <div className="attempt-support">
                            <small>
                              Your response is session-only and is not sent or
                              saved in your progress record.
                            </small>
                            {!attempted ? (
                              <button
                                type="button"
                                className="button ghost uncertainty-button"
                                onClick={() => {
                                  setResponses((current) => ({
                                    ...current,
                                    [lessonStep]:
                                      "I am not sure yet. I need to inspect the reasoning.",
                                  }));
                                  setResponseReviews((current) => ({
                                    ...current,
                                    [lessonStep]: "corrected",
                                  }));
                                }}
                              >
                                I’m not sure yet
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      {section.answer ? (
                        revealed.has(lessonStep) ? (
                          <>
                            <div className="answer-box">
                              <span className="answer-label">
                                <Check size={15} />
                                Answer and reasoning
                              </span>
                              {section.answer}
                            </div>
                            {!section.check ? (
                              <div className="response-comparison">
                                <div>
                                  <strong>Compare, then repair</strong>
                                  <small>
                                    Did your reasoning include the essential
                                    constraint—not merely the same conclusion?
                                  </small>
                                </div>
                                <div
                                  className="comparison-actions"
                                  role="group"
                                  aria-label="Compare your response with the guide"
                                >
                                  <button
                                    type="button"
                                    disabled={responses[lessonStep]?.startsWith(
                                      "I am not sure yet.",
                                    )}
                                    className={
                                      responseReviews[lessonStep] === "matched"
                                        ? "selected"
                                        : ""
                                    }
                                    onClick={() =>
                                      setResponseReviews((current) => ({
                                        ...current,
                                        [lessonStep]: "matched",
                                      }))
                                    }
                                  >
                                    <Check size={15} /> Reasoning matched
                                  </button>
                                  <button
                                    type="button"
                                    className={
                                      responseReviews[lessonStep] ===
                                      "corrected"
                                        ? "selected"
                                        : ""
                                    }
                                    onClick={() =>
                                      setResponseReviews((current) => ({
                                        ...current,
                                        [lessonStep]: "corrected",
                                      }))
                                    }
                                  >
                                    I found a gap
                                  </button>
                                </div>
                                {responseReviews[lessonStep] === "corrected" ? (
                                  <label
                                    className="correction-field"
                                    htmlFor={`lesson-correction-${lessonStep}`}
                                  >
                                    <strong>
                                      Write the corrected rule in your own words
                                    </strong>
                                    <textarea
                                      id={`lesson-correction-${lessonStep}`}
                                      value={corrections[lessonStep] ?? ""}
                                      onChange={(event) =>
                                        setCorrections((current) => ({
                                          ...current,
                                          [lessonStep]: event.target.value,
                                        }))
                                      }
                                      placeholder="The part I will change next time is…"
                                    />
                                  </label>
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        ) : section.check ? null : (
                          <button
                            data-testid="reveal-lesson-answer"
                            className="button secondary section-gap"
                            disabled={Boolean(section.prompt) && !attempted}
                            onClick={() =>
                              setRevealed((current) =>
                                new Set(current).add(lessonStep),
                              )
                            }
                          >
                            {section.prompt && !attempted
                              ? "Write an attempt to reveal"
                              : "Reveal answer and reasoning"}
                          </button>
                        )
                      ) : null}
                      <LessonActivityWorkspacePrompt
                        lesson={selected}
                        sectionIndex={lessonStep}
                        onNavigate={preserveLessonForReturn}
                      />
                    </article>
                  );
                })()}
              </div>
              <div className="lesson-navigation">
                <button
                  className="button secondary"
                  disabled={lessonStep === 0}
                  onClick={() => moveToLessonStep(lessonStep - 1)}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span aria-live="polite">
                  {!canAdvance
                    ? activeSection?.check
                      ? "Choose, use the feedback, and retry until the reasoning holds"
                      : !activeAttempted
                        ? "An honest attempt or uncertainty note is required"
                        : !revealed.has(lessonStep)
                          ? "Reveal the reasoning before continuing"
                          : "Compare your reasoning and complete any correction"
                    : `${revealed.size} feedback item${revealed.size === 1 ? "" : "s"} reviewed`}
                </span>
                {lessonStep < selected.sections.length - 1 ? (
                  <button
                    className="button primary"
                    disabled={!canAdvance}
                    onClick={() => moveToLessonStep(lessonStep + 1)}
                  >
                    {canAdvance
                      ? "Next activity"
                      : "Write an attempt to continue"}
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    className="button primary"
                    disabled={!canAdvance}
                    onClick={() => moveToLessonStage("reflection")}
                  >
                    {canAdvance
                      ? "Reflect and finish"
                      : "Write an attempt to reflect"}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </>
          ) : null}

          {lessonStage === "reflection" ? (
            <div className="lesson-reflection">
              <span className="reflection-icon">
                <BrainCircuit size={28} />
              </span>
              <span className="eyebrow">Metacognition check</span>
              <h3>How ready are you to retrieve this later?</h3>
              <p>
                Choose honestly. Confidence is evidence for what to practice
                next—not a grade.
              </p>
              <div className="mastery-panel">
                <span className="eyebrow">Mastery targets</span>
                <ul>
                  {selected.mastery_criteria.map((criterion) => (
                    <li key={criterion}>
                      <Check size={15} />
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
              {objectiveCheckCount ? (
                <div className="mastery-evidence-grid">
                  <span>
                    <strong>{firstTryPercent}%</strong>
                    <small>objective checks correct first try</small>
                  </span>
                  <span>
                    <strong>
                      {passedChecks.size}/{objectiveCheckCount}
                    </strong>
                    <small>objective checks corrected</small>
                  </span>
                  <span>
                    <strong>{correctionsCompleted}</strong>
                    <small>written error repairs</small>
                  </span>
                </div>
              ) : null}
              {masteryStandard && masteryEvaluation ? (
                <div className="mastery-scorecard">
                  <div className="opening-guide-heading">
                    <FileCheck2 size={18} />
                    <div>
                      <strong>Score the saved evidence</strong>
                      <small>
                        Count only outcome-hidden cases completed without the
                        worked answer. Use the artifact, not confidence or
                        P&amp;L.
                      </small>
                    </div>
                  </div>
                  <div className="mastery-case-inputs">
                    <label>
                      <span>New cases attempted</span>
                      <input
                        type="number"
                        min={0}
                        max={masteryStandard.unseen_cases_required}
                        value={independentCases}
                        onChange={(event) => {
                          const next = Math.max(
                            0,
                            Math.min(
                              masteryStandard.unseen_cases_required,
                              Number(event.target.value) || 0,
                            ),
                          );
                          setIndependentCases(next);
                          setSuccessfulCases((current) =>
                            Math.min(current, next),
                          );
                        }}
                      />
                      <small>
                        Target {masteryStandard.unseen_cases_required}
                      </small>
                    </label>
                    <label>
                      <span>Cases meeting the rubric</span>
                      <input
                        type="number"
                        min={0}
                        max={independentCases}
                        value={successfulCases}
                        onChange={(event) =>
                          setSuccessfulCases(
                            Math.max(
                              0,
                              Math.min(
                                independentCases,
                                Number(event.target.value) || 0,
                              ),
                            ),
                          )
                        }
                      />
                      <small>
                        Target {masteryStandard.minimum_successful_cases}
                      </small>
                    </label>
                  </div>
                  <div className="mastery-rubric-editor">
                    {rubricDimensions.map((dimension) => (
                      <fieldset key={dimension}>
                        <legend>{dimension}</legend>
                        <div>
                          {rubricLevelLabels.map((label, level) => (
                            <button
                              type="button"
                              key={label}
                              className={
                                rubricScores[dimension] === level
                                  ? "selected"
                                  : ""
                              }
                              aria-pressed={rubricScores[dimension] === level}
                              onClick={() =>
                                setRubricScores((current) => ({
                                  ...current,
                                  [dimension]: level as 0 | 1 | 2 | 3,
                                }))
                              }
                            >
                              <strong>{level}</strong>
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                  <div
                    className={`mastery-standard-result ${masteryEvaluation.met ? "met" : "pending"}`}
                    role="status"
                  >
                    {masteryEvaluation.met ? (
                      <Check size={18} />
                    ) : (
                      <Target size={18} />
                    )}
                    <div>
                      <strong>
                        {masteryEvaluation.met
                          ? "Independent standard met"
                          : "Guided practice can still be recorded"}
                      </strong>
                      <small>
                        Checks {masteryEvaluation.checksMet ? "met" : "pending"}
                        {" · "}cases{" "}
                        {masteryEvaluation.casesMet ? "met" : "pending"}
                        {" · "}rubric{" "}
                        {masteryEvaluation.rubricMet ? "met" : "pending"}
                        {" · "}average {masteryEvaluation.rubricAverage}/3
                      </small>
                    </div>
                  </div>
                  {!masteryEvaluation.met ? (
                    <p className="mastery-remediation">
                      <strong>Next repair:</strong>{" "}
                      {masteryStandard.remediation}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div
                className="confidence-grid"
                role="group"
                aria-label="Confidence after this lesson"
              >
                {[
                  {
                    value: 1 as const,
                    title: "Need another pass",
                    note: "I still need the worked reasoning.",
                  },
                  {
                    value: 2 as const,
                    title: "Getting it",
                    note: "I can do this with a small cue.",
                  },
                  {
                    value: 3 as const,
                    title: "Can explain it",
                    note: "I can retrieve and teach the idea.",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setConfidence(option.value);
                      completeLesson(selected.lesson_id, option.value, {
                        lessonVersion: selected.version,
                        objectiveChecks: objectiveCheckCount,
                        firstTryCorrect: firstTryChecks.size,
                        correctionsCompleted,
                        standardMet: masteryEvaluation?.met ?? false,
                        independentCases,
                        successfulCases,
                        rubricAverage: masteryEvaluation?.rubricAverage ?? 0,
                      });
                      moveToLessonStage("celebration");
                    }}
                  >
                    <span>{option.value}</span>
                    <strong>{option.title}</strong>
                    <small>{option.note}</small>
                  </button>
                ))}
              </div>
              <button
                className="button ghost"
                onClick={() => moveToLessonStage("activity")}
              >
                <ChevronLeft size={16} />
                Return to activities
              </button>
            </div>
          ) : null}

          {lessonStage === "celebration" ? (
            <div className="lesson-celebration" role="status">
              <div className="celebration-burst">
                <span />
                <span />
                <span />
                <Trophy size={38} />
              </div>
              <span className="eyebrow">Practice recorded</span>
              <h3>You completed a deliberate learning loop.</h3>
              <p>
                You predicted, reviewed, transferred, and reflected. Return on
                another day to test what remains available without hints.
              </p>
              <div className="celebration-stats">
                <span>
                  <strong>{selected.sections.length}</strong>
                  <small>activities</small>
                </span>
                <span>
                  <strong>
                    {
                      Object.values(responses).filter((response) =>
                        response.trim(),
                      ).length
                    }
                  </strong>
                  <small>written attempts</small>
                </span>
                <span>
                  <strong>{confidence ?? "—"}/3</strong>
                  <small>confidence</small>
                </span>
              </div>
              <div className="mastery-result">
                {masteryEvaluation?.met ? (
                  <Check size={18} />
                ) : (
                  <Target size={18} />
                )}
                <span>
                  <strong>
                    {masteryEvaluation?.met
                      ? "Independent performance standard met"
                      : objectiveCheckCount
                        ? `${firstTryChecks.size}/${objectiveCheckCount} checks held first try; independent standard remains open`
                        : "Guided reasoning reviewed and compared"}
                  </strong>
                  <small>
                    {masteryEvaluation?.met
                      ? `${successfulCases}/${independentCases} new cases met every rubric floor. This date advances the mastery artifact.`
                      : correctionsCompleted
                        ? `${correctionsCompleted} reasoning gap${correctionsCompleted === 1 ? " was" : "s were"} repaired before completion.`
                        : "This pass is saved as guided practice, but it does not advance the mastery artifact until the quantitative standard is met."}
                  </small>
                </span>
              </div>
              {linkedAchievement ? (
                <div
                  className={`lesson-artifact-result ${linkedAchievement.unlocked ? "earned" : "in-progress"}`}
                >
                  <span className="lesson-achievement-icon">
                    {linkedAchievement.unlocked ? (
                      <Trophy size={20} />
                    ) : (
                      <Award size={20} />
                    )}
                  </span>
                  <div>
                    <span className="eyebrow">
                      {linkedAchievement.unlocked &&
                      !lessonAchievementWasUnlocked
                        ? "Mastery artifact earned"
                        : linkedAchievement.unlocked
                          ? "Mastery artifact retained"
                          : "Mastery artifact advanced"}
                    </span>
                    <strong>{linkedAchievement.title}</strong>
                    <small>
                      {linkedAchievement.unlocked
                        ? linkedAchievement.purpose
                        : `${Math.min(linkedAchievement.current, linkedAchievement.target)} of ${linkedAchievement.target} separated practice dates recorded. Return on another day; rest days never remove progress.`}
                    </small>
                    <Link
                      to="/achievements/$achievementId"
                      params={{ achievementId: linkedAchievement.id }}
                      className="text-button"
                    >
                      View evidence and exact criteria
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : null}
              <LessonWorkspaceLinks
                compact
                lesson={selected}
                onNavigate={preserveLessonForReturn}
              />
              <div className="xp-award">
                <Zap size={19} />
                <span>
                  <strong>
                    +
                    {xpRules.lessonPractice +
                      (lessonWasComplete ? 0 : xpRules.uniqueLesson) +
                      (confidenceWasRecorded
                        ? 0
                        : xpRules.confidenceReflection)}{" "}
                    process XP
                  </strong>
                  <small>
                    {lessonWasComplete
                      ? confidenceWasRecorded
                        ? "Retrieval practice rewarded"
                        : "Retrieval plus first confidence reflection"
                      : "Practice, first completion, and reflection"}
                  </small>
                </span>
              </div>
              <div className="skill-chips centered">
                {selected.skill_ids.map((skill) => (
                  <span className="skill-chip" key={skill}>
                    {skill} practiced
                  </span>
                ))}
              </div>
              <button className="button primary" onClick={closeLesson}>
                Back to learning path
                <ChevronRight size={16} />
              </button>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {importOpen && importReport ? (
        <Modal
          title={
            importReport.valid
              ? "Lesson plan is ready to review"
              : "Lesson plan needs changes"
          }
          description="Validation happens locally. Importing never grants the file access to tools, storage, or network connections."
          onClose={() => setImportOpen(false)}
          wide={Boolean(importReport.plan)}
        >
          <div className={`callout ${importReport.valid ? "" : "warning"}`}>
            <FileCheck2 size={18} />
            <p>
              {importReport.valid
                ? `${importReport.plan?.lessons.length ?? 0} lessons passed schema, skill, safety, and calculation checks.`
                : "The file was not installed. Correct the issues below and import it again."}
            </p>
          </div>
          {importReport.errors.length ? (
            <ul className="validation-list errors">
              {importReport.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          {importReport.warnings.length ? (
            <ul className="validation-list warnings">
              {importReport.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {importReport.plan ? (
            <div className="import-plan-review">
              <div className="record-topline import-plan-review-header">
                <div>
                  <span className="eyebrow">Plan review</span>
                  <h3>{importReport.plan.title}</h3>
                  <p>
                    {importReport.plan.origin.provider}
                    {importReport.plan.origin.model
                      ? ` · ${importReport.plan.origin.model}`
                      : ""}{" "}
                    · version {importReport.plan.version}
                  </p>
                </div>
                <span className="badge badge-partial">Custom</span>
              </div>
              {importSummary ? (
                <div className="import-plan-review-stats">
                  <span>
                    <strong>{importSummary.lessonCount}</strong>
                    <small>lessons</small>
                  </span>
                  <span>
                    <strong>{importSummary.totalMinutes}</strong>
                    <small>minutes</small>
                  </span>
                  <span>
                    <strong>{importSummary.activityCount}</strong>
                    <small>activities</small>
                  </span>
                  <span>
                    <strong>{importSummary.objectiveCheckCount}</strong>
                    <small>objective checks</small>
                  </span>
                </div>
              ) : null}
              {importReport.plan.assessment_security ? (
                <div className="import-security-review" role="note">
                  <LockKeyhole size={18} />
                  <div>
                    <strong>Learner distribution verified</strong>
                    <p>
                      {
                        importReport.plan.assessment_security
                          .learner_distribution
                      }
                    </p>
                    <small>
                      {
                        importReport.plan.assessment_security
                          .certification_boundary
                      }
                    </small>
                  </div>
                </div>
              ) : null}
              <div className="import-plan-review-list">
                {importReport.plan.lessons.map((lesson, index) => {
                  const checks = lesson.sections.filter(
                    (section) => section.check,
                  ).length;
                  const workspaces = lessonWorkspacesFor(lesson);
                  return (
                    <div key={lesson.lesson_id}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{lesson.title}</strong>
                        <small>
                          {lesson.estimated_minutes} min ·{" "}
                          {lesson.sections.length} activities · {checks} checks
                        </small>
                        <small>
                          App practice:{" "}
                          {workspaces
                            .map((workspace) => workspace.title)
                            .join(" · ")}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="import-plan-review-footer">
                <FileCheck2 size={17} />
                <p>
                  {importReport.plan.sources.length
                    ? `${importReport.plan.sources.length} declared source${importReport.plan.sources.length === 1 ? "" : "s"} will remain visible with this plan.`
                    : "No sources were declared; avoid treating current-rule claims as verified."}{" "}
                  Installing replaces only an earlier copy with the same plan
                  ID. Existing lesson practice records remain available by
                  lesson ID.
                </p>
              </div>
            </div>
          ) : null}
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setImportOpen(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={!importReport.valid}
              onClick={() => void install()}
            >
              <FileUp size={16} />
              Approve and install
            </button>
          </div>
        </Modal>
      ) : null}

      {removePlanId ? (
        <Modal
          title="Remove this custom lesson plan?"
          description="Built-in lessons and your other records will not be affected."
          onClose={() => setRemovePlanId(null)}
        >
          <div className="callout warning">
            <ExternalLink size={18} />
            <p>
              This removes the imported copy from this device. You can import
              the original file again later.
            </p>
          </div>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setRemovePlanId(null)}
            >
              Keep plan
            </button>
            <button
              className="button danger"
              onClick={() => {
                removeLessonPlan(removePlanId);
                setRemovePlanId(null);
              }}
            >
              <Trash2 size={16} />
              Remove plan
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
