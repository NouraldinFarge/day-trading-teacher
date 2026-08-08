import { describe, expect, it } from "vitest";
import { defaultState } from "./AppStateContext";
import {
  findSensitiveStateFields,
  serializeStateExport,
} from "./state-data-security";

describe("app-state credential separation", () => {
  it("finds credential-shaped fields nested in forward-compatible state", () => {
    const state = structuredClone(defaultState) as unknown as Record<
      string,
      unknown
    >;
    state.futureProvider = { polygonApiKey: "must-not-leave-device" };
    expect(findSensitiveStateFields(state)).toEqual([
      "state.futureProvider.polygonApiKey",
    ]);
  });

  it("defensively omits credential-shaped fields from exports", () => {
    const state = structuredClone(defaultState) as unknown as Record<
      string,
      unknown
    >;
    state.futureProvider = {
      api_secret: "hidden",
      harmlessPreference: "preserved",
    };
    const exported = serializeStateExport(
      state as typeof defaultState,
      new Date("2026-08-08T12:00:00.000Z"),
    );
    expect(exported).not.toContain("hidden");
    expect(exported).not.toContain("api_secret");
    expect(exported).toContain("harmlessPreference");
    expect(exported).toContain("2026-08-08T12:00:00.000Z");
  });
});
