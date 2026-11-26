import {
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { Game, Player, Unit } from "@openfront/engine/game/Game";
import { UnitSnapshot } from "@openfront/engine/game/UnitImpl";
import { beforeEach, describe, expect, test } from "vitest";
import { setup } from "./util/Setup";

let game: Game;
let attacker: Player;
let defender: Player;

function conquerRect(
  game: Game,
  player: Player,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  for (let x = x0; x < x1; x++) {
    for (let y = y0; y < y1; y++) {
      const tile = game.ref(x, y);
      if (game.isLand(tile)) player.conquer(tile);
    }
  }
}

describe("aircraft veterancy", () => {
  beforeEach(async () => {
    game = await setup("plains", { infiniteGold: true, instantBuild: true }, [
      new PlayerInfo("attacker", PlayerType.Human, null, "attacker"),
      new PlayerInfo("defender", PlayerType.Human, null, "defender"),
    ]);
    attacker = game.player("attacker");
    defender = game.player("defender");
    conquerRect(game, attacker, 5, 5, 35, 35);
    conquerRect(game, defender, 65, 65, 95, 95);
  });

  function buildFighter(player: Player, x = 20, y = 20): Unit {
    player.buildUnit(UnitType.Airport, game.ref(x - 5, y - 5), {});
    return player.buildUnit(UnitType.AirFighter, game.ref(x, y), {
      patrolTile: game.ref(x + 1, y),
    });
  }

  test("fighters start with no veterancy and zero progress", () => {
    const fighter = buildFighter(attacker);
    expect(fighter.veterancy()).toBe(0);
    expect(fighter.fighterState()).toMatchObject({
      veterancy: 0,
      veterancyProgress: 0,
    });
  });

  test(
    "experience carries over rank-ups and stops at the configured cap",
    () => {
      const fighter = buildFighter(attacker);
      const perRank = game.config().fighterVeterancyExperiencePerLevel();
      const maxRank = game.config().fighterMaxVeterancy();

      fighter.recordFighterCombatExperience(perRank - 1);
      expect(fighter.veterancy()).toBe(0);
      expect(fighter.fighterState().veterancyProgress).toBe(perRank - 1);

      fighter.recordFighterCombatExperience(2);
      expect(fighter.veterancy()).toBe(1);
      expect(fighter.fighterState().veterancyProgress).toBe(1);

      fighter.recordFighterCombatExperience(perRank * maxRank * 2);
      expect(fighter.veterancy()).toBe(maxRank);
      expect(fighter.fighterState().veterancyProgress).toBe(0);

      fighter.recordFighterCombatExperience(perRank);
      expect(fighter.veterancy()).toBe(maxRank);
      expect(fighter.fighterState().veterancyProgress).toBe(0);
    },
  );

  test("rejects zero, negative, fractional and non-finite experience", () => {
    const fighter = buildFighter(attacker);
    for (const points of [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      fighter.recordFighterCombatExperience(points);
    }
    expect(fighter.veterancy()).toBe(0);
    expect(fighter.fighterState().veterancyProgress).toBe(0);
  });

  test(
    "rank increases health capacity without instantly healing the aircraft",
    () => {
      const fighter = buildFighter(attacker);
      const baseMaxHealth = game
        .config()
        .unitInfo(UnitType.AirFighter).maxHealth!;
      const bonusPercent = game.config().fighterVeterancyHealthBonus();

      fighter.modifyHealth(-10);
      const currentHealth = fighter.health();
      fighter.recordFighterCombatExperience(
        game.config().fighterVeterancyExperiencePerLevel(),
      );

      expect(fighter.veterancy()).toBe(1);
      expect(fighter.maxHealth()).toBe(
        baseMaxHealth + Math.floor((baseMaxHealth * bonusPercent) / 100),
      );
      expect(fighter.health()).toBe(currentHealth);
    },
  );

  test("rank damage scaling is deterministic and capped", () => {
    const config = game.config();
    expect(config.fighterDamageWithVeterancy(100, 0)).toBe(100);
    expect(config.fighterDamageWithVeterancy(100, 1)).toBe(105);
    expect(config.fighterDamageWithVeterancy(100, 3)).toBe(115);
    expect(config.fighterDamageWithVeterancy(100, 99)).toBe(115);
  });

  test("legacy unit snapshots migrate fighters with no career progress", () => {
    const migrate = UnitSnapshot.migrations[1]!;
    const oldFighterState = {
      state: "patrolling",
      fighterType: "AFighter",
      patrolTile: 12,
      fuel: 100,
      aam: 2,
      bomb: 0,
      ammo: 0,
      flares: 4,
    };

    const migrated = migrate({
      fighterState: oldFighterState,
    }) as { fighterState: Record<string, unknown> };

    expect(UnitSnapshot.version).toBe(2);
    expect(migrated.fighterState).toMatchObject({
      veterancy: 0,
      veterancyProgress: 0,
    });
    expect(migrated.fighterState.fuel).toBe(100);
  });

  test("legacy snapshots without a fighter state remain without one", () => {
    const migrated = UnitSnapshot.migrations[1]!({
      fighterState: null,
    }) as { fighterState: unknown };
    expect(migrated.fighterState).toBeNull();
  });
});
