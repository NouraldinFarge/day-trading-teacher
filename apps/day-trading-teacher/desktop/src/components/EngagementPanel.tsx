import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Circle, Sparkles, Zap } from "lucide-react";
import {
  calculateXp,
  dailyMissions,
  engagementLevel,
} from "../domain/engagement";
import type { AppState } from "../domain/types";

export function EngagementChip({ state }: { state: AppState }) {
  const level = engagementLevel(calculateXp(state));
  return (
    <Link
      to="/progress"
      className="engagement-chip"
      title="Open learning level and achievements"
    >
      <span>
        <Zap size={14} />
      </span>
      <span>
        <strong>Level {level.index}</strong>
        <small>{level.xp} process XP</small>
      </span>
    </Link>
  );
}

export function MissionBoard({ state }: { state: AppState }) {
  const xp = calculateXp(state);
  const level = engagementLevel(xp);
  const missions = dailyMissions(state);
  const completed = missions.filter((mission) => mission.complete).length;

  return (
    <section className="mission-board card" aria-labelledby="mission-title">
      <div className="mission-level">
        <div className="level-emblem">
          <Zap size={23} />
          <span>{level.index}</span>
        </div>
        <div className="level-copy">
          <span className="eyebrow">Learning level</span>
          <h2>{level.name}</h2>
          <p>
            {level.next
              ? `${level.next.threshold - xp} XP until ${level.next.name}`
              : "Highest current learning level reached"}
          </p>
        </div>
        <div className="level-xp">
          <strong>{xp}</strong>
          <small>process XP</small>
        </div>
      </div>
      <div
        className="progress-bar level-progress"
        aria-label={`Level progress: ${level.progress}%`}
      >
        <span style={{ width: `${level.progress}%` }} />
      </div>
      <div className="mission-heading">
        <div>
          <Sparkles size={17} />
          <span>
            <strong id="mission-title">Today’s learning missions</strong>
            <small>Three predictable actions. No random rewards.</small>
          </span>
        </div>
        <span>
          {completed}/{missions.length} complete
        </span>
      </div>
      <div className="mission-grid">
        {missions.map((mission) => (
          <Link
            to={mission.to}
            className={mission.complete ? "mission complete" : "mission"}
            key={mission.id}
          >
            <span className="mission-check">
              {mission.complete ? <Check size={16} /> : <Circle size={16} />}
            </span>
            <span>
              <strong>{mission.title}</strong>
              <small>{mission.description}</small>
            </span>
            <span className="mission-xp">+{mission.xp} XP</span>
            <ChevronRight size={15} />
          </Link>
        ))}
      </div>
    </section>
  );
}
