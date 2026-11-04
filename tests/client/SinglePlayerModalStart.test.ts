import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/client/Cosmetics", () => ({
  getPlayerCosmetics: vi.fn(async () => ({})),
}));

vi.mock("../../src/client/CrazyGamesSDK", () => ({
  crazyGamesSDK: {
    isOnCrazyGames: vi.fn(() => false),
    requestMidgameAd: vi.fn(async () => {}),
  },
}));

vi.mock("../../src/client/TerrainMapFileLoader", () => ({
  terrainMapFileLoader: { getMapData: vi.fn() },
}));

// Side-effect import so the custom element registers (a type-only import
// would be elided and createElement would return an inert element).
import "../../src/client/SinglePlayerModal";

function createModal(): any {
  return document.createElement("single-player-modal") as any;
}

describe("SinglePlayerModal start", () => {
  it(
    "starts an Operations mission with its map, timer, difficulty and territory threshold",
    async () => {
      const modal = createModal();
      const events: any[] = [];
      modal.addEventListener("join-lobby", (e: Event) =>
        events.push((e as CustomEvent).detail),
      );

      const { getOperationsMission } = await import(
        "../../src/client/components/OperationsMissions"
      );
      const mission = getOperationsMission("iron-gate");
      if (!mission) throw new Error("Iron Gate mission preset is missing");
      modal.openForOperation(mission);

      await modal.startGame();

      expect(events).toHaveLength(1);
      const config = events[0].gameStartInfo.config;
      expect(config.gameMap).toBe(mission.map);
      expect(config.difficulty).toBe(mission.difficulty);
      expect(config.maxTimerValue).toBe(mission.timeLimitMinutes);
      expect(config.winThresholdTenths).toBe(mission.winThresholdTenths);
      expect(config.disabledUnits).toContain(UnitType.AtomBomb);
      expect(config.disabledUnits).toContain(UnitType.MissileSilo);
    },
  );

  it(
    "carries the selected team count and validated disabled units into the join-lobby config",
    async () => {
      const modal = createModal();
      const events: any[] = [];
      modal.addEventListener("join-lobby", (e: Event) =>
        events.push((e as CustomEvent).detail),
      );

      // Selection arrives via the game-config-settings child event.
      modal.handleConfigTeamCountSelected(
        new CustomEvent("team-count-selected", { detail: { count: 4 } }),
      );
      // One real unit and one junk entry: the start path must keep only
      // values that are actual UnitTypes.
      modal.disabledUnits = [UnitType.Warship, "Bogus"];

      await modal.startGame();

      expect(events).toHaveLength(1);
      expect(events[0].source).toBe("singleplayer");
      const config = events[0].gameStartInfo.config;
      expect(config.playerTeams).toBe(4);
      expect(config.disabledUnits).toEqual([UnitType.Warship]);
    },
  );
});
