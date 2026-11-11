import { TileRef } from "@openfront/engine-api/game/GameMap";
import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { EventBus } from "@openfront/shared/EventBus";
import { Controller } from "../Controller";
import {
  CloseViewEvent,
  ContextMenuEvent,
  MouseUpEvent,
  TouchEvent,
  UnitSelectionEvent,
} from "../InputHandler";
import { MapRenderer } from "../render/gl";
import { TransformHandler } from "../TransformHandler";
import { MoveFighterIntentEvent } from "../Transport";
import { GameView, UnitView } from "../view";

const FIGHTER_SELECT_RADIUS = 3;
const FIGHTER_TYPES = [
  UnitType.StealthFighter,
  UnitType.GroundAttacker,
  UnitType.AirFighter,
] as const;

/**
 * Click-to-select and click-to-move air-unit controls.
 * Shift-click adds/removes aircraft; a normal second click issues a shared
 * patrol order to the current selection.
 */
export class FighterSelectionController implements Controller {
  private readonly selected = new Map<number, UnitView>();
  private readonly onMouseUpEvent = (event: MouseUpEvent) =>
    this.onMouseUp(event);
  private readonly onTouchEvent = (event: TouchEvent) => this.onTouch(event);
  private readonly onContextMenuEvent = () => this.clearSelection();
  private readonly onCloseViewEvent = () => this.clearSelection();
  private readonly onUnitSelectionEvent = (event: UnitSelectionEvent) => {
    // The warship controller owns the renderer selection after this event.
    if (event.isSelected) this.clearSelection(false);
  };

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
    private view: MapRenderer,
  ) {}

  init(): void {
    // Keep one subscription per event, even if the renderer is reinitialized.
    this.disposeSubscriptions();
    this.eventBus.on(MouseUpEvent, this.onMouseUpEvent);
    this.eventBus.on(TouchEvent, this.onTouchEvent);
    this.eventBus.on(ContextMenuEvent, this.onContextMenuEvent);
    this.eventBus.on(CloseViewEvent, this.onCloseViewEvent);
    this.eventBus.on(UnitSelectionEvent, this.onUnitSelectionEvent);
  }

  dispose(): void {
    this.disposeSubscriptions();
    this.selected.clear();
    this.view.setSelectedUnits([]);
  }

  private disposeSubscriptions(): void {
    this.eventBus.off(MouseUpEvent, this.onMouseUpEvent);
    this.eventBus.off(TouchEvent, this.onTouchEvent);
    this.eventBus.off(ContextMenuEvent, this.onContextMenuEvent);
    this.eventBus.off(CloseViewEvent, this.onCloseViewEvent);
    this.eventBus.off(UnitSelectionEvent, this.onUnitSelectionEvent);
  }

  tick(): void {
    const owner = this.game.myPlayer();
    let changed = false;
    for (const [id, unit] of this.selected) {
      if (
        !unit.isActive() ||
        owner === null ||
        owner === undefined ||
        unit.owner() !== owner
      ) {
        this.selected.delete(id);
        changed = true;
      }
    }
    if (changed) this.syncSelection();
  }

  private tileFromScreen(x: number, y: number): TileRef | undefined {
    const cell = this.transformHandler.screenToWorldCoordinates(x, y);
    if (!this.game.isValidCoord(cell.x, cell.y)) return undefined;
    return this.game.ref(cell.x, cell.y);
  }

  private closestFighter(tile: TileRef): UnitView | undefined {
    const owner = this.game.myPlayer();
    if (owner === null || owner === undefined) return undefined;

    // Query the unit spatial grid around the pointer instead of rebuilding and
    // sorting a list of every aircraft in the match on every click/tap.
    // UnitGrid predicates receive { unit, distSquared }, not UnitLike itself.
    // The grid already excludes inactive and under-construction units.
    const nearby = this.game.nearbyUnits(
      tile,
      FIGHTER_SELECT_RADIUS,
      FIGHTER_TYPES,
      ({ unit }) => unit.owner().id() === owner.id(),
    );

    let closest: UnitView | undefined;
    let closestDistance = FIGHTER_SELECT_RADIUS + 1;
    for (const { unit } of nearby) {
      const distance = this.game.manhattanDist(unit.tile(), tile);
      if (distance > FIGHTER_SELECT_RADIUS) continue;
      if (
        distance < closestDistance ||
        (distance === closestDistance &&
          (closest === undefined || unit.id() < closest.id()))
      ) {
        closest = unit;
        closestDistance = distance;
      }
    }
    return closest;
  }

  private onMouseUp(event: MouseUpEvent): void {
    if (event.handled) return;
    const tile = this.tileFromScreen(event.x, event.y);
    if (tile !== undefined) {
      event.handled = this.handleWorldClick(tile, event.shiftKey);
    }
  }

  private onTouch(event: TouchEvent): void {
    if (event.handled) return;
    const tile = this.tileFromScreen(event.x, event.y);
    if (tile !== undefined) event.handled = this.handleWorldClick(tile);
  }

  private handleWorldClick(tile: TileRef, additive = false): boolean {
    const clickedFighter = this.closestFighter(tile);
    if (clickedFighter !== undefined) {
      const isSelected = this.selected.has(clickedFighter.id());
      const directHit = clickedFighter.tile() === tile;

      if (additive) {
        this.select(clickedFighter, true);
        return true;
      }
      if (this.selected.size === 0) {
        this.select(clickedFighter);
        return true;
      }
      // Clicking a selected plane's sprite keeps the group selected. A click
      // near it (but not on its tile) is a destination, not another selection.
      if (directHit && isSelected) return true;
      if (directHit && !isSelected) {
        this.select(clickedFighter);
        return true;
      }
    }

    const selectedIds = [...this.selected.values()]
      .filter((unit) => unit.isActive())
      .map((unit) => unit.id());
    if (selectedIds.length === 0) {
      this.clearSelection();
      return false;
    }

    this.eventBus.emit(new MoveFighterIntentEvent(selectedIds, tile));
    this.clearSelection();
    return true;
  }

  private select(unit: UnitView, additive = false): void {
    // Clear any naval selection first. The fighter selection is then applied
    // last so the common WebGL selection marker displays the aircraft group.
    this.eventBus.emit(new UnitSelectionEvent(null, false));
    if (!additive) this.selected.clear();
    if (additive && this.selected.has(unit.id())) {
      this.selected.delete(unit.id());
    } else {
      this.selected.set(unit.id(), unit);
    }
    this.syncSelection();
  }

  private syncSelection(): void {
    this.view.setSelectedUnits([...this.selected.keys()]);
  }

  private clearSelection(updateRenderer = true): void {
    if (this.selected.size === 0) return;
    this.selected.clear();
    if (updateRenderer) this.view.setSelectedUnits([]);
  }
}
