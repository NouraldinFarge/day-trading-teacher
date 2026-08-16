import path from "node:path";
import type * as axeCore from "axe-core";
import { expect, test, type Page } from "@playwright/test";

const axePath = path.join(
  process.cwd(),
  "node_modules",
  "axe-core",
  "axe.min.js",
);

type AxeViolation = {
  id: string;
  impact: string | null;
  help: string;
  nodes: Array<{ target: string[]; failureSummary?: string }>;
};

async function expectNoSeriousAccessibilityViolations(page: Page) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      resultTypes: ["violations"],
    });
    return result.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    );
  });
  expect(violations as AxeViolation[]).toEqual([]);
}

async function completeWelcome(page: Page) {
  await expect(page.getByRole("dialog", { name: "Welcome" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("What should we call you?")
    .fill("Documentation Learner");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start learning" }).click();
}

test("first run leads into a keyboard-accessible lesson workspace", async ({
  page,
}) => {
  await page.goto("/");
  await completeWelcome(page);
  await expect(
    page.getByRole("heading", { name: "Learn, apply, reflect, and return" }),
  ).toBeVisible();
  await expect(page.getByText("Stored on this device")).toHaveCount(0);
  await expect(page.getByText("Browser preview mode")).toHaveCount(1);
  await expectNoSeriousAccessibilityViolations(page);

  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("dialog", { name: "Quick actions" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Quick actions" })).toHaveCount(
    0,
  );
});

test("chart workspace is responsive and preserves its educational boundary", async ({
  page,
}) => {
  await page.goto("/");
  await completeWelcome(page);
  await page.goto("/chart");
  await expect(
    page.getByRole("heading", {
      name: "Transfer the lesson onto historical evidence",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/results remain evidence—not forecasts/i),
  ).toBeVisible();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  await expectNoSeriousAccessibilityViolations(page);
});

test("guided journal sample explains itself and never persists", async ({
  page,
}) => {
  await page.goto("/");
  await completeWelcome(page);
  await page.goto("/trades");

  await page.getByRole("button", { name: "Guided sample" }).click();
  const preview = page.getByRole("status").filter({
    hasText: "Synthetic journal preview",
  });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(
    "Twelve fictional, mixed-outcome records",
  );
  await expect(preview).toContainText("do not affect XP or achievements");
  await expect(page.getByText("Net P&L").first()).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.reload();
  await expect(page.getByText("Synthetic journal preview")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Guided sample" }),
  ).toBeVisible();
});

declare global {
  interface Window {
    axe: typeof axeCore;
  }
}
