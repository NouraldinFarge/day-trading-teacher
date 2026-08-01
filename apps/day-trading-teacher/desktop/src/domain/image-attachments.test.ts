import { describe, expect, it } from "vitest";
import { screenshotFileIssue } from "./image-attachments";

describe("journal image attachments", () => {
  it("accepts the safe image formats used by the journal", () => {
    expect(
      screenshotFileIssue({
        name: "chart.png",
        size: 800_000,
        type: "image/png",
      }),
    ).toBeNull();
    expect(
      screenshotFileIssue({ name: "chart.webp", size: 800_000, type: "" }),
    ).toBeNull();
  });

  it("rejects active or oversized image formats before decoding", () => {
    expect(
      screenshotFileIssue({
        name: "chart.svg",
        size: 10_000,
        type: "image/svg+xml",
      }),
    ).toMatch(/not a supported/);
    expect(
      screenshotFileIssue({
        name: "chart.png",
        size: 5_000_001,
        type: "image/png",
      }),
    ).toMatch(/larger than 5 MB/);
  });
});
