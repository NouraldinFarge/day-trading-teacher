import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("closes with Escape and restores focus", () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(
      <Modal title="Review" onClose={onClose}>
        <button>Continue</button>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("cannot dismiss a required flow", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Welcome" onClose={onClose} dismissible={false}>
        <button>Continue</button>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("keeps focus in the active field when the parent rerenders", () => {
    const { rerender } = render(
      <Modal title="Edit reflection" onClose={() => undefined}>
        <label htmlFor="reason">Reason</label>
        <input id="reason" />
      </Modal>,
    );
    const field = screen.getByRole("textbox", { name: "Reason" });
    field.focus();
    rerender(
      <Modal title="Edit reflection" onClose={() => undefined}>
        <label htmlFor="reason">Reason</label>
        <input id="reason" />
      </Modal>,
    );
    expect(field).toHaveFocus();
  });
});
