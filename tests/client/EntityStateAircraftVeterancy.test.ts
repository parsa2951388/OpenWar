import { UnitType } from "@openfront/engine-api/game/GameTypes";
import type { UnitUpdate } from "@openfront/engine-api/game/GameUpdates";
import { describe, expect, test } from "vitest";
import {
  applyUnitUpdateInPlace,
  unitStateFromUpdate,
} from "../../src/client/view/EntityState";

function makeUpdate(overrides: Partial<UnitUpdate> = {}): UnitUpdate {
  return {
    type: 0 as UnitUpdate["type"],
    unitType: UnitType.AirFighter,
    troops: 0,
    id: 7,
    ownerID: 1,
    pos: 10 as UnitUpdate["pos"],
    lastPos: 10 as UnitUpdate["lastPos"],
    isActive: true,
    reachedTarget: false,
    targetable: true,
    markedForDeletion: false,
    missileTimerQueue: [],
    level: 1,
    hasTrainStation: false,
    fighterState: {
      state: "patrolling",
      fighterType: "AFighter" as never,
      patrolTile: 10 as never,
      fuel: 100,
      aam: 4,
      bomb: 0,
      ammo: 0,
      flares: 2,
      veterancy: 2,
      veterancyProgress: 45,
    },
    ...overrides,
  } as UnitUpdate;
}

describe("renderer aircraft veterancy", () => {
  test("initial renderer state exposes aircraft rank", () => {
    const state = unitStateFromUpdate(makeUpdate());
    expect(state.veterancy).toBe(2);
  });

  test("incremental unit updates refresh aircraft rank", () => {
    const state = unitStateFromUpdate(
      makeUpdate({
        fighterState: {
          ...makeUpdate().fighterState!,
          veterancy: 1,
          veterancyProgress: 119,
        },
      }),
    );
    applyUnitUpdateInPlace(
      state,
      makeUpdate({
        fighterState: {
          ...makeUpdate().fighterState!,
          veterancy: 3,
          veterancyProgress: 0,
        },
      }),
    );
    expect(state.veterancy).toBe(3);
  });

  test("warship rank remains preferred when no fighter state exists", () => {
    const state = unitStateFromUpdate(
      makeUpdate({
        fighterState: undefined,
        warshipState: {
          state: "patrolling",
          lastCombatTick: 0,
          veterancy: 2,
          veterancyProgress: 0,
        },
      }),
    );
    expect(state.veterancy).toBe(2);
  });

  test("ordinary units retain the zero-rank default", () => {
    const state = unitStateFromUpdate(
      makeUpdate({
        fighterState: undefined,
        warshipState: undefined,
      }),
    );
    expect(state.veterancy).toBe(0);
  });
});
