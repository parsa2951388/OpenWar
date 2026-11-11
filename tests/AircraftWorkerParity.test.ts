import { describe, expect, it, vi } from "vitest";
import {
  FighterType,
  UnitType,
  MessageType,
} from "../packages/engine-api/src/game/GameTypes";
import { EngineConfig } from "../packages/engine/src/configuration/EngineConfig";
import { FighterBombExecution } from "../packages/engine/src/execution/FighterBombExecution";
import type { Game, Player, Unit } from "../packages/engine/src/game/Game";
import { GameImpl } from "../packages/engine/src/game/GameImpl";

describe("uploaded Worker aircraft parity", () => {
  it("uses the Worker commercial aircraft saturation and rejection curve", () => {
    const config = Object.create(EngineConfig.prototype) as EngineConfig;

    expect(config.commercialAircraftSpawnRate(0, 0)).toBe(100);
    expect(config.commercialAircraftSpawnRate(1, 0)).toBe(50);
    expect(config.commercialAircraftSpawnRate(0, 400)).toBe(200);
    expect(config.commercialAircraftSpawnRate(1, 400)).toBe(100);
  });

  it("keeps fighter fuel, weapons, speed and service values aligned with the reference Worker", () => {
    const config = Object.create(EngineConfig.prototype) as EngineConfig;

    expect(
      [FighterType.Stealth, FighterType.Ground, FighterType.Air].map((type) =>
        config.fighterMaxFuel(type),
      ),
    ).toEqual([1200, 800, 1000]);
    expect(
      [FighterType.Stealth, FighterType.Ground, FighterType.Air].map((type) =>
        config.fighterMaxAam(type),
      ),
    ).toEqual([2, 0, 4]);
    expect(
      [FighterType.Stealth, FighterType.Ground, FighterType.Air].map((type) =>
        config.fighterMaxBomb(type),
      ),
    ).toEqual([1, 5, 0]);
    expect(
      [FighterType.Stealth, FighterType.Ground, FighterType.Air].map((type) =>
        config.fighterMaxGunAmmo(type),
      ),
    ).toEqual([0, 1000, 0]);
    expect(
      [FighterType.Stealth, FighterType.Ground, FighterType.Air].map((type) =>
        config.fighterMaxFlares(type),
      ),
    ).toEqual([3, 2, 4]);
    expect(
      [FighterType.Stealth, FighterType.Ground, FighterType.Air].map((type) =>
        config.fighterSpeed(type),
      ),
    ).toEqual([1.5, 1, 1.875]);
  });

  it("reserves each air-to-air target only once and releases it on completion", () => {
    const game = Object.create(GameImpl.prototype) as GameImpl;
    (
      game as unknown as {
        fighterAamTargetsInFlight: Map<number, Set<number>>;
      }
    ).fighterAamTargetsInFlight = new Map();

    expect(game.reserveFighterAamTarget(10, 20)).toBe(true);
    expect(game.reserveFighterAamTarget(10, 20)).toBe(false);
    expect(game.reserveFighterAamTarget(10, 21)).toBe(true);

    game.clearFighterAamTarget(10, 20);
    expect(game.reserveFighterAamTarget(10, 20)).toBe(true);
    game.clearFighterAamTarget(10, 20);
    game.clearFighterAamTarget(10, 21);
  });

  it("warns the defender, applies one area blast and deactivates on the following tick", () => {
    const defender = {
      isPlayer: () => true,
      id: () => "defender",
    } as unknown as Player;
    const victim = {
      isActive: () => true,
      delete: vi.fn(),
    } as unknown as Unit;
    const structure = {
      isActive: () => true,
      touch: vi.fn(),
    } as unknown as Unit;

    const nearbyUnits = vi.fn(
      (
        _tile: number,
        _range: number,
        types: UnitType | readonly UnitType[],
      ) => {
        if (Array.isArray(types)) return [{ unit: victim, distSquared: 0 }];
        if (types === UnitType.City)
          return [{ unit: structure, distSquared: 0 }];
        return [];
      },
    );
    const mg = {
      owner: vi.fn(() => defender),
      displayMessage: vi.fn(),
      nearbyUnits,
    } as unknown as Game;

    const bomb = new FighterBombExecution({} as Player, 7 as never, 3, true);
    bomb.init(mg);
    bomb.tick();

    expect(mg.displayMessage).toHaveBeenCalledWith(
      "events_display.bomb_dropped",
      MessageType.BOMB_DROPPED,
      defender.id(),
    );
    expect(victim.delete).toHaveBeenCalledOnce();
    expect(structure.touch).toHaveBeenCalledOnce();
    expect(bomb.isActive()).toBe(true);

    bomb.tick();
    expect(bomb.isActive()).toBe(false);
  });
});
