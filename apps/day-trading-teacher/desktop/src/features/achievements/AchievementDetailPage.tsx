import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  CalendarCheck2,
  Gem,
  Gift,
  History,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import {
  achievementEvidence,
  evaluateAchievements,
} from "../../domain/achievements";
import { useAppState } from "../../state/AppStateContext";

export function AchievementDetailPage() {
  const { achievementId } = useParams({ strict: false }) as {
    achievementId: string;
  };
  const { state } = useAppState();
  const achievement = evaluateAchievements(state).find(
    (candidate) => candidate.id === achievementId,
  );
  if (!achievement)
    return (
      <div className="compact-empty large">
        <LockKeyhole size={28} />
        <strong>Achievement not found</strong>
        <Link to="/achievements" className="button secondary">
          Return to achievements
        </Link>
      </div>
    );
  const concealed = achievement.hidden && !achievement.unlocked;
  const evidence = achievementEvidence(achievement, state);
  return (
    <div className="achievement-detail-page">
      <Link to="/achievements" className="text-button">
        <ArrowLeft size={15} />
        All achievements
      </Link>
      <section
        className={`achievement-detail-hero tier-${achievement.tier.toLowerCase()}`}
      >
        <span>
          {concealed ? (
            <LockKeyhole size={30} />
          ) : achievement.tier === "Diamond" ? (
            <Gem size={30} />
          ) : (
            <Award size={30} />
          )}
        </span>
        <div>
          <small>
            {concealed
              ? "Hidden surprise"
              : `${achievement.achievementType} · ${achievement.category}`}
          </small>
          <h1>{concealed ? "Surprise achievement" : achievement.title}</h1>
          <p>
            {concealed
              ? (achievement.hiddenHint ??
                "Continue practicing healthy process behaviors to reveal this achievement.")
              : achievement.description}
          </p>
          <div className="achievement-tier-line">
            <span>{achievement.tier} tier</span>
            <span>
              {achievement.rewardXp
                ? `+${achievement.rewardXp} process XP`
                : "Badge only—no XP"}
            </span>
          </div>
        </div>
        <strong>
          {concealed
            ? "?"
            : achievement.unlocked
              ? "Earned"
              : `${achievement.progress.toFixed(0)}%`}
        </strong>
      </section>
      {!concealed ? (
        <section className="achievement-purpose section-gap">
          <Target size={21} />
          <div>
            <span className="eyebrow">Why this evidence matters</span>
            <h2>{achievement.purpose}</h2>
            <p>
              Criteria version {achievement.criteriaVersion}. Progress is stored
              on this device and never depends on trade frequency, position
              size, or a continuous streak.
            </p>
          </div>
        </section>
      ) : null}
      <div className="achievement-detail-grid section-gap">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Unlock requirement</h2>
              <p>Transparent and process based</p>
            </div>
            <ShieldCheck size={19} />
          </div>
          <div className="card-body">
            <p>
              {concealed
                ? "The exact trigger is revealed after the healthy behavior occurs. No important learning path is hidden behind it."
                : achievement.requirement}
            </p>
            {!concealed ? (
              <>
                <div className="progress-bar large">
                  <span style={{ width: `${achievement.progress}%` }} />
                </div>
                <div className="achievement-progress-numbers">
                  <strong>
                    {achievement.current.toFixed(
                      achievement.current % 1 ? 1 : 0,
                    )}
                  </strong>
                  <span>of {achievement.target} required</span>
                </div>
              </>
            ) : null}
          </div>
        </article>
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Reward</h2>
              <p>Recognition without pressure</p>
            </div>
            <Gift size={19} />
          </div>
          <div className="card-body reward-detail">
            <Sparkles size={24} />
            <strong>
              {achievement.rewardXp
                ? `${achievement.rewardXp} process XP`
                : "Permanent achievement badge"}
            </strong>
            <p>Rewards never increase with trade frequency or position size.</p>
            {!concealed && !achievement.unlocked ? (
              <Link to={achievement.actionPath} className="button secondary">
                Continue this practice
              </Link>
            ) : null}
          </div>
        </article>
      </div>
      {!concealed ? (
        <section className="card section-gap achievement-evidence-ledger">
          <div className="card-header">
            <div>
              <h2>Evidence ledger</h2>
              <p>What counted, what did not, and why</p>
            </div>
            <ShieldCheck size={19} />
          </div>
          <div className="card-body">
            <div className="achievement-evidence-numbers">
              <span>
                <strong>
                  {evidence.counted.toFixed(evidence.counted % 1 ? 1 : 0)}
                </strong>
                <small>current metric</small>
              </span>
              <span>
                <strong>{evidence.eligible}</strong>
                <small>eligible records</small>
              </span>
              <span>
                <strong>{evidence.excluded}</strong>
                <small>not counted</small>
              </span>
            </div>
            <p className="achievement-evidence-calculation">
              <strong>Calculation</strong>
              {evidence.calculation}
            </p>
            {evidence.sampleRequired !== null ? (
              <div
                className={`achievement-sample-gate ${evidence.sampleMet ? "met" : "pending"}`}
              >
                <Target size={17} />
                <span>
                  <strong>
                    Sample gate {evidence.sampleMet ? "met" : "still open"}
                  </strong>
                  <small>
                    {evidence.sampleCurrent} of {evidence.sampleRequired}{" "}
                    eligible records. The percentage cannot unlock this
                    achievement before the sample gate is met.
                  </small>
                </span>
              </div>
            ) : null}
            <div className="achievement-evidence-rules">
              <div>
                <strong>Counted</strong>
                <p>{evidence.countingRule}</p>
              </div>
              <div>
                <strong>Not counted</strong>
                <p>{evidence.exclusionRule}</p>
              </div>
            </div>
            {evidence.recentEvidenceDates.length ? (
              <div className="achievement-evidence-dates">
                <strong>Recent evidence dates</strong>
                <span>
                  {evidence.recentEvidenceDates
                    .map((date) =>
                      new Date(`${date}T12:00:00`).toLocaleDateString(),
                    )
                    .join(" · ")}
                </span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      <section className="card section-gap">
        <div className="card-header">
          <div>
            <h2>Completion history</h2>
            <p>This device’s local achievement record</p>
          </div>
          <History size={19} />
        </div>
        <div className="card-body">
          {achievement.unlockedAt ? (
            <div className="completion-history-row">
              <CalendarCheck2 size={18} />
              <div>
                <strong>Achievement unlocked</strong>
                <span>{new Date(achievement.unlockedAt).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="compact-empty">
              <LockKeyhole size={22} />
              <strong>Not unlocked yet</strong>
              <p>
                Progress updates automatically from local practice evidence.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
