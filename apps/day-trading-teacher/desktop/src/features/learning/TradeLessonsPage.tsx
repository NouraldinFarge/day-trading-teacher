import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  Eye,
  FileQuestion,
  Filter,
  GitBranch,
  GraduationCap,
  Layers3,
  ListChecks,
  NotebookPen,
  Search,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { tradeLearningSystemMarkdown } from "../../domain/trade-learning";
import type {
  TradeLearningKnowledgeItem,
  TradeLearningSystem,
  TradeLessonAudit,
  TradeLessonPriority,
} from "../../domain/types";
import { useAppState } from "../../state/AppStateContext";

type LearningView = "timeline" | "patterns" | "rules";

const priorities: Array<"all" | TradeLessonPriority> = [
  "all",
  "Critical immediate correction",
  "High-priority improvement",
  "Important reinforcement",
  "Minor refinement",
  "Informational only",
];

function localDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function clock(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainder}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function money(value: number) {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

function priorityClass(priority: TradeLessonPriority) {
  if (priority === "Critical immediate correction") return "critical";
  if (priority === "High-priority improvement") return "high";
  if (priority === "Important reinforcement") return "important";
  return "minor";
}

function downloadReport(system: TradeLearningSystem) {
  const content = tradeLearningSystemMarkdown(system);
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `trade-learning-audit_${system.tradeAudits.at(-1)?.tradingDate ?? "oldest"}_to_${system.tradeAudits[0]?.tradingDate ?? "newest"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BulletSection({
  title,
  icon,
  items,
  tone = "",
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  tone?: string;
}) {
  return (
    <section className={`trade-learning-summary-card ${tone}`}>
      <header>
        <span>{icon}</span>
        <h3>{title}</h3>
      </header>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function KnowledgeGroup({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: TradeLearningKnowledgeItem[];
}) {
  return (
    <section className="knowledge-level">
      <header>
        <span>{items.length}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      <div className="knowledge-level-list">
        {items.map((item) => (
          <details key={item.id}>
            <summary>
              <span>
                <strong>{item.title}</strong>
                <small>{item.rule}</small>
              </span>
              <ChevronDown size={16} />
            </summary>
            <div>
              <p>
                <strong>Applies when:</strong> {item.appliesWhen}
              </p>
              <p>
                <strong>Boundary or exception:</strong> {item.exception}
              </p>
              <p>
                <strong>Evidence:</strong> {item.evidence}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function EvidenceLane({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <section className={`trade-evidence-lane ${tone}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function AuditBody({ audit }: { audit: TradeLessonAudit }) {
  return (
    <div className="trade-audit-body">
      <div className="trade-audit-preservation">
        <EvidenceLane
          title="Known before entry"
          items={audit.temporalEvidence.knownBeforeEntry}
          tone="before"
        />
        <EvidenceLane
          title="Observed at entry"
          items={audit.temporalEvidence.observedAtEntry}
          tone="entry"
        />
        <EvidenceLane
          title="During the trade"
          items={audit.temporalEvidence.occurredDuringTrade}
          tone="during"
        />
        <EvidenceLane
          title="Known only afterward"
          items={audit.temporalEvidence.knownOnlyAfterward}
          tone="after"
        />
      </div>

      <section className="trade-audit-section">
        <h4>Trade summary</h4>
        <p>{audit.tradeSummary}</p>
      </section>
      <section className="trade-audit-section">
        <h4>Original thesis</h4>
        <p>{audit.originalThesis}</p>
      </section>

      <div className="trade-audit-two-column">
        <section className="trade-audit-section strength">
          <h4>
            <CheckCircle2 size={16} /> What was done well
          </h4>
          <ul>
            {audit.whatWasDoneWell.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="trade-audit-section correction">
          <h4>
            <AlertTriangle size={16} /> What was done poorly or remains
            unscorable
          </h4>
          <ul>
            {audit.whatWasDonePoorly.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="original-versus-revised">
        <section>
          <span className="eyebrow">Preserved—not overwritten</span>
          <h4>Original lesson</h4>
          <p>{audit.originalLesson}</p>
        </section>
        <section>
          <span className="eyebrow accent">Quality audit</span>
          <h4>Lesson audit</h4>
          <p>{audit.lessonAudit}</p>
        </section>
      </div>

      <section className="revised-lesson-grid">
        <header>
          <BrainCircuit size={20} />
          <div>
            <span className="eyebrow">Rewritten for future decisions</span>
            <h4>Revised lesson</h4>
          </div>
        </header>
        {(
          [
            ["Observation", audit.revisedLesson.observation],
            [
              "Decision error or strength",
              audit.revisedLesson.decisionErrorOrStrength,
            ],
            ["Underlying cause", audit.revisedLesson.underlyingCause],
            ["Correct principle", audit.revisedLesson.correctPrinciple],
            ["Future rule", audit.revisedLesson.futureRule],
            ["Exact trigger", audit.revisedLesson.trigger],
            ["Verification", audit.revisedLesson.verification],
            ["Practice", audit.revisedLesson.practice],
          ] as const
        ).map(([label, value], index) => (
          <div key={label}>
            <span>{index + 1}</span>
            <p>
              <strong>{label}</strong>
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="trade-rule-callout">
        <ShieldCheck size={22} />
        <div>
          <span className="eyebrow">Actionable trading rule</span>
          <strong>{audit.actionableTradingRule}</strong>
        </div>
      </section>

      <div className="trade-checkpoint-grid">
        <section>
          <small>Before entry</small>
          <strong>{audit.preTradeChecklistQuestion}</strong>
        </section>
        <section>
          <small>In-trade checkpoint</small>
          <strong>{audit.inTradeCheckpoint}</strong>
        </section>
        <section>
          <small>Post-trade review</small>
          <strong>{audit.postTradeReviewQuestion}</strong>
        </section>
      </div>

      <section className="trade-confidence-block">
        <div>
          <small>Evidence confidence</small>
          <strong>{audit.evidenceAndConfidence.confidence}</strong>
        </div>
        <p>{audit.evidenceAndConfidence.rationale}</p>
        <span>
          {audit.evidenceAndConfidence.evidenceRefs.length} linked evidence
          reference
          {audit.evidenceAndConfidence.evidenceRefs.length === 1 ? "" : "s"}
        </span>
      </section>

      <section className="trade-missing-evidence">
        <FileQuestion size={18} />
        <div>
          <h4>Missing information—not invented</h4>
          <ul>
            {audit.temporalEvidence.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="trade-connections">
        <h4>
          <GitBranch size={17} /> Connection to other trades
        </h4>
        <div>
          {audit.connections.map((connection) => (
            <article key={connection.tradeSourceId}>
              <span>{connection.relationship}</span>
              <strong>{connection.displayId}</strong>
              <p>{connection.explanation}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TradeAuditCard({
  audit,
  onReview,
}: {
  audit: TradeLessonAudit;
  onReview(): void;
}) {
  return (
    <article
      className={`trade-audit-card ${audit.reviewedAt ? "reviewed" : ""}`}
      id={`trade-lesson-${audit.sequence}`}
    >
      <details open={audit.sequence === 1}>
        <summary>
          <span className="trade-audit-sequence">{audit.sequence}</span>
          <div className="trade-audit-title">
            <span className="eyebrow">
              {localDate(audit.tradingDate)} · {clock(audit.entryAt)} ET
            </span>
            <strong>
              {audit.symbol} · {audit.displayId}
            </strong>
            <small>{audit.revisedLesson.correctPrinciple}</small>
          </div>
          <div className="trade-audit-facts">
            <span>{money(audit.facts.investedDollars)} invested</span>
            <span>{duration(audit.facts.holdingSeconds)}</span>
            <span className={audit.facts.calculatedGrossPnl < 0 ? "loss" : ""}>
              {money(audit.facts.calculatedGrossPnl)} gross
            </span>
          </div>
          <div className="trade-audit-state">
            <span
              className={`lesson-priority ${priorityClass(audit.priority)}`}
            >
              {audit.priority}
            </span>
            {audit.reviewedAt ? (
              <small>
                <Check size={13} /> Reviewed
              </small>
            ) : (
              <small>Awaiting your review</small>
            )}
          </div>
          <ChevronDown className="details-chevron" size={18} />
        </summary>
        <AuditBody audit={audit} />
        <footer className="trade-audit-footer">
          <div>
            <strong>Review the rule—not just the result.</strong>
            <small>
              Marking this reviewed confirms you compared it with your own
              memory; it does not claim mastery.
            </small>
          </div>
          <div className="data-actions">
            <Link to="/chart" className="button ghost">
              <Eye size={15} /> Open Chart Lab
            </Link>
            <Link to="/trades" className="button secondary">
              <NotebookPen size={15} /> Open Journal
            </Link>
            <button
              className="button primary"
              type="button"
              disabled={Boolean(audit.reviewedAt)}
              onClick={onReview}
            >
              <CheckCircle2 size={15} />
              {audit.reviewedAt ? "Lesson reviewed" : "Mark lesson reviewed"}
            </button>
          </div>
        </footer>
      </details>
    </article>
  );
}

export function TradeLessonsPage() {
  const { state, reviewTradeLesson } = useAppState();
  const system = state.tradeLearningSystem;
  const [view, setView] = useState<LearningView>("timeline");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"all" | TradeLessonPriority>("all");
  const [visibleCount, setVisibleCount] = useState(12);

  const filteredAudits = useMemo(() => {
    if (!system) return [];
    const needle = query.trim().toLowerCase();
    return system.tradeAudits.filter(
      (audit) =>
        (priority === "all" || audit.priority === priority) &&
        (!needle ||
          audit.symbol.toLowerCase().includes(needle) ||
          audit.tradingDate.includes(needle) ||
          audit.displayId.toLowerCase().includes(needle) ||
          audit.actionableTradingRule.toLowerCase().includes(needle) ||
          audit.patternIds.some((pattern) =>
            pattern.toLowerCase().includes(needle),
          )),
    );
  }, [priority, query, system]);

  if (!system)
    return (
      <div>
        <PageHeader
          eyebrow="Trade-derived lessons"
          title="Turn Trading Records into a learning path"
          description="Import validated external-AI journal drafts from the Fidelity Evidence Inbox to create a newest-to-oldest lesson audit without changing the original trades."
        />
        <EmptyState
          icon={<BookOpenCheck size={28} />}
          title="No trade lesson audit yet"
          body="Open the Fidelity Evidence Inbox, scan Trading_Records, and import a validated AI journal response. The app will preserve each original lesson and build the revised learning system locally."
          action={
            <Link to="/trades" className="button primary">
              Open Evidence Inbox <ArrowRight size={16} />
            </Link>
          }
        />
      </div>
    );

  const newest = system.tradeAudits[0];
  const reviewed = system.tradeAudits.filter(
    (audit) => audit.reviewedAt,
  ).length;
  const reviewPercent = Math.round(
    (reviewed / system.tradeAudits.length) * 100,
  );
  const relevantOlderAudits =
    system.focusPlan.olderTradeSourceIdsToRevisit.flatMap((sourceId) => {
      const audit = system.tradeAudits.find(
        (candidate) => candidate.tradeSourceId === sourceId,
      );
      return audit ? [audit] : [];
    });

  return (
    <div className="trade-learning-page">
      <PageHeader
        eyebrow="Trade-derived learning path"
        title="Newest evidence first. Older trades test the lesson."
        description="Every trade keeps its original facts, thesis gap, and original lesson. Revised rules are separated from hindsight and linked across the full history."
        actions={
          <>
            <button
              className="button secondary"
              type="button"
              onClick={() => downloadReport(system)}
            >
              <Download size={16} /> Download full audit
            </button>
            <Link to="/trades" className="button primary">
              <NotebookPen size={16} /> Open Journal
            </Link>
          </>
        }
      />

      <section className="trade-learning-hero">
        <div className="trade-learning-hero-main">
          <span className="eyebrow">
            <AlertTriangle size={14} /> Latest trade · {newest.symbol} ·{" "}
            {localDate(newest.tradingDate)}
          </span>
          <h2>{system.focusPlan.firstBehaviorToCorrect}</h2>
          <p>{newest.revisedLesson.observation}</p>
          <div className="latest-trade-rule">
            <ShieldCheck size={21} />
            <div>
              <small>Rule to apply now</small>
              <strong>{newest.actionableTradingRule}</strong>
            </div>
          </div>
          <div className="data-actions">
            <button
              className="button primary"
              type="button"
              onClick={() => {
                setView("timeline");
                document
                  .getElementById("trade-lesson-1")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Review {newest.displayId} <ArrowRight size={16} />
            </button>
            <Link to="/plan" className="button secondary">
              <ClipboardCheck size={16} /> Practice a Decision Card
            </Link>
            <Link to="/chart" className="button ghost">
              <BarChart3 size={16} /> Replay the evidence
            </Link>
          </div>
        </div>
        <aside className="trade-learning-progress-card">
          <div
            className="progress-ring"
            style={{ "--progress": reviewPercent } as CSSProperties}
          >
            <span>
              <strong>{reviewed}</strong>
              <small>of {system.tradeAudits.length}</small>
            </span>
          </div>
          <div>
            <span className="eyebrow">Learner review progress</span>
            <h3>{reviewPercent}% compared with your memory</h3>
            <p>
              Review is evidence of reflection—not proof of mastery. Rest days
              never reduce it.
            </p>
          </div>
          <dl>
            <div>
              <dt>Patterns</dt>
              <dd>{system.patterns.length}</dd>
            </div>
            <div>
              <dt>Rules</dt>
              <dd>{system.consolidatedRules.length}</dd>
            </div>
            <div>
              <dt>Order</dt>
              <dd>Newest first</dd>
            </div>
          </dl>
        </aside>
      </section>

      <nav className="trade-learning-tabs" aria-label="Trade lesson views">
        {(
          [
            ["timeline", "Newest-to-oldest audits", CalendarClock],
            ["patterns", "Patterns & hierarchy", BrainCircuit],
            ["rules", "Rules, checklist & focus", ListChecks],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={view === id ? "active" : ""}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </nav>

      {view === "timeline" ? (
        <section
          className="trade-audit-timeline"
          aria-label="Trade lesson audits"
        >
          <div className="trade-learning-filterbar">
            <label>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(12);
                }}
                placeholder="Search symbol, date, rule, or pattern"
                aria-label="Search trade lesson audits"
              />
            </label>
            <label>
              <Filter size={16} />
              <select
                value={priority}
                onChange={(event) => {
                  setPriority(
                    event.target.value as "all" | TradeLessonPriority,
                  );
                  setVisibleCount(12);
                }}
                aria-label="Filter by lesson priority"
              >
                {priorities.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "All priorities" : value}
                  </option>
                ))}
              </select>
            </label>
            <span>
              Showing {Math.min(visibleCount, filteredAudits.length)} of{" "}
              {filteredAudits.length} in strict newest-to-oldest order
            </span>
          </div>

          {filteredAudits.slice(0, visibleCount).map((audit) => (
            <TradeAuditCard
              key={audit.tradeSourceId}
              audit={audit}
              onReview={() => reviewTradeLesson(audit.tradeSourceId)}
            />
          ))}
          {!filteredAudits.length ? (
            <div className="card compact-empty">
              <Search size={24} />
              <h3>No lesson matches this filter</h3>
              <p>Clear the search or choose another priority.</p>
            </div>
          ) : null}
          {visibleCount < filteredAudits.length ? (
            <button
              className="button secondary trade-audit-load-more"
              type="button"
              onClick={() => setVisibleCount((current) => current + 12)}
            >
              Show the next {Math.min(12, filteredAudits.length - visibleCount)}
              <ChevronDown size={16} />
            </button>
          ) : null}
        </section>
      ) : null}

      {view === "patterns" ? (
        <div className="trade-patterns-view">
          <section className="trade-learning-summary-grid">
            <BulletSection
              title="Most urgent lessons"
              icon={<Target size={19} />}
              items={system.consolidated.mostUrgentLessons}
              tone="urgent"
            />
            <BulletSection
              title="Recurring strengths"
              icon={<ShieldCheck size={19} />}
              items={system.consolidated.recurringStrengths}
              tone="strength"
            />
            <BulletSection
              title="Recurring mistakes"
              icon={<AlertTriangle size={19} />}
              items={system.consolidated.recurringMistakes}
              tone="warning"
            />
            <BulletSection
              title="Recognized versus implemented"
              icon={<ClipboardCheck size={19} />}
              items={system.consolidated.lessonsRecognizedButNotImplemented}
            />
            <BulletSection
              title="Improvements over time"
              icon={<TrendingUp size={19} />}
              items={system.consolidated.improvementsOverTime}
              tone="strength"
            />
            <BulletSection
              title="Regressions over time"
              icon={<TrendingDown size={19} />}
              items={system.consolidated.regressionsOverTime}
              tone="warning"
            />
            <BulletSection
              title="Missing knowledge"
              icon={<FileQuestion size={19} />}
              items={system.consolidated.missingKnowledge}
            />
          </section>

          <section className="section-gap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Running pattern map</span>
                <h2>Repeated mechanisms—not lookalike charts</h2>
                <p>
                  Frequency compares the older and newer halves of this evidence
                  set. Similar trades are grouped only when they share an
                  observable decision mechanism.
                </p>
              </div>
            </div>
            <div className="pattern-map-grid">
              {system.patterns.map((pattern) => (
                <article
                  key={pattern.id}
                  className={`pattern-map-card ${pattern.category}`}
                >
                  <header>
                    <span>{pattern.occurrences}</span>
                    <div>
                      <small>{pattern.category.replace("-", " ")}</small>
                      <h3>{pattern.title}</h3>
                    </div>
                    <em className={pattern.frequencyDirection}>
                      {pattern.frequencyDirection}
                    </em>
                  </header>
                  <p>{pattern.sharedMechanism}</p>
                  <dl>
                    <div>
                      <dt>Earliest</dt>
                      <dd>{pattern.earliestOccurrence}</dd>
                    </div>
                    <div>
                      <dt>Most recent</dt>
                      <dd>{pattern.mostRecentOccurrence}</dd>
                    </div>
                    <div>
                      <dt>Confidence</dt>
                      <dd>{pattern.confidence}</dd>
                    </div>
                  </dl>
                  <details>
                    <summary>
                      Inspect trigger, consequence, and correction
                      <ChevronDown size={15} />
                    </summary>
                    <div>
                      <p>
                        <strong>Typical trigger:</strong>{" "}
                        {pattern.typicalTrigger}
                      </p>
                      <p>
                        <strong>Typical consequence:</strong>{" "}
                        {pattern.typicalConsequence}
                      </p>
                      <p>
                        <strong>Existing lesson:</strong>{" "}
                        {pattern.existingLessonOrRule}
                      </p>
                      <p>
                        <strong>Implementation evidence:</strong>{" "}
                        {pattern.implementationEvidence}
                      </p>
                      <p>
                        <strong>Best correction:</strong>{" "}
                        {pattern.bestCorrectiveAction}
                      </p>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          </section>

          <section className="section-gap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Knowledge hierarchy</span>
                <h2>Principles first. Conditional rules stay conditional.</h2>
                <p>
                  Overlapping lessons are consolidated so a strategy-specific
                  observation cannot silently become a universal rule.
                </p>
              </div>
            </div>
            <div className="knowledge-hierarchy-grid">
              <KnowledgeGroup
                title="1. Foundational principles"
                description="Durable across setups and outcomes."
                items={system.knowledgeHierarchy.foundationalPrinciples}
              />
              <KnowledgeGroup
                title="2. Strategy-specific rules"
                description="Valid only when the named setup is actually planned."
                items={system.knowledgeHierarchy.strategySpecificRules}
              />
              <KnowledgeGroup
                title="3. Situational adjustments"
                description="Activated by timing, evidence resolution, or scaling."
                items={system.knowledgeHierarchy.situationalAdjustments}
              />
              <KnowledgeGroup
                title="4. Personal behavioral safeguards"
                description="Gates for the repeated decision mechanisms in this history."
                items={system.knowledgeHierarchy.personalBehavioralSafeguards}
              />
            </div>
          </section>
        </div>
      ) : null}

      {view === "rules" ? (
        <div className="trade-rules-view">
          <section className="focus-plan-card">
            <header>
              <span>
                <Target size={25} />
              </span>
              <div>
                <span className="eyebrow">One focus at a time</span>
                <h2>{system.focusPlan.firstBehaviorToCorrect}</h2>
                <p>{system.focusPlan.firstConceptToStudy}</p>
              </div>
            </header>
            <div className="focus-plan-steps">
              <article>
                <span>1</span>
                <div>
                  <small>Rule to practice</small>
                  <strong>{system.focusPlan.firstRuleToPractice}</strong>
                </div>
              </article>
              <article>
                <span>2</span>
                <div>
                  <small>Measurable review</small>
                  <strong>{system.focusPlan.measurableReviewMethod}</strong>
                </div>
              </article>
              <article>
                <span>3</span>
                <div>
                  <small>Evidence gate</small>
                  <strong>{system.focusPlan.evidenceRequiredToAdvance}</strong>
                </div>
              </article>
              <article>
                <span>4</span>
                <div>
                  <small>Then advance to</small>
                  <strong>{system.focusPlan.nextFocusArea}</strong>
                </div>
              </article>
            </div>
            <div className="focus-example-strip">
              <span>Older evidence to revisit</span>
              <div>
                {relevantOlderAudits.map((audit) => (
                  <button
                    type="button"
                    key={audit.tradeSourceId}
                    onClick={() => {
                      setView("timeline");
                      setQuery(audit.displayId);
                      setPriority("all");
                    }}
                  >
                    {audit.displayId}
                  </button>
                ))}
              </div>
            </div>
            <div className="data-actions">
              <Link to="/plan" className="button primary">
                <ClipboardCheck size={16} /> Open Decision Card
              </Link>
              <Link to="/chart" className="button secondary">
                <BarChart3 size={16} /> Start outcome-hidden replay
              </Link>
              <Link to="/learn/tools" className="button ghost">
                <GraduationCap size={16} /> Open Learning Lab
              </Link>
            </div>
          </section>

          <section className="section-gap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Consolidated trading rules</span>
                <h2>One rule per mechanism, with boundaries and proof</h2>
              </div>
            </div>
            <div className="consolidated-rule-list">
              {system.consolidatedRules.map((rule, index) => (
                <article key={rule.id}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{rule.rule}</h3>
                    <p>{rule.whyItExists}</p>
                    <dl>
                      <div>
                        <dt>Applies when</dt>
                        <dd>{rule.appliesWhen}</dd>
                      </div>
                      <div>
                        <dt>Does not apply when</dt>
                        <dd>{rule.doesNotApplyWhen}</dd>
                      </div>
                      <div>
                        <dt>Compliance measure</dt>
                        <dd>{rule.complianceMeasure}</dd>
                      </div>
                      <div>
                        <dt>Supporting records</dt>
                        <dd>{rule.supportingTradeSourceIds.length}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section-gap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Updated trading checklist</span>
                <h2>Only the highest-value checks supported by the history</h2>
              </div>
            </div>
            <div className="trade-checklist-board">
              {(
                [
                  ["Before entry", system.checklist.beforeEntry],
                  ["At entry", system.checklist.atEntry],
                  ["During the trade", system.checklist.duringTrade],
                  ["Before exit", system.checklist.beforeExit],
                  ["After the trade", system.checklist.afterTrade],
                ] as const
              ).map(([title, items], groupIndex) => (
                <section key={title}>
                  <header>
                    <span>{groupIndex + 1}</span>
                    <h3>{title}</h3>
                  </header>
                  <ul>
                    {items.map((item) => (
                      <li key={item}>
                        <span /> {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <section className="trade-learning-safety-note">
        <Layers3 size={18} />
        <p>
          This system is retrospective education. It does not provide live
          signals, security recommendations, diagnoses, or proof of mental
          state. Strategy names and behavioral interpretations remain hypotheses
          until you confirm them against contemporaneous plans and your own
          memory.
        </p>
      </section>
    </div>
  );
}

export default TradeLessonsPage;
