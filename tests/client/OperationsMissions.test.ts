import { describe, expect, it } from "vitest";
import {
  getOperationsMission,
  isValidOperationsMissionPreset,
  OPERATIONS_MISSIONS,
} from "../../src/client/components/OperationsMissions";

describe("Operations mission presets", () => {
  it("ships unique mission ids and valid deterministic game settings", () => {
    const ids = OPERATIONS_MISSIONS.map((mission) => mission.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(OPERATIONS_MISSIONS).toHaveLength(8);
    for (const mission of OPERATIONS_MISSIONS) {
      expect(isValidOperationsMissionPreset(mission)).toBe(true);
    }
  });

  it("uses localized translation keys for every mission", () => {
    expect(
      OPERATIONS_MISSIONS.map((mission) => mission.translationKey),
    ).toEqual([
      "iron_gate",
      "tidebreaker",
      "world_command",
      "sandstorm",
      "northern_bastion",
      "pacific_ascendant",
      "straitbreaker",
      "southern_cross",
    ]);
  });

  it("resolves each mission id and rejects unknown ids", () => {
    for (const mission of OPERATIONS_MISSIONS) {
      expect(getOperationsMission(mission.id)).toEqual(mission);
    }
    expect(getOperationsMission("not-a-mission")).toBeUndefined();
  });

  it("keeps every mission threshold inside the engine's supported range", () => {
    for (const mission of OPERATIONS_MISSIONS) {
      expect(mission.timeLimitMinutes).toBeGreaterThanOrEqual(1);
      expect(mission.timeLimitMinutes).toBeLessThanOrEqual(120);
      expect(mission.winThresholdTenths).toBeGreaterThanOrEqual(100);
      expect(mission.winThresholdTenths).toBeLessThanOrEqual(999);
      expect(mission.bots).toBeGreaterThanOrEqual(0);
      expect(mission.bots).toBeLessThanOrEqual(400);
      expect(mission.unlockWins).toBeGreaterThanOrEqual(0);
      expect(mission.unlockWins).toBeLessThanOrEqual(20);
    }
  });
});
