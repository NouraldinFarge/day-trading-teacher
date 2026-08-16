import { Link } from "@tanstack/react-router";
import type { RefObject } from "react";
import {
  Bot,
  CandlestickChart,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileSearch,
  FolderOpen,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import type { FidelityImportSettings } from "../../domain/types";
import type {
  TradingRecordChartSession,
  TradingRecordsAnalysis,
} from "../../domain/trading-records";

type Props = {
  analysis: TradingRecordsAnalysis | null;
  settings: FidelityImportSettings | undefined;
  busy: boolean;
  error: string;
  canCreateAiPackage: boolean;
  responseInputRef: RefObject<HTMLInputElement | null>;
  onScan(): void;
  onCreateAiPackage(): void;
  onCopyAiRequest(): void;
  onReadAiResponse(file?: File): void;
  onOpenChart(session: TradingRecordChartSession): void;
};

function bytes(value: number) {
  if (value < 1_000) return `${value} B`;
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)} KB`;
  return `${(value / 1_000_000).toFixed(1)} MB`;
}

export function FidelityEvidenceInbox({
  analysis,
  settings,
  busy,
  error,
  canCreateAiPackage,
  responseInputRef,
  onScan,
  onCreateAiPackage,
  onCopyAiRequest,
  onReadAiResponse,
  onOpenChart,
}: Props) {
  const summary = settings?.lastScanSummary;
  const chartCoverage = analysis
    ? analysis.trades.filter(
        (trade) => analysis.chartContextByTrade[trade.sourceId]?.available,
      ).length
    : (summary?.chartMatchedTradeCount ?? 0);
  const tradeCount =
    analysis?.trades.length ?? summary?.reconstructedTradeCount ?? 0;

  if (!settings?.folderPath)
    return (
      <section className="card evidence-inbox-empty">
        <span className="evidence-inbox-icon">
          <FolderOpen size={26} />
        </span>
        <div>
          <span className="eyebrow">Trading Records evidence inbox</span>
          <h2>Connect the folder once</h2>
          <p>
            Choose the root <strong>Trading_Records</strong> folder. The
            portable app can then read supported Orders and chart CSVs inside
            every dated subfolder without connecting to your Fidelity account.
          </p>
        </div>
        <Link to="/settings" className="button primary">
          Choose folder in Settings
        </Link>
      </section>
    );

  return (
    <div className="evidence-inbox-page">
      <section className="evidence-inbox-hero">
        <div className="evidence-inbox-heading">
          <span className="evidence-inbox-icon">
            <FileSearch size={25} />
          </span>
          <div>
            <span className="eyebrow">Fidelity export inbox</span>
            <h2>
              Your Trading Records are an evidence set—not just a trade list
            </h2>
            <p>
              Orders are reconstructed with Fidelity’s fractional-dollar rules,
              and same-day one-minute charts are paired by date and symbol for
              replay and external-AI journal drafts.
            </p>
          </div>
        </div>
        <div className="evidence-inbox-actions">
          <button className="button secondary" disabled={busy} onClick={onScan}>
            <RefreshCw size={16} className={busy ? "spin" : undefined} />
            {busy ? "Reading records…" : "Scan now"}
          </button>
          <Link to="/settings" className="button ghost">
            Folder settings
          </Link>
        </div>
        <div className="evidence-folder-path" title={settings.folderPath}>
          <FolderOpen size={15} />
          <span>{settings.folderPath}</span>
        </div>
      </section>

      {error ? (
        <div className="error-message" role="alert">
          {error}
        </div>
      ) : null}

      <section
        className="evidence-inbox-stats"
        aria-label="Inbox scan coverage"
      >
        <div>
          <strong>
            {analysis?.days.length ?? summary?.tradingDayCount ?? "—"}
          </strong>
          <span>trading days</span>
        </div>
        <div>
          <strong>
            {analysis?.orderFileCount ?? summary?.orderFileCount ?? "—"}
          </strong>
          <span>Orders exports</span>
        </div>
        <div>
          <strong>
            {analysis?.chartFileCount ?? summary?.chartFileCount ?? "—"}
          </strong>
          <span>chart exports</span>
        </div>
        <div>
          <strong>{tradeCount}</strong>
          <span>positions reconstructed</span>
        </div>
        <div>
          <strong>
            {chartCoverage}/{tradeCount || 0}
          </strong>
          <span>trades with chart context</span>
        </div>
        <div>
          <strong>{analysis ? bytes(analysis.totalBytes) : "—"}</strong>
          <span>supported CSV data read</span>
        </div>
        <div>
          <strong>{summary?.newOrChangedFileCount ?? "—"}</strong>
          <span>new or changed this scan</span>
        </div>
      </section>

      <section className="ai-journal-workflow card">
        <div className="ai-journal-intro">
          <span>
            <Bot size={23} />
          </span>
          <div>
            <span className="eyebrow">Optional external AI handoff</span>
            <h2>
              Let an AI propose the journal; keep yourself as the reviewer
            </h2>
            <p>
              The app creates one sanitized JSON package with order sequences,
              calculated behavior measures, chart context, and explicit
              unknowns. Nothing is uploaded automatically.
            </p>
          </div>
        </div>
        <ol className="ai-journal-steps">
          <li>
            <span>1</span>
            <div>
              <strong>Create the evidence package</strong>
              <small>
                Account identifiers and absolute paths are excluded.
              </small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Upload it to the AI you choose</strong>
              <small>
                Paste the copied request and ask for response JSON only.
              </small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Import the returned draft</strong>
              <small>
                The app checks trade IDs, evidence citations, and safety rules.
              </small>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <strong>Review before accepting</strong>
              <small>
                AI hypotheses never overwrite a completed reflection.
              </small>
            </div>
          </li>
        </ol>
        <div className="ai-journal-actions">
          <button
            className="button primary"
            disabled={!canCreateAiPackage || busy}
            onClick={onCreateAiPackage}
          >
            <Download size={16} />
            Create AI journal package
          </button>
          <button
            className="button secondary"
            disabled={!canCreateAiPackage || busy}
            onClick={onCopyAiRequest}
          >
            <ClipboardCopy size={16} />
            Copy AI request
          </button>
          <button
            className="button secondary"
            disabled={!canCreateAiPackage || busy}
            onClick={() => responseInputRef.current?.click()}
          >
            <Upload size={16} />
            Import AI response
          </button>
          <input
            ref={responseInputRef}
            className="file-input"
            type="file"
            accept=".json,application/json,text/json"
            aria-label="Choose an external AI journal response JSON file"
            onChange={(event) => {
              onReadAiResponse(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </div>
        {!canCreateAiPackage ? (
          <p className="field-hint">
            Scan and import at least one reconstructed trade before creating a
            handoff package.
          </p>
        ) : null}
        <div className="ai-journal-safety-grid">
          <div>
            <ShieldCheck size={18} />
            <p>
              <strong>Privacy boundary</strong>
              <span>
                No credentials, account numbers, screenshots, or raw paths.
              </span>
            </p>
          </div>
          <div>
            <CheckCircle2 size={18} />
            <p>
              <strong>Evidence boundary</strong>
              <span>
                Observed, calculated, inferred, and unknown stay distinct.
              </span>
            </p>
          </div>
          <div>
            <TriangleAlert size={18} />
            <p>
              <strong>Mental-state boundary</strong>
              <span>
                Behavioral hypotheses only—never a diagnosis or memory.
              </span>
            </p>
          </div>
        </div>
      </section>

      {analysis ? (
        <section className="evidence-day-section">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Coverage by day</span>
              <h2>Every dated folder, reconciled</h2>
            </div>
            <small>
              Read {analysis.filesRead} of {analysis.discoveredCsvCount} CSV
              files · {analysis.unsupportedCsvCount} unrelated ·{" "}
              {analysis.skippedCsvCount} skipped by safety limits
            </small>
          </div>
          <div className="evidence-day-list">
            {analysis.days.map((day) => {
              const sessions = analysis.chartSessions.filter(
                (session) => session.date === day.date,
              );
              return (
                <details className="evidence-day-card" key={day.date}>
                  <summary>
                    <div>
                      <strong>{day.date}</strong>
                      <span>
                        {day.symbols.join(" · ") || "No symbol detected"}
                      </span>
                    </div>
                    <div className="evidence-day-metrics">
                      <span>{day.orderCount} orders</span>
                      <span>{day.reconstructedTradeCount} trades</span>
                      <span>
                        {day.chartMatchedTradeCount}/
                        {day.reconstructedTradeCount} charted
                      </span>
                      <strong
                        className={
                          day.calculatedNetCashFlow >= 0
                            ? "positive-text"
                            : "negative-text"
                        }
                      >
                        {day.calculatedNetCashFlow >= 0 ? "+" : ""}$
                        {day.calculatedNetCashFlow.toFixed(2)} cash flow
                      </strong>
                    </div>
                  </summary>
                  <div className="evidence-day-detail">
                    <div className="evidence-label-grid">
                      <div>
                        <span>Observed</span>
                        <strong>
                          ${day.observedBuyDollars.toFixed(2)} invested
                        </strong>
                        <small>
                          {day.orderFiles.length} Orders export read
                        </small>
                      </div>
                      <div>
                        <span>Calculated</span>
                        <strong>
                          ${day.calculatedSellProceeds.toFixed(2)} proceeds
                        </strong>
                        <small>Derived from sold shares × fill prices</small>
                      </div>
                      <div>
                        <span>Unknown</span>
                        <strong>{day.unresolvedOrderCount} unresolved</strong>
                        <small>Missing cost basis is never invented</small>
                      </div>
                    </div>
                    {sessions.length ? (
                      <div className="evidence-chart-links">
                        {sessions.map((session) => (
                          <Link
                            to="/chart"
                            className="button secondary compact"
                            key={session.evidenceRef}
                            onClick={() => onOpenChart(session)}
                          >
                            <CandlestickChart size={15} />
                            Open {session.symbol} replay ({session.bars.length}{" "}
                            bars)
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="field-hint">
                        No same-day chart session could be paired with this
                        folder.
                      </p>
                    )}
                    {day.warnings.length ? (
                      <ul className="validation-list warnings compact-list">
                        {day.warnings.slice(0, 4).map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="card evidence-scan-placeholder">
          <RefreshCw size={22} />
          <div>
            <strong>Scan to build the day-by-day evidence map</strong>
            <p>
              The last saved coverage remains above; detailed order and chart
              data are read only while this page is open.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
