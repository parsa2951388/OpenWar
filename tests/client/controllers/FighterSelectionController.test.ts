import { TileRef } from "@openfront/engine-api/game/GameMap";
import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { EventBus } from "@openfront/shared/EventBus";
import { describe, expect, it } from "vitest";
import { FighterSelectionController } from "../../../src/client/controllers/FighterSelectionController";
import { MoveFighterIntentEvent } from "../../../src/client/Transport";
import { MapRenderer } from "../../../src/client/render/gl";
import { TransformHandler } from "../../../src/client/TransformHandler";
import { GameView, UnitView } from "../../../src/client/view";

type FakeFighter = {
  id: number;
  tile: number;
  type: UnitType;
  active: boolean;
};

function makeHarness(fighters: FakeFighter[]) {
  const owner = {};
  const units = (type: UnitType) =>
    fighters
      .filter((fighter) => fighter.type === type)
      .map((fighter) => ({
        id: () => fighter.id,
        tile: () => fighter.tile as TileRef,
        type: () => fighter.type,
        isActive: () => fighter.active,
        owner: () => owner,
      }) as unknown as UnitView);

  const game = {
    myPlayer: () => owner,
    units,
    manhattanDist: (a: number, b: number) => Math.abs(a - b),
  } as unknown as GameView;
  const emitted: unknown[] = [];
  const eventBus = {
    emit: (event: unknown) => emitted.push(event),
  } as unknown as EventBus;
  let selectedIds: readonly number[] = [];
  const view = {
    setSelectedUnits: (ids: readonly number[]) => {
      selectedIds = [...ids];
    },
  } as unknown as MapRenderer;
  const controller = new FighterSelectionController(
    game,
    eventBus,
    {} as TransformHandler,
    view,
  );
  const click = (tile: number, shiftKey = false) =>
    (
      controller as unknown as {
        handleWorldClick(tile: TileRef, additive?: boolean): void;
      }
    ).handleWorldClick(tile as TileRef, shiftKey);

  return {
    click,
    emitted,
    selected: () => selectedIds,
    fighters,
  };
}

describe("FighterSelectionController", () => {
  it("selects fighters and supports additive Shift-click selection", () => {
    const h = makeHarness([
      { id: 1, tile: 10, type: UnitType.AirFighter, active: true },
      { id: 2, tile: 30, type: UnitType.StealthFighter, active: true },
    ]);

    h.click(10);
    expect(h.selected()).toEqual([1]);

    h.click(30, true);
    expect(h.selected()).toEqual([1, 2]);

    h.click(30, true);
    expect(h.selected()).toEqual([1]);
  });

  it("sends one move intent for every selected active aircraft", () => {
    const h = makeHarness([
      { id: 1, tile: 10, type: UnitType.AirFighter, active: true },
      { id: 2, tile: 30, type: UnitType.GroundAttacker, active: true },
    ]);

    h.click(10);
    h.click(30, true);
    h.click(80);

    const move = h.emitted.find(
      (event) => event instanceof MoveFighterIntentEvent,
    ) as MoveFighterIntentEvent | undefined;

    expect(move?.unitIds).toEqual([1, 2]);
    expect(move?.tile).toBe(80);
    expect(h.selected()).toEqual([]);
  });

  it("does not mistake a nearby destination for the selected aircraft", () => {
    const h = makeHarness([
      { id: 1, tile: 10, type: UnitType.GroundAttacker, active: true },
    ]);

    h.click(10);
    h.click(12);

    const move = h.emitted.find(
      (event) => event instanceof MoveFighterIntentEvent,
    ) as MoveFighterIntentEvent | undefined;

    expect(move?.unitIds).toEqual([1]);
    expect(move?.tile).toBe(12);
  });

  it("does not select an aircraft outside the short click radius", () => {
    const h = makeHarness([
      { id: 1, tile: 10, type: UnitType.StealthFighter, active: true },
    ]);

    h.click(14);
    expect(h.selected()).toEqual([]);
  });
});
