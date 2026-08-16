import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { lazy } from "react";
import { Compass, RefreshCw, ShieldAlert } from "lucide-react";
import { AppShell } from "./shell/AppShell";

const LearnPage = lazy(() =>
  import("./features/learning/LearnPage").then((module) => ({
    default: module.LearnPage,
  })),
);
const LearningToolsPage = lazy(() =>
  import("./features/learning/LearningToolsPage").then((module) => ({
    default: module.LearningToolsPage,
  })),
);
const TradeLessonsPage = lazy(
  () => import("./features/learning/TradeLessonsPage"),
);
const PlanPage = lazy(() =>
  import("./features/planning/PlanPage").then((module) => ({
    default: module.PlanPage,
  })),
);
const TradesPage = lazy(() =>
  import("./features/trades/TradesPage").then((module) => ({
    default: module.TradesPage,
  })),
);
const ProgressPage = lazy(() =>
  import("./features/progress/ProgressPage").then((module) => ({
    default: module.ProgressPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./features/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const AchievementsPage = lazy(() =>
  import("./features/achievements/AchievementsPage").then((module) => ({
    default: module.AchievementsPage,
  })),
);
const AchievementDetailPage = lazy(() =>
  import("./features/achievements/AchievementDetailPage").then((module) => ({
    default: module.AchievementDetailPage,
  })),
);
const ChartLabPage = lazy(() =>
  import("./features/charting/ChartLabPage").then((module) => ({
    default: module.ChartLabPage,
  })),
);

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
const tradeLessonsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/learn/trade-lessons",
  component: TradeLessonsPage,
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
  tradeLessonsRoute,
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
