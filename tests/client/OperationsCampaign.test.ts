import { describe, expect, it } from "vitest";
import {
  consumePendingOperationsMission,
  getOperationsCampaignSummary,
  getOperationsMissionProgress,
  isOperationsMissionUnlocked,
  markPendingOperationsMission,
  OPERATIONS_CAMPAIGN_STORAGE_KEY,
  OPERATIONS_PENDING_MISSION_KEY,
  readOperationsCampaignProgress,
  recordOperationsMissionResult,
  type OperationsStorage,
} from "../../src/client/components/OperationsCampaign";
import { getOperationsMission } from "../../src/client/components/OperationsMissions";
class MemoryStorage implements OperationsStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}
describe("Operations campaign progression", () => {
  it("records victories, awards stars and unlocks the next mission", () => {
    const storage = new MemoryStorage(),
      next = getOperationsMission("sandstorm")!;
    expect(
      isOperationsMissionUnlocked(
        next,
        readOperationsCampaignProgress(storage),
      ),
    ).toBe(false);
    expect(
      recordOperationsMissionResult("iron-gate", true, 180, storage, 10_000),
    ).toBe(3);
    const progress = readOperationsCampaignProgress(storage);
    expect(getOperationsMissionProgress("iron-gate", progress)).toMatchObject({
      attempts: 1,
      wins: 1,
      bestStars: 3,
      bestTimeSeconds: 180,
      lastPlayedAt: 10_000,
    });
    expect(isOperationsMissionUnlocked(next, progress)).toBe(true);
    expect(getOperationsCampaignSummary(progress)).toMatchObject({
      wins: 1,
      stars: 3,
      clearedMissions: 1,
      totalMissions: 8,
    });
    expect(storage.getItem(OPERATIONS_CAMPAIGN_STORAGE_KEY)).not.toBeNull();
  });
  it("records losses without awarding stars and preserves the best result", () => {
    const storage = new MemoryStorage();
    recordOperationsMissionResult("iron-gate", true, 180, storage, 10_000);
    expect(
      recordOperationsMissionResult("iron-gate", false, 300, storage, 20_000),
    ).toBe(0);
    expect(
      getOperationsMissionProgress(
        "iron-gate",
        readOperationsCampaignProgress(storage),
      ),
    ).toMatchObject({
      attempts: 2,
      wins: 1,
      bestStars: 3,
      bestTimeSeconds: 180,
      lastPlayedAt: 20_000,
    });
  });
  it("consumes pending markers only for matching launched solo scenarios", () => {
    const storage = new MemoryStorage(),
      mission = getOperationsMission("iron-gate")!;
    markPendingOperationsMission(mission.id, storage, 1_000);
    const config = {
      gameType: "Singleplayer",
      gameMap: mission.map,
      difficulty: mission.difficulty,
      gameMode: mission.gameMode,
      playerTeams: mission.teamCount,
      maxTimerValue: mission.timeLimitMinutes,
      winThresholdTenths: mission.winThresholdTenths,
      bots: mission.bots,
    };
    expect(consumePendingOperationsMission(config, storage, 1_001)).toBe(
      mission.id,
    );
    expect(storage.getItem(OPERATIONS_PENDING_MISSION_KEY)).toBeNull();
  });
  it("rejects mismatched or expired pending markers", () => {
    const storage = new MemoryStorage();
    markPendingOperationsMission("iron-gate", storage, 1_000);
    expect(
      consumePendingOperationsMission(
        { gameType: "Singleplayer" },
        storage,
        2_000,
      ),
    ).toBeNull();
    markPendingOperationsMission("iron-gate", storage, 1_000);
    expect(
      consumePendingOperationsMission(
        { gameType: "Singleplayer" },
        storage,
        10_000_000,
      ),
    ).toBeNull();
  });
});
