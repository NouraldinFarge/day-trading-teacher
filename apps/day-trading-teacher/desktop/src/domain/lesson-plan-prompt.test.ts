import { describe, expect, it } from "vitest";
import {
  buildExternalLessonPrompt,
  type ExternalLessonRequest,
} from "./lesson-plan-prompt";

const request: ExternalLessonRequest = {
  schema_version: "1.0",
  request_id: "request-123",
  curriculum_version: "5.0",
  learner_level: "developing",
  target_skill_ids: ["TR-001", "PB-006"],
  learning_goals: [
    "Reconstruct a factual timeline",
    "Reset before a re-entry decision",
  ],
  accessibility_preferences: {
    plain_language: true,
    visual_alternative_required: true,
  },
  requested_lesson_count: 3,
  allowed_instruments: ["equity", "etf"],
  prohibited_content: ["live trade signals"],
};

describe("buildExternalLessonPrompt", () => {
  it("includes the import contract and responsible learning constraints", () => {
    const prompt = buildExternalLessonPrompt(request);
    expect(prompt).toContain('"schema_version": "1.0"');
    expect(prompt).toContain("Never require the learner to place a trade");
    expect(prompt).toContain("disciplined no-trade decisions");
    expect(prompt).toContain("2–3 single-choice objective checks");
    expect(prompt).toContain("Distribute correctOption positions");
    expect(prompt).toContain("plausible professional alternatives");
    expect(prompt).toContain('"mastery_standard"');
    expect(prompt).toContain('curriculum_role "extension"');
    expect(prompt).toContain("Decision Card");
    expect(prompt).toContain("Chart Replay");
    expect(prompt).toContain("Evidence Journal");
    expect(prompt).toContain("Learning Lab");
    expect(prompt).toContain('"correctOption": 0');
    expect(prompt).toContain('"TR-001"');
    expect(prompt).toContain('"requested_lesson_count": 3');
  });
});
