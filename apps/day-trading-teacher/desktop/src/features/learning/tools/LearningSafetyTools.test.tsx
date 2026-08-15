import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContextReadingLab } from "./ContextReadingLab";
import { ResetDrill } from "./ResetDrill";
import { SetupPlaybookLab } from "./SetupPlaybookLab";

describe("learning safety tools", () => {
  it("grades the context workflow before allowing an outcome reveal", () => {
    const practiced = vi.fn();
    render(<ContextReadingLab onPractice={practiced} />);

    expect(
      screen.queryByRole("button", { name: /Hide later bars/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Wait for evidence/i }));
    expect(screen.getByText("Process aligned")).toBeInTheDocument();
    expect(practiced).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Reveal later bars/i }));
    expect(
      screen.getByRole("button", { name: /Hide later bars/i }),
    ).toBeInTheDocument();
  });

  it("saves a field-complete playbook as practice-only local evidence", () => {
    const saved = vi.fn();
    const practiced = vi.fn();
    render(
      <SetupPlaybookLab
        playbooks={[]}
        onSave={saved}
        onRemove={vi.fn()}
        onPractice={practiced}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Load field guide/i }));
    expect(screen.getByText("100%")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Lifecycle"), {
      target: { value: "practice_only" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save playbook/i }));

    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "practice_only",
        title: "Orderly pullback study",
      }),
    );
    expect(practiced).toHaveBeenCalledTimes(1);
  });

  it("offers review-only when an escalation signal is present", () => {
    const reviewOnly = vi.fn();
    render(
      <ResetDrill
        canMoveSessionToReview
        onMoveSessionToReview={reviewOnly}
        onPractice={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Observable facts"), {
      target: { value: "The locked plan remains visible." },
    });
    fireEvent.change(screen.getByLabelText("The story or urge"), {
      target: { value: "I need to recover the prior outcome." },
    });
    fireEvent.click(
      screen.getByLabelText("Need to recover or protect the last outcome"),
    );
    fireEvent.click(screen.getByRole("button", { name: /Run the reset/i }));

    expect(
      screen.getByText("Move the session to review-only"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: /End paper decisions and review/i,
      }),
    );
    expect(reviewOnly).toHaveBeenCalledTimes(1);
  });
});
