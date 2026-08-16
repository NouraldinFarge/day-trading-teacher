import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";
import { Modal } from "./Modal";
import { PageHeader } from "./PageHeader";

describe("foundational accessibility", () => {
  it("keeps page headings and empty states free of automated violations", async () => {
    const { container } = render(
      <main>
        <PageHeader
          eyebrow="Journal"
          title="Review your process"
          description="Use evidence without judging the decision by profit alone."
        />
        <section>
          <h2>Reflection queue</h2>
          <EmptyState
            icon={<span aria-hidden="true">○</span>}
            title="No reflections yet"
            body="Import a synthetic example or complete a reflection."
            action={<button type="button">Open guidance</button>}
          />
        </section>
      </main>,
    );
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it("keeps required dialogs labeled and operable", async () => {
    const { container } = render(
      <Modal
        title="Welcome"
        description="Step 1 of 3"
        dismissible={false}
        onClose={() => undefined}
      >
        <label htmlFor="learner-name">Name</label>
        <input id="learner-name" />
        <button type="button">Continue</button>
      </Modal>,
    );
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
