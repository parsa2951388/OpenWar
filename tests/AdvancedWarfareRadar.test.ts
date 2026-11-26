import { describe, expect, it } from "vitest";
import {
  canDetectStealthAircraft,
  isWithinRadarRange,
} from "../packages/engine/src/aircombat/AircraftRules";

describe("Advanced Warfare stealth radar", () => {
  it("preserves legacy stealth target visibility when Advanced Warfare is off", () => {
    expect(canDetectStealthAircraft(false, false)).toBe(true);
    expect(canDetectStealthAircraft(false, true)).toBe(true);
  });

  it("requires friendly radar coverage in Advanced Warfare", () => {
    expect(canDetectStealthAircraft(true, false)).toBe(false);
    expect(canDetectStealthAircraft(true, true)).toBe(true);
  });

  it("uses inclusive range boundaries for SAM and dedicated radar coverage", () => {
    expect(isWithinRadarRange(36 ** 2, 36)).toBe(true);
    expect(isWithinRadarRange(36.01 ** 2, 36)).toBe(false);
    expect(isWithinRadarRange(56 ** 2, 56)).toBe(true);
    expect(isWithinRadarRange(56.01 ** 2, 56)).toBe(false);
  });

  it("rejects invalid radar distances and ranges", () => {
    expect(() => isWithinRadarRange(-1, 36)).toThrow(RangeError);
    expect(() => isWithinRadarRange(1, Number.NaN)).toThrow(RangeError);
  });
});
