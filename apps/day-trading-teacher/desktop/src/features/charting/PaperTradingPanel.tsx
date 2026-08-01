import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Ban,
  Clock3,
  Crosshair,
  ShieldCheck,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import {
  cancelPaperOrder,
  finishPaperSession,
  paperSessionMetrics,
  previewPaperEntry,
  requestPaperClose,
  submitPaperEntry,
  updatePaperProtection,
  type PaperSessionDefaults,
} from "../../domain/paper-trading";
import type {
  MarketBar,
  PaperOrderType,
  PaperTradingSession,
  TradeSide,
} from "../../domain/types";

function dollars(value: number) {
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toFixed(2)}`;
}

function price(value: number) {
  return value >= 10 ? value.toFixed(2) : value.toFixed(4);
}

function roundPrice(value: number) {
  return Number(value.toFixed(value >= 10 ? 2 : 4));
}

function initialProtection(bar: MarketBar, side: TradeSide) {
  const distance = Math.max(
    bar.high - bar.low,
    bar.close * 0.005,
    bar.close >= 10 ? 0.1 : 0.001,
  );
  return {
    stop: roundPrice(
      side === "long" ? bar.close - distance : bar.close + distance,
    ),
    target: roundPrice(
      side === "long" ? bar.close + distance * 2 : bar.close - distance * 2,
    ),
  };
}

export function PaperTradingPanel({
  session,
  history,
  currentBar,
  currentBarIndex,
  defaults,
  onStart,
  onChange,
}: {
  session: PaperTradingSession | null;
  history: PaperTradingSession[];
  currentBar: MarketBar;
  currentBarIndex: number;
  defaults: PaperSessionDefaults;
  onStart(): void;
  onChange(session: PaperTradingSession): void;
}) {
  const [side, setSide] = useState<TradeSide>("long");
  const [orderType, setOrderType] = useState<PaperOrderType>("market");
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState(currentBar.close);
  const [stopPrice, setStopPrice] = useState(
    initialProtection(currentBar, "long").stop,
  );
  const [targetPrice, setTargetPrice] = useState(
    initialProtection(currentBar, "long").target,
  );
  const [useTarget, setUseTarget] = useState(true);
  const [protectionStop, setProtectionStop] = useState(stopPrice);
  const [protectionTarget, setProtectionTarget] = useState(targetPrice);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    const protection = initialProtection(currentBar, side);
    setLimitPrice(
      roundPrice(
        side === "long" ? currentBar.close * 0.998 : currentBar.close * 1.002,
      ),
    );
    setStopPrice(protection.stop);
    setTargetPrice(protection.target);
  }, [session?.id, side]);

  useEffect(() => {
    if (!session?.position) return;
    setProtectionStop(session.position.stopPrice);
    setProtectionTarget(
      session.position.targetPrice ?? session.position.entryPrice,
    );
  }, [session?.position?.id]);

  const metrics = session
    ? paperSessionMetrics(session, currentBar.close)
    : null;
  const request = {
    side,
    orderType,
    quantity,
    limitPrice: orderType === "limit" ? limitPrice : null,
    stopPrice,
    targetPrice: useTarget ? targetPrice : null,
  };
  const preview = session
    ? previewPaperEntry(session, request, currentBar)
    : null;
  const locked = Boolean(
    session && session.realizedPnl <= -session.dailyLossLimit,
  );
  const recentHistory = useMemo(
    () => history.filter((item) => item.status === "completed").slice(0, 3),
    [history],
  );

  const run = (action: () => PaperTradingSession, success: string) => {
    setError("");
    setMessage("");
    try {
      onChange(action());
      setMessage(success);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  if (!session) {
    return (
      <section
        className="paper-trading-onboarding"
        aria-labelledby="paper-trading-title"
      >
        <div className="paper-trading-onboarding-copy">
          <span className="paper-mode-icon">
            <WalletCards size={22} />
          </span>
          <div>
            <span className="eyebrow accent">Replay account</span>
            <h3 id="paper-trading-title">Practice decisions, not clicks</h3>
            <p>
              Start at the current hidden-future bar. Orders fill only as new
              bars are revealed, with risk limits, simulated slippage, and a
              complete local audit trail.
            </p>
          </div>
        </div>
        <div className="paper-start-summary">
          <span>
            <small>Starting balance</small>
            <strong>{dollars(defaults.startingBalance)}</strong>
          </span>
          <span>
            <small>Risk ceiling</small>
            <strong>{dollars(defaults.maxRiskPerTrade)}</strong>
          </span>
          <span>
            <small>Loss lock</small>
            <strong>{dollars(defaults.dailyLossLimit)}</strong>
          </span>
        </div>
        <div className="paper-start-actions">
          <button className="button primary" type="button" onClick={onStart}>
            <ShieldCheck size={16} />
            Start paper session
          </button>
          <small>
            Local simulation only. No brokerage credentials, live orders, or
            Fidelity account changes.
          </small>
        </div>
        {recentHistory.length ? (
          <div className="paper-history-preview">
            <strong>Recent sessions</strong>
            {recentHistory.map((item) => (
              <span key={item.id}>
                <b>{new Date(item.createdAt).toLocaleDateString()}</b>
                <em
                  className={
                    item.realizedPnl >= 0 ? "positive-text" : "negative-text"
                  }
                >
                  {dollars(item.realizedPnl)}
                </em>
                <small>
                  {item.trades.length} closed trade
                  {item.trades.length === 1 ? "" : "s"}
                </small>
              </span>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="paper-trading-workbench"
      aria-labelledby="paper-trading-title"
    >
      <header className="paper-account-header">
        <div>
          <span className="paper-live-dot" aria-hidden="true" />
          <div>
            <h3 id="paper-trading-title">Paper account</h3>
            <small>
              Bar {currentBarIndex + 1} · orders process on future reveals only
            </small>
          </div>
        </div>
        <span className="badge badge-strong">
          <ShieldCheck size={12} />
          Local simulation
        </span>
      </header>

      <div className="paper-account-metrics">
        <span>
          <small>Equity</small>
          <strong>{dollars(metrics!.equity)}</strong>
          <em
            className={
              metrics!.returnPercent >= 0 ? "positive-text" : "negative-text"
            }
          >
            {metrics!.returnPercent >= 0 ? "+" : ""}
            {metrics!.returnPercent.toFixed(2)}%
          </em>
        </span>
        <span>
          <small>Realized</small>
          <strong
            className={
              metrics!.realizedPnl >= 0 ? "positive-text" : "negative-text"
            }
          >
            {dollars(metrics!.realizedPnl)}
          </strong>
          <em>{session.trades.length} closed</em>
        </span>
        <span>
          <small>Open P&amp;L</small>
          <strong
            className={
              metrics!.unrealizedPnl >= 0 ? "positive-text" : "negative-text"
            }
          >
            {dollars(metrics!.unrealizedPnl)}
          </strong>
          <em>{session.position ? session.position.side : "flat"}</em>
        </span>
        <span>
          <small>Loss capacity</small>
          <strong>{dollars(metrics!.remainingLossCapacity)}</strong>
          <em>{dollars(session.dailyLossLimit)} lock</em>
        </span>
        <span>
          <small>Closed drawdown</small>
          <strong>{dollars(session.maxDrawdown)}</strong>
          <em>
            {session.feesPaid ? `${dollars(session.feesPaid)} fees` : "no fees"}
          </em>
        </span>
      </div>

      {locked ? (
        <div className="paper-risk-lock" role="alert">
          <Ban size={16} />
          <span>
            <strong>Session loss lock reached</strong>
            No new entries are allowed. End the session and review the process.
          </span>
        </div>
      ) : null}

      <div className="paper-desk-grid">
        <form
          className="paper-order-ticket"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () =>
                submitPaperEntry(session, request, currentBar, currentBarIndex),
              "Order queued. Reveal the next bar to process it.",
            );
          }}
        >
          <div className="paper-panel-heading">
            <div>
              <Crosshair size={16} />
              <span>
                <strong>Order ticket</strong>
                <small>One deliberate position at a time</small>
              </span>
            </div>
            <span className="paper-current-price">
              {price(currentBar.close)}
            </span>
          </div>
          <div className="paper-side-picker" aria-label="Paper trade direction">
            <button
              type="button"
              className={side === "long" ? "long active" : "long"}
              aria-pressed={side === "long"}
              onClick={() => setSide("long")}
            >
              Long
            </button>
            <button
              type="button"
              className={side === "short" ? "short active" : "short"}
              aria-pressed={side === "short"}
              onClick={() => setSide("short")}
            >
              Short
            </button>
          </div>
          <div className="paper-ticket-fields">
            <label>
              <span>Order</span>
              <select
                aria-label="Paper order type"
                value={orderType}
                onChange={(event) =>
                  setOrderType(event.target.value as PaperOrderType)
                }
              >
                <option value="market">Market · next open</option>
                <option value="limit">Limit</option>
              </select>
            </label>
            <label>
              <span>Shares</span>
              <input
                aria-label="Paper share quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </label>
            {orderType === "limit" ? (
              <label>
                <span>Limit</span>
                <input
                  aria-label="Paper limit price"
                  type="number"
                  min=".0001"
                  step="any"
                  value={limitPrice}
                  onChange={(event) =>
                    setLimitPrice(Number(event.target.value))
                  }
                />
              </label>
            ) : null}
            <label>
              <span>Required stop</span>
              <input
                aria-label="Paper protective stop"
                type="number"
                min=".0001"
                step="any"
                value={stopPrice}
                onChange={(event) => setStopPrice(Number(event.target.value))}
              />
            </label>
            <label>
              <span>Target</span>
              <input
                aria-label="Paper profit target"
                type="number"
                min=".0001"
                step="any"
                disabled={!useTarget}
                value={targetPrice}
                onChange={(event) => setTargetPrice(Number(event.target.value))}
              />
            </label>
            <label className="paper-target-toggle">
              <input
                type="checkbox"
                checked={useTarget}
                onChange={(event) => setUseTarget(event.target.checked)}
              />
              Use target
            </label>
          </div>
          <div className="paper-risk-preview">
            <span>
              <small>Planned risk</small>
              <strong
                className={
                  preview?.withinRiskLimit ? "positive-text" : "negative-text"
                }
              >
                {preview ? dollars(preview.plannedRisk) : "—"}
              </strong>
            </span>
            <span>
              <small>Notional</small>
              <strong>{preview ? dollars(preview.notional) : "—"}</strong>
            </span>
            <span>
              <small>Risk-sized shares</small>
              <button
                type="button"
                className="text-button"
                disabled={!preview?.suggestedQuantity}
                onClick={() =>
                  setQuantity(Math.max(1, preview?.suggestedQuantity ?? 1))
                }
              >
                Use {preview?.suggestedQuantity ?? 0}
              </button>
            </span>
          </div>
          <button
            className={`button paper-submit ${side}`}
            type="submit"
            disabled={
              locked ||
              Boolean(session.position) ||
              Boolean(session.pendingOrder) ||
              !preview?.withinRiskLimit ||
              !preview?.withinBuyingPower
            }
          >
            <BadgeDollarSign size={16} />
            Queue {side} {orderType}
          </button>
          <small className="paper-fill-note">
            Market orders fill at the next bar open with simulated slippage.
            Limit orders never fill above a buy limit or below a short limit.
          </small>
        </form>

        <div className="paper-position-panel">
          <div className="paper-panel-heading">
            <div>
              <Target size={16} />
              <span>
                <strong>Position &amp; protection</strong>
                <small>Manage risk before outcome</small>
              </span>
            </div>
          </div>
          {session.pendingOrder ? (
            <div className="paper-pending-order">
              <Clock3 size={18} />
              <div>
                <strong>
                  {session.pendingOrder.action === "close_position"
                    ? "Close pending"
                    : `${session.pendingOrder.action === "open_long" ? "Long" : "Short"} ${session.pendingOrder.type}`}
                </strong>
                <span>
                  {session.pendingOrder.quantity} shares · submitted on bar{" "}
                  {session.pendingOrder.submittedBarIndex + 1}
                </span>
                <small>Waiting for the next eligible revealed bar.</small>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Cancel pending paper order"
                onClick={() => onChange(cancelPaperOrder(session))}
              >
                <X size={15} />
              </button>
            </div>
          ) : null}
          {session.position ? (
            <>
              <div className={`paper-open-position ${session.position.side}`}>
                <span>
                  <small>{session.position.side} position</small>
                  <strong>
                    {session.position.quantity} @{" "}
                    {price(session.position.entryPrice)}
                  </strong>
                </span>
                <span>
                  <small>Open P&amp;L</small>
                  <strong
                    className={
                      metrics!.unrealizedPnl >= 0
                        ? "positive-text"
                        : "negative-text"
                    }
                  >
                    {dollars(metrics!.unrealizedPnl)}
                  </strong>
                </span>
                <span>
                  <small>Initial risk</small>
                  <strong>{dollars(session.position.initialRisk)}</strong>
                </span>
              </div>
              <div className="paper-protection-form">
                <label>
                  <span>Stop</span>
                  <input
                    aria-label="Update paper stop"
                    type="number"
                    min=".0001"
                    step=".01"
                    value={protectionStop}
                    onChange={(event) =>
                      setProtectionStop(Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  <span>Target</span>
                  <input
                    aria-label="Update paper target"
                    type="number"
                    min=".0001"
                    step=".01"
                    value={protectionTarget}
                    onChange={(event) =>
                      setProtectionTarget(Number(event.target.value))
                    }
                  />
                </label>
                <button
                  className="button compact secondary"
                  type="button"
                  onClick={() =>
                    run(
                      () =>
                        updatePaperProtection(
                          session,
                          protectionStop,
                          protectionTarget,
                          currentBar.close,
                        ),
                      "Protection updated.",
                    )
                  }
                >
                  Update
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setProtectionStop(session.position!.entryPrice);
                    run(
                      () =>
                        updatePaperProtection(
                          session,
                          session.position!.entryPrice,
                          protectionTarget,
                          currentBar.close,
                        ),
                      "Stop moved to the entry price.",
                    );
                  }}
                >
                  Move stop to entry
                </button>
              </div>
              <button
                className="button secondary paper-close-position"
                type="button"
                disabled={Boolean(session.pendingOrder)}
                onClick={() =>
                  run(
                    () => requestPaperClose(session, currentBarIndex),
                    "Close queued for the next revealed bar.",
                  )
                }
              >
                Queue close at next open
              </button>
            </>
          ) : session.pendingOrder ? null : (
            <div className="paper-flat-state">
              <Crosshair size={24} />
              <strong>No open position</strong>
              <span>
                Define the stop first, size from risk, then queue one decision.
              </span>
            </div>
          )}
          {message ? (
            <div className="success-message paper-feedback" role="status">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="error-message paper-feedback" role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <aside className="paper-activity-panel">
          <div className="paper-panel-heading">
            <div>
              <Clock3 size={16} />
              <span>
                <strong>Decision tape</strong>
                <small>Newest event first</small>
              </span>
            </div>
          </div>
          <div className="paper-event-list">
            {session.events.slice(0, 7).map((item) => (
              <article key={item.id} className={`paper-event ${item.kind}`}>
                <i aria-hidden="true" />
                <div>
                  <strong>{item.kind}</strong>
                  <p>{item.message}</p>
                  <small>
                    Bar {item.barIndex + 1} ·{" "}
                    {new Date(item.at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              </article>
            ))}
          </div>
          {session.trades.length ? (
            <div className="paper-scorecard">
              <span>
                <small>Win rate</small>
                <strong>{metrics!.winRate.toFixed(1)}%</strong>
              </span>
              <span>
                <small>Expectancy</small>
                <strong>{dollars(metrics!.expectancy)}</strong>
              </span>
              <span>
                <small>Profit factor</small>
                <strong>
                  {metrics!.profitFactor === null
                    ? "∞"
                    : metrics!.profitFactor.toFixed(2)}
                </strong>
              </span>
            </div>
          ) : null}
          <div className="paper-end-session">
            {confirmEnd ? (
              <>
                <p>
                  Any open position will close at this bar’s close with
                  simulated slippage.
                </p>
                <div>
                  <button
                    className="button compact secondary"
                    type="button"
                    onClick={() => setConfirmEnd(false)}
                  >
                    Keep practicing
                  </button>
                  <button
                    className="button compact danger"
                    type="button"
                    onClick={() => {
                      onChange(
                        finishPaperSession(
                          session,
                          currentBar,
                          currentBarIndex,
                        ),
                      );
                      setConfirmEnd(false);
                    }}
                  >
                    End session
                  </button>
                </div>
              </>
            ) : (
              <button
                className="text-button danger-text"
                type="button"
                onClick={() => setConfirmEnd(true)}
              >
                End and review session
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
