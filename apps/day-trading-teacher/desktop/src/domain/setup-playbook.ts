import type { SetupPlaybook } from "./types";

export type PlaybookQuality = {
  completed: number;
  total: number;
  percent: number;
  readyForReplay: boolean;
  missing: string[];
  cautions: string[];
};

const requiredFields: Array<{
  label: string;
  present(playbook: SetupPlaybook): boolean;
}> = [
  {
    label: "a specific name",
    present: (playbook) => Boolean(playbook.title.trim()),
  },
  {
    label: "market and timeframe boundaries",
    present: (playbook) =>
      Boolean(playbook.market.trim() && playbook.timeframe.trim()),
  },
  {
    label: "context requirements",
    present: (playbook) =>
      playbook.contextRequirements.some((item) => Boolean(item.trim())),
  },
  {
    label: "confirmation requirements",
    present: (playbook) =>
      playbook.confirmationRequirements.some((item) => Boolean(item.trim())),
  },
  {
    label: "an observable trigger",
    present: (playbook) => Boolean(playbook.trigger.trim()),
  },
  {
    label: "structural invalidation",
    present: (playbook) => Boolean(playbook.invalidation.trim()),
  },
  {
    label: "a liquidity or spread rule",
    present: (playbook) => Boolean(playbook.liquidityRule.trim()),
  },
  {
    label: "at least one disqualifier",
    present: (playbook) =>
      playbook.disqualifiers.some((item) => Boolean(item.trim())),
  },
  {
    label: "a management rule",
    present: (playbook) => Boolean(playbook.managementRule.trim()),
  },
  {
    label: "review questions",
    present: (playbook) =>
      playbook.reviewQuestions.some((item) => Boolean(item.trim())),
  },
];

export function cleanPlaybookLines(lines: string[]) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))].slice(
    0,
    20,
  );
}

export function evaluateSetupPlaybook(
  playbook: SetupPlaybook,
): PlaybookQuality {
  const missing = requiredFields
    .filter((field) => !field.present(playbook))
    .map((field) => field.label);
  const completed = requiredFields.length - missing.length;
  const cautions: string[] = [];
  if (playbook.reviewedExamples < 5)
    cautions.push(
      "The example set is still small. Treat every conclusion as a hypothesis.",
    );
  if (playbook.status === "draft")
    cautions.push("Drafts belong in study, not in a simulated order ticket.");
  if (playbook.status === "retired")
    cautions.push("This playbook is retired and should remain review-only.");
  return {
    completed,
    total: requiredFields.length,
    percent: Math.round((completed / requiredFields.length) * 100),
    readyForReplay: missing.length === 0 && playbook.status === "practice_only",
    missing,
    cautions,
  };
}

export function blankSetupPlaybook(now = new Date()): SetupPlaybook {
  const timestamp = now.toISOString();
  return {
    id: `playbook-${now.getTime()}`,
    title: "",
    market: "",
    timeframe: "",
    contextRequirements: [],
    confirmationRequirements: [],
    trigger: "",
    invalidation: "",
    liquidityRule: "",
    disqualifiers: [],
    managementRule: "",
    reviewQuestions: [],
    reviewedExamples: 0,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
