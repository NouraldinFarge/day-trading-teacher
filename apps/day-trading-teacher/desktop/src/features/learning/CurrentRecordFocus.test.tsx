import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { builtInLessons } from "../../domain/builtin-lessons";
import type { TradeLearningSystem } from "../../domain/types";
import { CurrentRecordFocus } from "./CurrentRecordFocus";

afterEach(cleanup);

const priorityLesson = builtInLessons.find(
  (lesson) => lesson.lesson_id === "builtin-rm-005",
)!;

describe("CurrentRecordFocus", () => {
  it("explains the record-informed correction without exposing raw trade details", () => {
    const onOpen = vi.fn();
    render(
      <CurrentRecordFocus
        lesson={priorityLesson}
        complete={false}
        onOpen={onOpen}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Break the rescue cycle" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Correct the units")).toBeInTheDocument();
    expect(screen.getByText("Bound the whole thesis")).toBeInTheDocument();
    expect(screen.getByText("Exit the invalidation")).toBeInTheDocument();
    expect(screen.getByText("Lock out the rescue")).toBeInTheDocument();
    expect(
      screen.getByText(/raw account details not bundled/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Start priority lesson" }),
    );
    expect(onOpen).toHaveBeenCalledWith(priorityLesson);
  });

  it("keeps completed practice available without presenting it as permanent mastery", () => {
    render(
      <CurrentRecordFocus lesson={priorityLesson} complete onOpen={vi.fn()} />,
    );

    expect(screen.getByText("Current priority practiced")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Practice the boundary again" }),
    ).toBeInTheDocument();
  });

  it("prioritizes the newest evidence audit while keeping the core lesson available", () => {
    const openLesson = vi.fn();
    const openTradeLessons = vi.fn();
    const learningSystem = {
      tradeAudits: [
        {
          tradingDate: "2026-08-14",
          symbol: "TEST",
          priority: "Critical immediate correction",
          evidenceAndConfidence: { confidence: "Strongly supported" },
          revisedLesson: {
            observation: "A later lower-priced buy is present in the record.",
            correctPrinciple: "Treat every tranche as one bounded position.",
            verification: "Check the timestamped tranche plan before entry.",
          },
          inTradeCheckpoint:
            "Is this add prewritten and still inside the position risk cap?",
        },
      ],
    } as TradeLearningSystem;

    render(
      <CurrentRecordFocus
        lesson={priorityLesson}
        complete={false}
        onOpen={openLesson}
        learningSystem={learningSystem}
        onOpenTradeLessons={openTradeLessons}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Govern every add before the first fill",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2026-08-14 · TEST/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Review latest trade lesson" }),
    );
    expect(openTradeLessons).toHaveBeenCalledOnce();
    fireEvent.click(
      screen.getByRole("button", { name: "Practice the core rule" }),
    );
    expect(openLesson).toHaveBeenCalledWith(priorityLesson);
  });
});
