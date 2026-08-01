import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  EyeOff,
  Filter,
  Gem,
  LockKeyhole,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import {
  achievementDefinitions,
  evaluateAchievements,
  type AchievementCategory,
  type AchievementKind,
  type AchievementTier,
} from "../../domain/achievements";
import { useAppState } from "../../state/AppStateContext";

const categories = [
  ...new Set(achievementDefinitions.map((achievement) => achievement.category)),
];
const tiers: AchievementTier[] = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
];
const kinds: AchievementKind[] = [
  "Milestone",
  "Mastery",
  "Exploration",
  "Persistence",
  "Collection",
  "Capstone",
  "Surprise",
];

function exactProgress(current: number, target: number) {
  const precision = current % 1 ? 1 : 0;
  return `${Math.min(current, target).toFixed(precision)} of ${target}`;
}

export function AchievementsPage() {
  const { state } = useAppState();
  const [category, setCategory] = useState<"all" | AchievementCategory>("all");
  const [tier, setTier] = useState<"all" | AchievementTier>("all");
  const [kind, setKind] = useState<"all" | AchievementKind>("all");
  const [query, setQuery] = useState("");
  const achievements = useMemo(() => evaluateAchievements(state), [state]);
  const visible = achievements.filter(
    (achievement) =>
      (category === "all" || achievement.category === category) &&
      (tier === "all" || achievement.tier === tier) &&
      (kind === "all" || achievement.achievementType === kind) &&
      (!query ||
        `${achievement.title} ${achievement.description} ${achievement.purpose} ${achievement.requirement} ${achievement.achievementType}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const unlocked = achievements.filter(
    (achievement) => achievement.unlocked,
  ).length;
  const next = achievements
    .filter(
      (achievement) =>
        !achievement.unlocked &&
        !achievement.hidden &&
        achievement.category !== "Profitability",
    )
    .sort((a, b) => b.progress - a.progress)[0];
  return (
    <div>
      <PageHeader
        eyebrow="Process achievements"
        title="Milestones that reward discipline"
        description="Every achievement is tied to reflection, planning, risk, emotional awareness, or sustained evidence. Profit and trade frequency never become quotas."
        actions={
          <span className="achievement-total">
            <Trophy size={17} />
            {unlocked}/{achievements.length} earned
          </span>
        }
      />
      {next ? (
        <section className="achievement-next-hero">
          <span>
            <Sparkles size={24} />
          </span>
          <div>
            <small>Closest visible milestone</small>
            <h2>{next.title}</h2>
            <p>{next.description}</p>
            <div className="progress-bar">
              <span style={{ width: `${next.progress}%` }} />
            </div>
          </div>
          <strong>{exactProgress(next.current, next.target)}</strong>
        </section>
      ) : null}
      <div className="achievement-filterbar">
        <div className="search-field">
          <Search size={16} />
          <label className="sr-only" htmlFor="achievement-search">
            Search achievements
          </label>
          <input
            id="achievement-search"
            placeholder="Search milestones"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Filter size={16} />
        <label>
          <span className="sr-only">Achievement category</span>
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as typeof category)
            }
          >
            <option value="all">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Achievement tier</span>
          <select
            value={tier}
            onChange={(event) => setTier(event.target.value as typeof tier)}
          >
            <option value="all">All tiers</option>
            {tiers.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Achievement type</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
          >
            <option value="all">All achievement types</option>
            {kinds.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="achievement-vault">
        {visible.map((achievement) => {
          const concealed = achievement.hidden && !achievement.unlocked;
          return (
            <Link
              to="/achievements/$achievementId"
              params={{ achievementId: achievement.id }}
              className={`achievement-vault-card tier-${achievement.tier.toLowerCase()} ${achievement.unlocked ? "unlocked" : "locked"}`}
              key={achievement.id}
            >
              <span className="achievement-medallion">
                {concealed ? (
                  <EyeOff size={22} />
                ) : achievement.tier === "Diamond" ? (
                  <Gem size={22} />
                ) : achievement.unlocked ? (
                  <Award size={22} />
                ) : (
                  <LockKeyhole size={22} />
                )}
              </span>
              <div>
                <small>
                  {concealed ? "Surprise" : achievement.achievementType} ·{" "}
                  {concealed ? "Hidden" : achievement.category} ·{" "}
                  {achievement.tier}
                </small>
                <strong>
                  {concealed ? "Surprise achievement" : achievement.title}
                </strong>
                <p>
                  {concealed
                    ? (achievement.hiddenHint ??
                      "Keep practicing healthy process behaviors to reveal this milestone.")
                    : achievement.description}
                </p>
                <div className="progress-bar">
                  <span
                    style={{
                      width: `${concealed ? 0 : achievement.progress}%`,
                    }}
                  />
                </div>
                <em>
                  {concealed
                    ? "Exact trigger remains a surprise"
                    : achievement.unlocked
                      ? `${exactProgress(achievement.current, achievement.target)} · earned`
                      : `${exactProgress(achievement.current, achievement.target)} · ${achievement.progress.toFixed(0)}%`}
                </em>
              </div>
            </Link>
          );
        })}
      </div>
      {!visible.length ? (
        <div className="compact-empty large section-gap">
          <Search size={24} />
          <strong>No achievements match these filters</strong>
          <p>Clear a filter or search by the behavior you want to practice.</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setTier("all");
              setKind("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
