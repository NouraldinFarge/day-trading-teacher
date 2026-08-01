import { useMemo, useState } from "react";
import { Brain, CheckCircle2, Eye, RotateCcw } from "lucide-react";
import {
  conceptCards,
  dueConceptCards,
  type RecallRating,
} from "../../../domain/learning-tools";
import type { ConceptRecallRecord } from "../../../domain/types";

export function RecallDeck({
  records,
  onRate,
}: {
  records: Record<string, ConceptRecallRecord> | undefined;
  onRate(conceptId: string, rating: RecallRating): void;
}) {
  const due = useMemo(() => dueConceptCards(records), [records]);
  const [selectedId, setSelectedId] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const available = showAll ? conceptCards : due;
  const selected =
    available.find((card) => card.id === selectedId) ?? available[0] ?? null;
  const reviewedCount = Object.keys(records ?? {}).length;

  const rate = (rating: RecallRating) => {
    if (!selected || !revealed) return;
    onRate(selected.id, rating);
    setSelectedId("");
    setRevealed(false);
    setShowAll(false);
  };

  return (
    <section
      aria-labelledby="recall-deck-title"
      className="learning-tool-panel"
    >
      <header className="tool-panel-header">
        <span className="tool-panel-icon blue">
          <Brain size={21} />
        </span>
        <div>
          <span className="eyebrow accent">Concept recall deck</span>
          <h2 id="recall-deck-title">Retrieve before you reveal</h2>
          <p>
            Recall a concept from memory, inspect the explanation, then rate the
            effort honestly. Reviews return after increasing intervals.
          </p>
        </div>
      </header>

      <div className="recall-summary" aria-label="Recall status">
        <div>
          <strong>{due.length}</strong>
          <span>due now</span>
        </div>
        <div>
          <strong>
            {reviewedCount}/{conceptCards.length}
          </strong>
          <span>seen at least once</span>
        </div>
        <p>
          A self-rating is a scheduling signal—not proof that a concept is
          mastered.
        </p>
      </div>

      {selected ? (
        <article className="recall-card">
          <header>
            <span className="eyebrow">
              {showAll && !due.some((card) => card.id === selected.id)
                ? "Early review"
                : "Due practice"}
            </span>
            <strong>{selected.term}</strong>
          </header>
          <div className="recall-prompt">
            <small>Answer from memory</small>
            <h3>{selected.prompt}</h3>
            {!revealed ? (
              <p>
                Say or write an answer before continuing. Retrieval effort is
                the practice; recognizing the answer is easier and less useful.
              </p>
            ) : null}
          </div>
          {!revealed ? (
            <button
              className="button primary"
              type="button"
              onClick={() => setRevealed(true)}
            >
              <Eye size={16} />
              Reveal after attempting
            </button>
          ) : (
            <div className="recall-answer" role="status">
              <div>
                <CheckCircle2 size={18} />
                <div>
                  <strong>Explanation</strong>
                  <p>{selected.answer}</p>
                </div>
              </div>
              <div className="recall-transfer">
                <strong>Transfer it</strong>
                <p>{selected.transfer}</p>
              </div>
              <fieldset className="recall-ratings">
                <legend>How difficult was honest retrieval?</legend>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => rate("again")}
                >
                  Need review
                  <small>Return tomorrow</small>
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => rate("hard")}
                >
                  Hard
                  <small>Short interval</small>
                </button>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => rate("good")}
                >
                  Recalled it
                  <small>Increase interval</small>
                </button>
              </fieldset>
            </div>
          )}
        </article>
      ) : (
        <div className="tool-placeholder recall-caught-up">
          <CheckCircle2 size={26} />
          <strong>No concept is due right now</strong>
          <p>
            Spacing is part of the method. You can stop here or browse a card
            early without creating a streak obligation.
          </p>
          <button
            className="button secondary"
            type="button"
            onClick={() => setShowAll(true)}
          >
            <RotateCcw size={16} />
            Browse one early
          </button>
        </div>
      )}
    </section>
  );
}
