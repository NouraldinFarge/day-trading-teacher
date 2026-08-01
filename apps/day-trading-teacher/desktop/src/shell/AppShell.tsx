import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CandlestickChart,
  Command,
  GraduationCap,
  NotebookPen,
  Plus,
  Settings,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useAppState } from "../state/AppStateContext";
import { isTauri } from "../platform/bridge";
import { WelcomeFlow } from "../components/WelcomeFlow";
import { EngagementChip } from "../components/EngagementPanel";
import { QuickActions } from "../components/QuickActions";
import { MarketDataAutoRefresh } from "../components/MarketDataAutoRefresh";

const lessonNavigation = [
  { to: "/", label: "Lessons", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: GraduationCap },
] as const;

const standaloneNavigation = [
  { to: "/plan", label: "Plan", icon: NotebookPen },
  { to: "/trades", label: "Journal", icon: BarChart3 },
  { to: "/chart", label: "Charts", icon: CandlestickChart },
] as const;

const routeContext = [
  {
    matches: (path: string) => path === "/",
    label: "Lessons",
    note: "Learn, apply, reflect, and return",
  },
  {
    matches: (path: string) => path.startsWith("/learn"),
    label: "Learn",
    note: "Deliberate practice and retrieval",
  },
  {
    matches: (path: string) => path.startsWith("/plan"),
    label: "Plan",
    note: "Decide before the outcome",
  },
  {
    matches: (path: string) =>
      path.startsWith("/trades") || path.startsWith("/chart"),
    label: "Journal",
    note: "Facts, reflection, replay, and patterns",
  },
  {
    matches: (path: string) =>
      path.startsWith("/progress") || path.startsWith("/achievements"),
    label: "Progress",
    note: "Process evidence without pressure",
  },
  {
    matches: (path: string) => path.startsWith("/settings"),
    label: "Settings",
    note: "Preferences, Fidelity, and privacy",
  },
];

export function AppShell() {
  const { ready, state, persistence, retryPersistence } = useAppState();
  const currentPath = useRouterState({
    select: (routerState) => routerState.location.pathname,
  });
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const standaloneTools = Boolean(state.profile.standaloneTools);
  const navigation = [
    ...lessonNavigation,
    ...(standaloneTools ? standaloneNavigation : []),
    { to: "/settings" as const, label: "Settings", icon: Settings },
  ];
  const lessonWorkspaceActive =
    !standaloneTools &&
    (currentPath.startsWith("/plan") ||
      currentPath.startsWith("/trades") ||
      currentPath.startsWith("/chart"));
  const context = lessonWorkspaceActive
    ? {
        label: "Lesson practice",
        note: "Apply the lesson with local evidence",
      }
    : (routeContext.find((item) => item.matches(currentPath)) ??
      routeContext[0]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.profile.theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [state.profile.theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickActionsOpen((open) =>
          !open && document.querySelector('[role="dialog"]') ? open : !open,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!ready) {
    return (
      <div className="app-loading">
        <span className="loading-mark">DT</span>
        <p>Opening your learning workspace…</p>
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      data-reduced-motion={state.profile.reducedMotion}
      data-theme={state.profile.theme}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <ShieldCheck size={20} strokeWidth={2.4} />
          </span>
          <span>
            <strong>Trading Teacher</strong>
            <small>Lessons first · process always</small>
          </span>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map(({ to, label, icon: Icon }) => {
            const active =
              (to === "/"
                ? currentPath === "/" ||
                  currentPath.startsWith("/learn") ||
                  lessonWorkspaceActive
                : currentPath === to) ||
              (to === "/progress" && currentPath.startsWith("/achievements"));
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                title={label}
                className={active ? "nav-link active" : "nav-link"}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div
            className={`local-status ${persistence.status === "error" ? "storage-error" : ""}`}
            role={persistence.status === "error" ? "alert" : "status"}
            title={persistence.message}
          >
            <span className="status-dot" />
            {persistence.status === "error"
              ? "Storage needs attention"
              : persistence.status === "saving"
                ? "Saving locally…"
                : isTauri()
                  ? "Stored on this device"
                  : "Browser preview mode"}
          </div>
          {persistence.status === "error" ? (
            <div className="storage-error-copy">
              <p>
                {persistence.canRetry
                  ? "Your latest changes remain queued locally. You can retry without re-entering them."
                  : "The existing data was not overwritten. Export any new work from Settings before closing."}
              </p>
              {persistence.canRetry ? (
                <button
                  type="button"
                  className="text-button storage-retry"
                  onClick={retryPersistence}
                >
                  Retry save now
                </button>
              ) : null}
            </div>
          ) : null}
          <p>Education only. No trade signals or automated orders.</p>
        </div>
      </aside>
      <div className="workspace-frame">
        <header className="topbar">
          <div className="topbar-context">
            <span className="eyebrow">{context.label}</span>
            <span className="topbar-context-note">{context.note}</span>
            <span
              className={`topbar-save-status ${persistence.status === "error" ? "storage-error" : ""}`}
              title={persistence.message}
            >
              {persistence.status === "error" ? (
                <ShieldAlert size={13} />
              ) : (
                <ShieldCheck size={13} />
              )}
              {persistence.status === "saving"
                ? "Saving"
                : persistence.status === "error"
                  ? "Save problem"
                  : "Saved locally"}
            </span>
          </div>
          <div className="topbar-actions">
            <EngagementChip state={state} />
            <button
              className="button compact secondary quick-action-trigger"
              type="button"
              onClick={() => setQuickActionsOpen(true)}
              aria-label="Open quick actions"
            >
              <Command size={15} />
              <span>Quick actions</span>
              <kbd>Ctrl K</kbd>
            </button>
            {standaloneTools ? (
              <Link to="/plan" className="button compact secondary">
                <Plus size={15} />
                New plan
              </Link>
            ) : (
              <Link to="/learn" className="button compact secondary">
                <BookOpen size={15} />
                Continue lesson
              </Link>
            )}
            <Link
              to="/settings"
              className="topbar-profile"
              aria-label={`Open settings for ${state.profile.displayName}`}
            >
              <span className="avatar" aria-hidden="true">
                {state.profile.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{state.profile.displayName}</strong>
                <small>{state.profile.experience} path</small>
              </span>
            </Link>
          </div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <WelcomeFlow />
      <MarketDataAutoRefresh />
      {quickActionsOpen ? (
        <QuickActions onClose={() => setQuickActionsOpen(false)} />
      ) : null}
    </div>
  );
}
