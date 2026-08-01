import type { AppState } from "../domain/types";
import { defaultChartWorkspace } from "../domain/chart-workspace";

export function normalizeAppState(
  stored: AppState,
  fallback: AppState,
): AppState {
  const hasExistingWork =
    stored.plans.length > 0 ||
    stored.trades.length > 0 ||
    stored.progress.completedLessonIds.length > 0 ||
    (stored.marketDataSets?.length ?? 0) > 0 ||
    stored.profile.displayName !== fallback.profile.displayName;
  const legacyAcquisition = stored.chartAcquisition as
    | (typeof stored.chartAcquisition & {
        symbols?: string[];
        oneMinuteSymbols?: string[];
      })
    | undefined;
  const hasLegacySubscriptions = Boolean(
    legacyAcquisition?.symbols?.length ||
    legacyAcquisition?.oneMinuteSymbols?.length,
  );
  const provider = ["massive", "alpaca", "tradier", "alpha_vantage"].includes(
    legacyAcquisition?.provider ?? "",
  )
    ? legacyAcquisition!.provider
    : hasLegacySubscriptions
      ? "alpha_vantage"
      : fallback.chartAcquisition!.provider;
  const subscriptions =
    legacyAcquisition?.subscriptions ??
    [
      ...(legacyAcquisition?.symbols ?? []).map((symbol) => ({
        provider,
        symbol,
        interval: "daily" as const,
      })),
      ...(legacyAcquisition?.oneMinuteSymbols ?? []).map((symbol) => ({
        provider,
        symbol,
        interval: "1min" as const,
      })),
    ].slice(0, 5);
  return {
    ...stored,
    profile: {
      ...stored.profile,
      theme: stored.profile.theme ?? "system",
      startingBalance: stored.profile.startingBalance ?? "10000",
      standaloneTools: stored.profile.standaloneTools ?? false,
    },
    progress: {
      ...stored.progress,
      lessonConfidence: stored.progress.lessonConfidence ?? {},
      lessonActivityByDate: stored.progress.lessonActivityByDate ?? {},
      lessonLastPracticed: stored.progress.lessonLastPracticed ?? {},
      lessonMastery: Object.fromEntries(
        Object.entries(stored.progress.lessonMastery ?? {}).map(
          ([lessonId, record]) => [
            lessonId,
            {
              ...record,
              practiceDays:
                record.practiceDays ??
                (record.lastPracticedAt
                  ? [record.lastPracticedAt.slice(0, 10)]
                  : []),
              totalCorrectionsCompleted:
                record.totalCorrectionsCompleted ??
                record.correctionsCompleted ??
                0,
              standardPracticeDays:
                record.standardPracticeDays ?? record.practiceDays ?? [],
              lastStandardMet: record.lastStandardMet ?? false,
              lastIndependentCases: record.lastIndependentCases ?? 0,
              lastSuccessfulCases: record.lastSuccessfulCases ?? 0,
              bestRubricAverage: record.bestRubricAverage ?? 0,
            },
          ],
        ),
      ),
      toolPracticeAttempts: stored.progress.toolPracticeAttempts ?? 0,
      toolActivityByDate: stored.progress.toolActivityByDate ?? {},
      toolLastPracticed: stored.progress.toolLastPracticed ?? {},
      conceptRecall: stored.progress.conceptRecall ?? {},
    },
    fidelityImport: {
      ...fallback.fidelityImport!,
      ...(stored.fidelityImport ?? {}),
    },
    journalGoals: stored.journalGoals ?? [],
    journalDashboard: {
      ...fallback.journalDashboard!,
      ...(stored.journalDashboard ?? {}),
    },
    achievementUnlocks: stored.achievementUnlocks ?? {},
    marketDataSets: stored.marketDataSets ?? [],
    chartAcquisition: {
      ...fallback.chartAcquisition!,
      ...(stored.chartAcquisition ?? {}),
      provider,
      subscriptions,
      lastDailyRefreshAt:
        stored.chartAcquisition?.lastDailyRefreshAt ??
        stored.chartAcquisition?.lastRefreshAt ??
        null,
      lastOneMinuteRefreshAt:
        stored.chartAcquisition?.lastOneMinuteRefreshAt ?? null,
    },
    chartWorkspace: {
      ...(fallback.chartWorkspace ?? defaultChartWorkspace),
      ...(stored.chartWorkspace ?? {}),
      overlays: {
        ...(fallback.chartWorkspace ?? defaultChartWorkspace).overlays,
        ...(stored.chartWorkspace?.overlays ?? {}),
      },
    },
    paperTradingSessions: stored.paperTradingSessions ?? [],
    onboardingComplete: stored.onboardingComplete ?? hasExistingWork,
  };
}
