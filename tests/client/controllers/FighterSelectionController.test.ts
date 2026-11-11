import { TileRef } from "@openfront/engine-api/game/GameMap";
import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { EventBus } from "@openfront/shared/EventBus";
import { describe, expect, it, vi } from "vitest";
import {
  FighterSelectionController,
} from "../../../src/client/controllers/FighterSelectionController";
import {
  MouseUpEvent,
  TouchEvent,
  UnitSelectionEvent,
} from "../../../src/client/InputHandler";
import { MapRenderer } from "../../../src/client/render/gl";
import { TransformHandler } from "../../../src/client/TransformHandler";
import { MoveFighterIntentEvent } from "../../../src/client/Transport";
import { GameView, UnitView } from "../../../src/client/view";

type FakeFighter = {
  id: number;
  tile: number;
  type: UnitType;
  active: boolean;
};

function makeHarness(fighters: FakeFighter[]) {
  const owner = { id: () => "local-player" };
  const unitView = (fighter: FakeFighter) =>
    ({
      id: () => fighter.id,
      tile: () => fighter.tile as TileRef,
      type: () => fighter.type,
      isActive: () => fighter.active,
      owner: () => owner,
    }) as unknown as UnitView;
  const nearbyUnits = vi.fn(
    (
      tile: number,
      radius: number,
      types: UnitType | readonly UnitType[],
      predicate?: (value: { unit: UnitView; distSquared: number }) => boolean,
    ) =>
      fighters
        .filter(
          (fighter) =>
            (Array.isArray(types)
              ? (types as readonly UnitType[]).includes(fighter.type)
              : fighter.type === types) &&
            Math.abs(fighter.tile - tile) <= radius &&
            fighter.active,
        )
        .map((fighter) => ({
          unit: unitView(fighter),
          distSquared: (fighter.tile - tile) ** 2,
        }))
        .filter((entry) => predicate?.(entry) ?? true),
  );
  const game = {
    myPlayer: () => owner,
    units: vi.fn(() => {
      throw new Error("fighter selection must use the spatial unit grid");
    }),
    nearbyUnits,
    manhattanDist: (a: number, b: number) => Math.abs(a - b),
    isValidCoord: () => true,
    ref: (x: number) => x as TileRef,
  } as unknown as GameView;
  const emitted: unknown[] = [];
  const listeners = new Map<unknown, Array<(event: any) => void>>();
  const eventBus = {
    on: (eventType: unknown, listener: (event: any) => void) => {
      const current = listeners.get(eventType) ?? [];
      current.push(listener);
      listeners.set(eventType, current);
    },
    off: (eventType: unknown, listener: (event: any) => void) => {
      const current = listeners.get(eventType) ?? [];
      const index = current.indexOf(listener);
      if (index >= 0) current.splice(index, 1);
    },
    emit: (event: any) => {
      emitted.push(event);
      for (const listener of listeners.get(event.constructor) ?? []) {
        listener(event);
      }
    },
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
    {
      screenToWorldCoordinates: (x: number, y: number) => ({ x, y }),
    } as unknown as TransformHandler,
    view,
  );
  controller.init();
  const setExternalSelection = (ids: number[]) => view.setSelectedUnits(ids);
  const emitSelection = (event: UnitSelectionEvent) => {
    (
      eventBus as unknown as {
        emit(event: UnitSelectionEvent): void;
      }
    ).emit(event);
  };
  const click = (tile: number, shiftKey = false) =>
    (
      controller as unknown as {
        handleWorldClick(tile: TileRef, additive?: boolean): void;
      }
    ).handleWorldClick(tile as TileRef, shiftKey);
  return {
    click,
    emitted,
    controller,
    emit: (event: any) => eventBus.emit(event),
    selected: () => selectedIds,
    setExternalSelection,
    emitSelection,
    nearbyUnits,
    game,
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
    expect(h.game.units).not.toHaveBeenCalled();
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

  it(
    "selects the nearest local aircraft from the spatial query, even in a large match",
    () => {
    const fighters: FakeFighter[] = Array.from(
      { length: 20_000 },
      (_, index) => ({
      id: index + 1,
      tile: 1000 + index * 10,
      type: UnitType.AirFighter,
        active: true,
      }),
    );
    fighters.push(
      { id: 30_002, tile: 502, type: UnitType.StealthFighter, active: true },
      { id: 30_001, tile: 501, type: UnitType.GroundAttacker, active: true },
    );
    const h = makeHarness(fighters);
    h.click(500);
    expect(h.selected()).toEqual([30_001]);
    expect(h.nearbyUnits).toHaveBeenCalledOnce();
    expect(h.nearbyUnits).toHaveBeenCalledWith(
      500,
      3,
      [UnitType.StealthFighter, UnitType.GroundAttacker, UnitType.AirFighter],
      expect.any(Function),
    );
    expect(h.game.units).not.toHaveBeenCalled();
  });

  it(
    "claims aircraft clicks and unregisters input listeners on dispose",
    () => {
    const h = makeHarness([
      { id: 1, tile: 10, type: UnitType.AirFighter, active: true },
    ]);
    const mouse = new MouseUpEvent(10, 0);
    h.emit(mouse);
    expect(mouse.handled).toBe(true);
    expect(h.selected()).toEqual([1]);
    const touch = new TouchEvent(10, 0);
    h.emit(touch);
    expect(touch.handled).toBe(true);
    h.controller.dispose();
    expect(h.selected()).toEqual([]);
    const afterDispose = new MouseUpEvent(80, 0);
    h.emit(afterDispose);
    expect(afterDispose.handled).toBe(false);
    expect(h.selected()).toEqual([]);
  });

  it("keeps another unit selection after aircraft deselection", () => {
    const h = makeHarness([
      { id: 1, tile: 10, type: UnitType.AirFighter, active: true },
    ]);
    h.click(10);
    expect(h.selected()).toEqual([1]);
    const renderer = h as unknown as {
      setExternalSelection(ids: number[]): void;
      emitSelection(event: UnitSelectionEvent): void;
    };
    renderer.setExternalSelection([77]);
    renderer.emitSelection(
      new UnitSelectionEvent(null, true, [
        { id: () => 77 } as unknown as UnitView,
      ]),
    );
    expect(h.selected()).toEqual([77]);
  });
});
