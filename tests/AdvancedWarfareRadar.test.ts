import { describe, expect, it } from "vitest";
import { canDetectStealthAircraft } from "../packages/engine/src/aircombat/AircraftRules";

describe("Advanced Warfare stealth radar", () => {
  it("preserves legacy stealth target visibility when Advanced Warfare is off", () => {
    expect(canDetectStealthAircraft(false, false)).toBe(true);
    expect(canDetectStealthAircraft(false, true)).toBe(true);
  });

  it("requires friendly radar coverage in Advanced Warfare", () => {
    expect(canDetectStealthAircraft(true, false)).toBe(false);
    expect(canDetectStealthAircraft(true, true)).toBe(true);
  });
});
