import { Flame } from "lucide-react";
import type { Progress } from "../domain/types";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function streakFor(activity: Record<string, number>) {
  const dates = Object.keys(activity)
    .filter((key) => activity[key] > 0)
    .sort();
  if (!dates.length) return 0;
  let streak = 1;
  let cursor = new Date(`${dates[dates.length - 1]}T12:00:00`);
  for (let index = dates.length - 2; index >= 0; index -= 1) {
    cursor.setDate(cursor.getDate() - 1);
    if (dates[index] !== dateKey(cursor)) break;
    streak += 1;
  }
  return streak;
}

function longestStreakFor(activity: Record<string, number>) {
  const dates = Object.keys(activity)
    .filter((key) => activity[key] > 0)
    .sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;
  for (const key of dates) {
    const date = new Date(`${key}T12:00:00`);
    if (previous) {
      const expected = new Date(previous);
      expected.setDate(expected.getDate() + 1);
      current = dateKey(expected) === key ? current + 1 : 1;
    } else current = 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return longest;
}

export function ActivityCalendar({ progress }: { progress: Progress }) {
  const lessonActivity = progress.lessonActivityByDate ?? {};
  const toolActivity = progress.toolActivityByDate ?? {};
  const activity = [
    ...new Set([...Object.keys(lessonActivity), ...Object.keys(toolActivity)]),
  ].reduce<Record<string, number>>((combined, key) => {
    combined[key] = (lessonActivity[key] ?? 0) + (toolActivity[key] ?? 0);
    return combined;
  }, {});
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  start.setDate(start.getDate() - start.getDay() - 51 * 7);
  const days = Array.from({ length: 364 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    return { date, key, count: activity[key] ?? 0, future: date > today };
  });
  const activeDays = Object.values(activity).filter(
    (count) => count > 0,
  ).length;
  const streak = streakFor(activity);
  const longestStreak = longestStreakFor(activity);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const thisWeek = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return activity[dateKey(date)] ?? 0;
  }).filter((count) => count > 0).length;
  const weeklyGoal = 3;
  const monthLabels = days
    .filter(({ date }, index) => date.getDate() <= 7 && index % 7 === 0)
    .map(({ date, key }) => ({
      key,
      label: date.toLocaleDateString("en-US", { month: "short" }),
    }));

  return (
    <section className="activity-card card" aria-labelledby="activity-title">
      <div className="card-header">
        <div>
          <h2 id="activity-title">Learning contribution map</h2>
          <p>
            One year of deliberate practice, inspired by GitHub’s contribution
            calendar
          </p>
        </div>
        <span className="badge badge-strong">
          {thisWeek}/{weeklyGoal} this week
        </span>
      </div>
      <div className="card-body">
        <div className="activity-highlight">
          <div>
            <span>
              <Flame size={18} />
            </span>
            <div>
              <strong>{streak} day current rhythm</strong>
              <small>Rest days never erase your history.</small>
            </div>
          </div>
          <div>
            <strong>{longestStreak}</strong>
            <small>longest rhythm</small>
          </div>
          <div>
            <strong>{activeDays}</strong>
            <small>active days</small>
          </div>
        </div>
        <div className="weekly-goal">
          <header>
            <span>Weekly learning goal</span>
            <strong>
              {Math.min(thisWeek, weeklyGoal)} of {weeklyGoal} days
            </strong>
          </header>
          <div className="progress-bar">
            <span
              style={{
                width: `${Math.min(100, (thisWeek / weeklyGoal) * 100)}%`,
              }}
            />
          </div>
          <small>
            {thisWeek >= weeklyGoal
              ? "Goal complete—return when another lesson serves you."
              : `${weeklyGoal - thisWeek} focused ${weeklyGoal - thisWeek === 1 ? "day" : "days"} to complete this week.`}
          </small>
        </div>
        <div className="calendar-scroll">
          <div className="calendar-grid-wrap">
            <div className="calendar-months" aria-hidden="true">
              {monthLabels.map(({ key, label }) => (
                <span key={key}>{label}</span>
              ))}
            </div>
            <div className="calendar-grid-row">
              <div className="calendar-weekdays" aria-hidden="true">
                <span>Sun</span>
                <span>Tue</span>
                <span>Thu</span>
                <span>Sat</span>
              </div>
              <div
                className="activity-calendar"
                role="grid"
                aria-label="Learning practice calendar"
              >
                {days.map(({ date, key, count, future }) => (
                  <span
                    key={key}
                    role="gridcell"
                    aria-label={`${displayDate(date)}: ${future ? "future date" : `${count} learning ${count === 1 ? "practice" : "practices"}`}`}
                    title={`${displayDate(date)} · ${count} ${count === 1 ? "practice" : "practices"}`}
                    className={`activity-day level-${Math.min(count, 4)} ${future ? "future" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="calendar-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`activity-day level-${level}`} />
          ))}
          <span>More</span>
        </div>
        {activeDays === 0 ? (
          <p className="activity-empty">
            Complete a lesson or a Learning Lab practice to light up your first
            square. Repeating useful practice also counts.
          </p>
        ) : (
          <p className="activity-empty">
            Every square represents learning—not trades taken, time in market,
            or profit.
          </p>
        )}
      </div>
    </section>
  );
}
