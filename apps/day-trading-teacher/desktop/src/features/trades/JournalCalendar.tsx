import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { dollars } from "../../domain/calculations";
import { calendarDays, localDateKey } from "../../domain/journal-analytics";
import type { JournalDashboardPreferences, Trade } from "../../domain/types";

type CalendarView = "month" | "year";

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function JournalCalendar({
  trades,
  preferences,
  onPreferences,
  onOpenTrade,
}: {
  trades: Trade[];
  preferences: JournalDashboardPreferences;
  onPreferences(preferences: JournalDashboardPreferences): void;
  onOpenTrade(trade: Trade): void;
}) {
  const latest = trades.length
    ? new Date(Math.max(...trades.map((trade) => +new Date(trade.occurredAt))))
    : new Date();
  const [cursor, setCursor] = useState(monthStart(latest));
  const [view, setView] = useState<CalendarView>("month");
  const [symbol, setSymbol] = useState("all");
  const [reviewedOnly, setReviewedOnly] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const symbols = [...new Set(trades.map((trade) => trade.symbol))].sort();
  const filtered = useMemo(
    () =>
      trades.filter(
        (trade) =>
          (symbol === "all" || trade.symbol === symbol) &&
          (!reviewedOnly || trade.journal?.status === "reviewed"),
      ),
    [trades, symbol, reviewedOnly],
  );
  const days = useMemo(() => calendarDays(filtered), [filtered]);
  const maximumAbsPnl = Math.max(
    1,
    ...[...days.values()].map((day) => Math.abs(day.pnl)),
  );
  const calendarStart = new Date(
    cursor.getFullYear(),
    cursor.getMonth(),
    1 - cursor.getDay(),
  );
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
  const selectedTrades = selectedDay
    ? filtered.filter(
        (trade) => localDateKey(new Date(trade.occurredAt)) === selectedDay,
      )
    : [];
  const currentYear = cursor.getFullYear();
  const annualMonths = Array.from({ length: 12 }, (_, month) => {
    const key = `${currentYear}-${String(month + 1).padStart(2, "0")}`;
    const monthTrades = filtered.filter((trade) =>
      localDateKey(new Date(trade.occurredAt)).startsWith(key),
    );
    const pnl = monthTrades.reduce(
      (total, trade) => total + Number(trade.netPnl),
      0,
    );
    return {
      month,
      key,
      trades: monthTrades.length,
      pnl,
      wins: monthTrades.filter((trade) => Number(trade.netPnl) > 0).length,
    };
  });
  const heatStart = new Date();
  heatStart.setHours(12, 0, 0, 0);
  heatStart.setDate(heatStart.getDate() - heatStart.getDay() - 51 * 7);
  const heatDays = Array.from({ length: 364 }, (_, index) => {
    const date = new Date(heatStart);
    date.setDate(heatStart.getDate() + index);
    return {
      date,
      key: localDateKey(date),
      data: days.get(localDateKey(date)),
    };
  });
  const metricLabel =
    preferences.calendarMetric === "pnl"
      ? "P&L"
      : preferences.calendarMetric === "activity"
        ? "trading activity"
        : preferences.calendarMetric === "reflection"
          ? "journal completion"
          : "rule adherence";
  useEffect(() => {
    if (selectedDay && !days.has(selectedDay)) setSelectedDay(null);
  }, [days, selectedDay]);
  const intensity = (day?: ReturnType<typeof days.get>) => {
    if (!day) return 0;
    if (preferences.calendarMetric === "pnl")
      return Math.min(4, Math.ceil((Math.abs(day.pnl) / maximumAbsPnl) * 4));
    if (preferences.calendarMetric === "activity")
      return Math.min(4, day.trades);
    if (preferences.calendarMetric === "reflection")
      return Math.min(
        4,
        Math.ceil((day.reflected / Math.max(1, day.trades)) * 4),
      );
    return day.ruleEvidence
      ? Math.min(4, Math.ceil((day.ruleAdherent / day.ruleEvidence) * 4))
      : 0;
  };

  return (
    <div className="journal-calendar-page">
      <div className="journal-control-row calendar-toolbar">
        <div
          className="segmented-control"
          role="group"
          aria-label="Calendar view"
        >
          <button
            className={view === "month" ? "active" : ""}
            aria-pressed={view === "month"}
            onClick={() => setView("month")}
          >
            Month
          </button>
          <button
            className={view === "year" ? "active" : ""}
            aria-pressed={view === "year"}
            onClick={() => setView("year")}
          >
            Year
          </button>
        </div>
        <div className="calendar-period-control">
          <button
            className="icon-button"
            aria-label={view === "month" ? "Previous month" : "Previous year"}
            onClick={() =>
              setCursor(
                new Date(
                  cursor.getFullYear() - (view === "year" ? 1 : 0),
                  cursor.getMonth() - (view === "month" ? 1 : 0),
                  1,
                ),
              )
            }
          >
            <ChevronLeft size={17} />
          </button>
          <strong>
            {cursor.toLocaleDateString(
              "en-US",
              view === "month"
                ? { month: "long", year: "numeric" }
                : { year: "numeric" },
            )}
          </strong>
          <button
            className="icon-button"
            aria-label={view === "month" ? "Next month" : "Next year"}
            onClick={() =>
              setCursor(
                new Date(
                  cursor.getFullYear() + (view === "year" ? 1 : 0),
                  cursor.getMonth() + (view === "month" ? 1 : 0),
                  1,
                ),
              )
            }
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="calendar-filters">
          <Filter size={15} />
          <label>
            <span className="sr-only">Filter calendar by symbol</span>
            <select
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
            >
              <option value="all">All assets</option>
              {symbols.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="compact-check">
            <input
              type="checkbox"
              checked={reviewedOnly}
              onChange={(event) => setReviewedOnly(event.target.checked)}
            />
            Reflected only
          </label>
        </div>
      </div>
      {view === "month" ? (
        <section className="card premium-calendar">
          <div className="calendar-week-header">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-month-grid">
            {calendarCells.map((date) => {
              const key = localDateKey(date);
              const day = days.get(key);
              const outside = date.getMonth() !== cursor.getMonth();
              const level = intensity(day);
              const isSelected = selectedDay === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!day}
                  className={`calendar-day-card level-${level} ${outside ? "outside" : ""} ${day?.pnl && day.pnl > 0 ? "positive" : day?.pnl && day.pnl < 0 ? "negative" : ""} ${isSelected ? "selected" : ""}`}
                  aria-pressed={day ? isSelected : undefined}
                  aria-label={`${date.toLocaleDateString()}: ${day ? `${day.trades} trades, ${dollars(day.pnl)}, ${day.winRate.toFixed(0)}% win rate` : "no recorded trades"}`}
                  onClick={() => day && setSelectedDay(key)}
                >
                  <span className="calendar-date">{date.getDate()}</span>
                  {day ? (
                    <>
                      <strong>{dollars(day.pnl)}</strong>
                      <small>
                        {day.trades} trade{day.trades === 1 ? "" : "s"} ·{" "}
                        {day.winRate.toFixed(0)}%
                      </small>
                      <div className="calendar-day-signals">
                        <span>
                          {day.reflected}/{day.trades} reflected
                        </span>
                        {day.notable.length ? (
                          <i aria-label="Notable activity" />
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <small className="calendar-rest">No activity</small>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section
          className="year-grid"
          aria-label={`${currentYear} performance by month`}
        >
          {annualMonths.map((month) => (
            <button
              type="button"
              key={month.key}
              className={`year-month-card ${month.pnl > 0 ? "positive" : month.pnl < 0 ? "negative" : ""}`}
              onClick={() => {
                setCursor(new Date(currentYear, month.month, 1));
                setView("month");
              }}
            >
              <span>
                {new Date(currentYear, month.month, 1).toLocaleDateString(
                  "en-US",
                  { month: "long" },
                )}
              </span>
              <strong>{dollars(month.pnl)}</strong>
              <small>
                {month.trades} trades ·{" "}
                {month.trades
                  ? Math.round((month.wins / month.trades) * 100)
                  : 0}
                % wins
              </small>
              <div className="mini-progress">
                <span
                  style={{ width: `${Math.min(100, month.trades * 10)}%` }}
                />
              </div>
            </button>
          ))}
        </section>
      )}
      {selectedDay ? (
        <section className="card calendar-drilldown section-gap">
          <div className="card-header">
            <div>
              <h2>
                {new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
                  "en-US",
                  { weekday: "long", month: "long", day: "numeric" },
                )}
              </h2>
              <p>
                {selectedTrades.length} recorded trades · click an entry to open
                its reflection
              </p>
            </div>
            <button
              className="text-button"
              onClick={() => setSelectedDay(null)}
            >
              Close detail
            </button>
          </div>
          <div className="card-body">
            {selectedTrades.map((trade) => (
              <button
                className="calendar-trade-row"
                key={trade.id}
                onClick={() => onOpenTrade(trade)}
              >
                <strong>{trade.symbol}</strong>
                <span>
                  {trade.side} · {trade.quantity} shares
                </span>
                <span>
                  {trade.journal?.status === "reviewed"
                    ? "Reflected"
                    : "Needs reflection"}
                </span>
                <strong
                  className={
                    Number(trade.netPnl) >= 0
                      ? "positive-text"
                      : "negative-text"
                  }
                >
                  {dollars(trade.netPnl)}
                </strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <section className="card section-gap">
        <div className="card-header">
          <div>
            <h2>Trading consistency map</h2>
            <p>
              One year of {metricLabel}; darker squares mean stronger evidence,
              not a target to trade
            </p>
          </div>
          <span className="badge badge-strong">
            <Flame size={13} /> Process heatmap
          </span>
        </div>
        <div className="card-body">
          <div
            className="heatmap-metric-tabs"
            role="group"
            aria-label="Heatmap metric"
          >
            {(["pnl", "activity", "reflection", "discipline"] as const).map(
              (metric) => (
                <button
                  type="button"
                  key={metric}
                  className={
                    preferences.calendarMetric === metric ? "active" : ""
                  }
                  aria-pressed={preferences.calendarMetric === metric}
                  onClick={() =>
                    onPreferences({ ...preferences, calendarMetric: metric })
                  }
                >
                  {metric === "pnl"
                    ? "P&L"
                    : metric === "activity"
                      ? "Activity"
                      : metric === "reflection"
                        ? "Journal"
                        : "Discipline"}
                </button>
              ),
            )}
          </div>
          <div className="journal-heatmap-scroll">
            <div
              className="journal-heatmap"
              role="group"
              aria-label={`One year of ${metricLabel}`}
            >
              {heatDays.map(({ date, key, data }) => {
                const level = intensity(data);
                const detail = data
                  ? `${data.trades} trades, ${dollars(data.pnl)}, ${data.reflected}/${data.trades} reflected, ${data.ruleEvidence ? `${data.ruleAdherent}/${data.ruleEvidence} rule-adherent` : "no risk-rule evidence"}`
                  : "no recorded activity";
                const className = `journal-heat-day level-${level} ${data?.pnl && data.pnl < 0 && preferences.calendarMetric === "pnl" ? "negative" : ""}`;
                return data ? (
                  <button
                    type="button"
                    key={key}
                    className={className}
                    aria-label={`${date.toLocaleDateString()}: ${detail}`}
                    title={`${date.toLocaleDateString()} · ${detail}`}
                    onClick={() => setSelectedDay(key)}
                  />
                ) : (
                  <span
                    key={key}
                    className={className}
                    aria-hidden="true"
                    title={`${date.toLocaleDateString()} · ${detail}`}
                  />
                );
              })}
            </div>
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i key={level} className={`journal-heat-day level-${level}`} />
            ))}
            <span>More</span>
            <small>
              <ShieldCheck size={13} /> Rest days and no-trade days never break
              a process streak.
            </small>
          </div>
        </div>
      </section>
    </div>
  );
}
