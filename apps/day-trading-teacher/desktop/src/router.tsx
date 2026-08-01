import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Compass, RefreshCw, ShieldAlert } from "lucide-react";
import { AppShell } from "./shell/AppShell";
import { LearnPage } from "./features/learning/LearnPage";
import { PlanPage } from "./features/planning/PlanPage";
import { TradesPage } from "./features/trades/TradesPage";
import { ProgressPage } from "./features/progress/ProgressPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { AchievementsPage } from "./features/achievements/AchievementsPage";
import { AchievementDetailPage } from "./features/achievements/AchievementDetailPage";
import { ChartLabPage } from "./features/charting/ChartLabPage";
import { LearningToolsPage } from "./features/learning/LearningToolsPage";

function NotFoundPage() {
  return (
    <section className="card compact-empty large route-empty">
      <Compass size={30} />
      <h1>That page is not available</h1>
      <p>
        The address may be outdated. Your local records and progress are
        unchanged.
      </p>
      <Link to="/" className="button primary">
        Return to Lessons
      </Link>
    </section>
  );
}

function RouteErrorPage({ reset }: ErrorComponentProps) {
  return (
    <section className="card compact-empty large route-empty" role="alert">
      <ShieldAlert size={30} />
      <h1>This page could not finish loading</h1>
      <p>
        Your saved local records were not erased. Try the page again; if the
        problem returns, export your data from Settings before closing the app.
      </p>
      <div className="data-actions">
        <button className="button primary" type="button" onClick={reset}>
          <RefreshCw size={16} />
          Try again
        </button>
        <Link to="/" className="button secondary">
          Return to Lessons
        </Link>
      </div>
    </section>
  );
}

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});
const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LearnPage,
});
const learnRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/learn",
  component: LearnPage,
});
const learningToolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/learn/tools",
  component: LearningToolsPage,
});
const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plan",
  component: PlanPage,
});
const tradesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trades",
  component: TradesPage,
});
const progressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/progress",
  component: ProgressPage,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});
const achievementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/achievements",
  component: AchievementsPage,
});
const achievementDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/achievements/$achievementId",
  component: AchievementDetailPage,
});
const chartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chart",
  component: ChartLabPage,
});

const routeTree = rootRoute.addChildren([
  todayRoute,
  learnRoute,
  learningToolsRoute,
  planRoute,
  tradesRoute,
  progressRoute,
  settingsRoute,
  achievementsRoute,
  achievementDetailRoute,
  chartRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
