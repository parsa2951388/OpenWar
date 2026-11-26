import { PlayerType, TerrainType } from "@openfront/engine-api/game/GameTypes";
import { GameConfig } from "@openfront/engine-api/Schemas";
import {
  AttackLogicInput,
  EngineConfig,
} from "@openfront/engine/configuration/EngineConfig";

const baseInput: AttackLogicInput = {
  terrain: TerrainType.Mountain,
  terrainMagnitude: 20,
  attackTroops: 100_000,
  attacker: { type: PlayerType.Human, numTiles: 20_000 },
  defender: {
    type: PlayerType.Human,
    numTiles: 15_000,
    troops: 90_000,
    isTraitor: false,
    isDisconnectedTeammate: false,
  },
  defenderHasDefensePost: false,
  falloutRatio: null,
  borderSize: 100,
};

function config(advancedWarfare: boolean): EngineConfig {
  return new EngineConfig({ advancedWarfare } as GameConfig, false);
}

describe("Advanced Warfare high-ground combat", () => {
  test("leaves legacy matches unchanged even when elevation is present", () => {
    const legacy = config(false);
    const low = legacy.attackLogic({
      ...baseInput,
      terrainMagnitude: 20,
    });
    const high = legacy.attackLogic({
      ...baseInput,
      terrainMagnitude: 30,
    });

    expect(high).toEqual(low);
  });

  test("increases attacker losses and conquest time on higher ground", () => {
    const advanced = config(true);
    const low = advanced.attackLogic({
      ...baseInput,
      terrainMagnitude: 20,
    });
    const high = advanced.attackLogic({
      ...baseInput,
      terrainMagnitude: 30,
    });

    expect(high.attackerTroopLoss).toBeCloseTo(low.attackerTroopLoss * 1.08);
    expect(high.tickFraction).toBeCloseTo(low.tickFraction * 1.08);
    expect(high.defenderTroopLoss).toBe(low.defenderTroopLoss);
  });

  test("clamps malformed elevation to the supported map range", () => {
    const advanced = config(true);
    const max = advanced.attackLogic({
      ...baseInput,
      terrainMagnitude: 30,
    });
    const aboveMax = advanced.attackLogic({
      ...baseInput,
      terrainMagnitude: 999,
    });

    expect(aboveMax).toEqual(max);
  });

  test("applies the terrain modifier to unclaimed land as well", () => {
    const advanced = config(true);
    const low = advanced.attackLogic({
      ...baseInput,
      defender: null,
      terrainMagnitude: 20,
    });
    const high = advanced.attackLogic({
      ...baseInput,
      defender: null,
      terrainMagnitude: 30,
    });

    expect(high.attackerTroopLoss).toBeCloseTo(low.attackerTroopLoss * 1.08);
    expect(high.tickFraction).toBeCloseTo(low.tickFraction * 1.08);
  });
});
