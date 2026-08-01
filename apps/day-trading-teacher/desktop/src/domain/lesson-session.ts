import type {
  LessonJournalTab,
  LessonLabToolId,
  LessonWorkspaceId,
} from "./lesson-workspaces";

const storageKey = "trading-teacher:lesson-workspace-session";
const maximumAgeMs = 4 * 60 * 60 * 1000;

export type ResumableLessonStage =
  "intro" | "activity" | "reflection" | "celebration";

export type LessonSessionSnapshot = {
  stage: ResumableLessonStage;
  step: number;
  revealed: number[];
  responses: Record<number, string>;
  responseReviews: Record<number, "matched" | "corrected">;
  corrections: Record<number, string>;
  checkChoices: Record<number, number>;
  checkAttempts: Record<number, number>;
  passedChecks: number[];
  firstTryChecks: number[];
  confidence: 1 | 2 | 3 | null;
  lessonWasComplete: boolean;
  confidenceWasRecorded: boolean;
  lessonAchievementWasUnlocked: boolean;
  assessmentSeed?: number;
  independentCases?: number;
  successfulCases?: number;
  rubricScores?: Record<string, 0 | 1 | 2 | 3>;
};

export type LessonWorkspaceContext = {
  lessonId: string;
  lessonTitle: string;
  workspaceId: LessonWorkspaceId;
  workspaceTitle: string;
  purpose: string;
  artifact: string;
  labTool?: LessonLabToolId;
  journalTab?: LessonJournalTab;
  activityTitle?: string;
  evidenceReady?: boolean;
  evidenceMarkedAt?: string;
  savedAt: string;
  session: LessonSessionSnapshot;
};

function storage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

function validContext(value: unknown): value is LessonWorkspaceContext {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LessonWorkspaceContext>;
  const savedAt = Date.parse(item.savedAt ?? "");
  return (
    typeof item.lessonId === "string" &&
    item.lessonId.length > 0 &&
    typeof item.lessonTitle === "string" &&
    typeof item.workspaceId === "string" &&
    ["plan", "chart", "journal", "lab"].includes(item.workspaceId) &&
    typeof item.workspaceTitle === "string" &&
    typeof item.purpose === "string" &&
    typeof item.artifact === "string" &&
    Number.isFinite(savedAt) &&
    Date.now() - savedAt <= maximumAgeMs &&
    Boolean(item.session) &&
    ["intro", "activity", "reflection", "celebration"].includes(
      item.session?.stage ?? "",
    ) &&
    Number.isInteger(item.session?.step) &&
    (item.session?.step ?? -1) >= 0
  );
}

export function saveLessonWorkspaceContext(context: LessonWorkspaceContext) {
  try {
    storage()?.setItem(storageKey, JSON.stringify(context));
  } catch {
    // Session handoff is a progressive enhancement; lesson use remains local.
  }
}

export function readLessonWorkspaceContext(
  workspaceId?: LessonWorkspaceId,
): LessonWorkspaceContext | null {
  try {
    const target = storage();
    const raw = target?.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!validContext(parsed)) {
      target?.removeItem(storageKey);
      return null;
    }
    if (workspaceId && parsed.workspaceId !== workspaceId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function markLessonWorkspaceEvidenceReady() {
  const context = readLessonWorkspaceContext();
  if (!context) return null;
  const markedAt = new Date().toISOString();
  const updated: LessonWorkspaceContext = {
    ...context,
    evidenceReady: true,
    evidenceMarkedAt: markedAt,
    savedAt: markedAt,
  };
  saveLessonWorkspaceContext(updated);
  return updated;
}

export function consumeLessonWorkspaceContext() {
  const context = readLessonWorkspaceContext();
  clearLessonWorkspaceContext();
  return context;
}

export function clearLessonWorkspaceContext() {
  try {
    storage()?.removeItem(storageKey);
  } catch {
    // Nothing to clear when session storage is unavailable.
  }
}
