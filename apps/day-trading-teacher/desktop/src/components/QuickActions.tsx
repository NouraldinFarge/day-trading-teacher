import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  CandlestickChart,
  NotebookPen,
  Settings,
  Sparkles,
} from "lucide-react";
import { builtInLessons } from "../domain/builtin-lessons";
import { nextResponsibleAction } from "../domain/workflow";
import { useAppState } from "../state/AppStateContext";
import { Modal } from "./Modal";

export function QuickActions({ onClose }: { onClose(): void }) {
  const { state } = useAppState();
  const next = nextResponsibleAction(state, builtInLessons);
  const standalone = Boolean(state.profile.standaloneTools);
  const actions = [
    standalone
      ? {
          to: next.to,
          title: next.cta,
          note: next.title,
          icon: Sparkles,
          featured: true,
        }
      : {
          to: "/learn",
          title: "Continue lesson path",
          note: "Return to your next lesson or spaced retrieval pass",
          icon: Sparkles,
          featured: true,
        },
    {
      to: "/",
      title: "Open lesson workspace",
      note: "See the path, practice tools, and mastery artifacts",
      icon: BookOpen,
      featured: false,
    },
    {
      to: "/learn/tools",
      title: "Open Learning Lab",
      note: "Practice risk, expectancy, recall, and decisions",
      icon: BrainCircuit,
      featured: false,
    },
    {
      to: "/plan",
      title: standalone ? "Write a standalone plan" : "Decision Card practice",
      note: standalone
        ? "Define risk before the outcome"
        : "Apply planning lessons before outcome information exists",
      icon: NotebookPen,
      featured: false,
    },
    {
      to: "/trades",
      title: standalone ? "Open Journal" : "Evidence and reflection practice",
      note: standalone
        ? "Import facts or complete reflection"
        : "Use executions to reconstruct facts and choose the next lesson",
      icon: BarChart3,
      featured: false,
    },
    {
      to: "/chart",
      title: standalone ? "Chart & backtest" : "Historical replay practice",
      note: standalone
        ? "Replay trades on historical bars"
        : "Transfer lesson reasoning to charts and paper decisions",
      icon: CandlestickChart,
      featured: false,
    },
    {
      to: "/settings",
      title: "Open Settings",
      note: "Fidelity, appearance, data, and privacy",
      icon: Settings,
      featured: false,
    },
  ] as const;

  return (
    <Modal
      title="Quick actions"
      description={
        standalone
          ? "Open any workspace separately. Your work saves locally as you go."
          : "Move from a lesson to the exact practice workspace it uses. Your work saves locally as you go."
      }
      onClose={onClose}
    >
      <div className="quick-action-grid">
        {actions.map(({ to, title, note, icon: Icon, featured }) => (
          <Link
            key={`${to}-${title}`}
            to={to}
            onClick={onClose}
            className={`quick-action ${featured ? "featured" : ""}`}
          >
            <span>
              <Icon size={19} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{note}</small>
            </span>
          </Link>
        ))}
      </div>
      <div className="callout quick-action-boundary">
        <Sparkles size={17} />
        <p>
          The app recommends learning and reflection actions—not securities,
          entries, or trade frequency.
        </p>
      </div>
    </Modal>
  );
}
