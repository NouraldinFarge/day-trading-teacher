export type ExternalLessonRequest = {
  schema_version: "1.0";
  request_id: string;
  curriculum_version: string;
  learner_level: string;
  target_skill_ids: string[];
  learning_goals: string[];
  accessibility_preferences: {
    plain_language: boolean;
    visual_alternative_required: boolean;
  };
  requested_lesson_count: number;
  allowed_instruments: string[];
  prohibited_content: string[];
};

export function buildExternalLessonPrompt(request: ExternalLessonRequest) {
  return `You are creating a compact, import-ready lesson plan for a local day-trading education app. The app is not AI-driven: it only imports the JSON file that the learner explicitly reviews and approves.

Return only valid JSON. Do not add Markdown fences, commentary, or fields outside the contract.

Safety and teaching rules:
- Educational practice only. Do not give live trade signals, personalized security recommendations, price targets, profit promises, or instructions to evade broker or regulatory safeguards.
- Use historical replay, hypothetical examples, or paper practice. Never require the learner to place a trade to complete a lesson.
- Reward planning, retrieval, reflection, rule adherence, and disciplined no-trade decisions—not activity volume or P&L.
- Separate observed evidence, calculated facts, reported intent, and unknowns. Never invent missing facts.
- Treat process quality and outcome as separate axes.
- Use plain language and define necessary terms.
- Require a written attempt before an answer is revealed.
- Every lesson must open cleanly in the app: its objective is the brief summary, its ordered sections are the step-by-step guide, and its mastery criteria are the closing self-check.
- Give every lesson 7–9 purposeful sections: retrieval, explanation, a worked example when useful, application practice, transfer, and commitment. Avoid filler or repeated wording.
- Include 2–3 single-choice objective checks in every lesson. Each check must test reasoning rather than trivia, explain why the correct option works, and give a concise corrective rule after a wrong answer.
- Distribute correctOption positions across the plan instead of placing correct answers in a repeated slot. The app also reshuffles displayed choices for each attempt.
- Make later distractors plausible professional alternatives with real tradeoffs. Do not rely mainly on obviously reckless choices such as deleting evidence, guaranteeing prices, or trading until profitable.
- Give every lesson a quantitative mastery_standard: first-try check threshold, successful unseen cases out of cases required, a minimum analytic-rubric level, separated retention dates, and a specific remediation route.
- Keep each lesson focused enough to complete in 12–30 minutes. For a longer comprehensive lesson, include session_blocks that separate instruction, independent performance, and review.
- Label alternate-case practice as curriculum_role "extension", link it with extension_of, and state the harder extension_focus instead of repeating a core explanation at the same difficulty.
- Use only skill IDs present in target_skill_ids or prerequisites below.
- Include sources only for claims actually used. If a current rule or broker behavior is not verified, omit the claim or state the uncertainty inside the lesson.

Connected practice available in the app:
- Decision Card: setup eligibility, objective trigger, entry and invalidation, maximum risk, execution behavior, exit architecture, time failure, and cancellation conditions.
- Chart Replay: historical one-minute bars, recorded-trade markers, pause/reveal replay, drawing and measurement, paper decisions, and backtests.
- Evidence Journal: imported or manual executions, factual timelines, plan-versus-execution review, emotions, mistakes, screenshots, process scoring, and pattern insights.
- Learning Lab: deterministic risk sizing, expectancy, decision-order scenarios, plan-quality coaching, and spaced recall.
The app will infer feasible workspace missions from each lesson's skill_ids. Write activities that produce useful evidence in those workspaces, but never require a workspace when it would not support the lesson objective.

Exact JSON contract:
{
  "schema_version": "1.0",
  "plan_id": "3-80 characters: letters, numbers, period, underscore, hyphen",
  "version": "semantic version string",
  "title": "plan title",
  "origin": {
    "type": "external_generated",
    "provider": "ChatGPT",
    "model": "model name"
  },
  "target_skill_ids": ["known skill IDs"],
  "prerequisites": ["known skill IDs"],
  "lessons": [
    {
      "lesson_id": "unique 3-80 character ID",
      "version": "semantic version string",
      "title": "lesson title",
      "skill_ids": ["known skill IDs"],
      "objective": "10-1000 character summary of what the learner will do",
      "estimated_minutes": 10,
      "curriculum_role": "core | extension | remediation | assessment (optional)",
      "extension_of": "linked core lesson ID when this is an extension",
      "extension_focus": "harder cases or transfer demand when this is an extension",
      "session_blocks": [
        {
          "title": "Instruction | Independent performance | Review",
          "minutes": 10,
          "focus": "what happens in this block"
        }
      ],
      "sections": [
        {
          "type": "retrieval | explanation | worked_example | practice | transfer | commitment",
          "title": "section title",
          "body": "instruction or teaching content",
          "prompt": "optional learner question",
          "answer": "optional answer and reasoning",
          "check": {
            "kind": "single_choice",
            "options": ["2–6 plausible choices"],
            "correctOption": 0,
            "success": "why this reasoning holds",
            "correction": "the rule to use after a wrong answer"
          }
        }
      ],
      "mastery_criteria": ["observable self-check with a quantity or accuracy threshold"],
      "mastery_standard": {
        "minimum_first_try_correct": 2,
        "unseen_cases_required": 5,
        "minimum_successful_cases": 4,
        "minimum_rubric_level": 2,
        "retention_practice_dates": 2,
        "remediation": "specific weakest-skill repair and new-case retry"
      }
    }
  ],
  "sources": [
    {
      "title": "source title",
      "url": "optional https URL",
      "last_verified": "optional ISO date"
    }
  ],
  "created_at": "ISO-8601 timestamp"
}

Include the check object only on the 2–3 objective-check sections in each lesson. On other sections, omit check entirely. A check section must also include prompt; answer remains optional because success and correction provide its feedback.

Hard limits: 1–24 lessons; 1–90 minutes per lesson; 1–20 sections per lesson; 1–10 mastery criteria; no executable HTML; no unknown skill IDs.

Before returning JSON, silently verify that every required field is present, every object contains only allowed fields, lesson IDs are unique, strings are within reasonable lengths, the lesson count matches the request, correct-answer positions are balanced, and at least half of later distractors are plausible alternatives rather than obviously irresponsible behavior.

Lesson request:
${JSON.stringify(request, null, 2)}`;
}
