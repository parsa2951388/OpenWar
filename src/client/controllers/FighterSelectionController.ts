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

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
    private view: MapRenderer,
  ) {}

  init(): void {
    this.eventBus.on(MouseUpEvent, (event) => this.onMouseUp(event));
    this.eventBus.on(TouchEvent, (event) => this.onTouch(event));
    this.eventBus.on(ContextMenuEvent, () => this.clearSelection());
    this.eventBus.on(CloseViewEvent, () => this.clearSelection());
    this.eventBus.on(UnitSelectionEvent, (event) => {
      // The warship controller owns the renderer selection after this event.
      if (event.isSelected) this.clearSelection(false);
    });
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

  private localFighters(): UnitView[] {
    const owner = this.game.myPlayer();
    if (owner === null || owner === undefined) return [];
    return FIGHTER_TYPES.flatMap((type) => this.game.units(type)).filter(
      (unit) => unit.isActive() && unit.owner() === owner,
    );
  }

  private tileFromScreen(x: number, y: number): TileRef | undefined {
    const cell = this.transformHandler.screenToWorldCoordinates(x, y);
    if (!this.game.isValidCoord(cell.x, cell.y)) return undefined;
    return this.game.ref(cell.x, cell.y);
  }

  private closestFighter(tile: TileRef): UnitView | undefined {
    return this.localFighters()
      .filter(
        (unit) =>
          this.game.manhattanDist(unit.tile(), tile) <= FIGHTER_SELECT_RADIUS,
      )
      .sort(
        (a, b) =>
          this.game.manhattanDist(a.tile(), tile) -
          this.game.manhattanDist(b.tile(), tile),
      )[0];
  }

  private onMouseUp(event: MouseUpEvent): void {
    const tile = this.tileFromScreen(event.x, event.y);
    if (tile !== undefined) this.handleWorldClick(tile, event.shiftKey);
  }

  private onTouch(event: TouchEvent): void {
    const tile = this.tileFromScreen(event.x, event.y);
    if (tile !== undefined) this.handleWorldClick(tile);
  }

  private handleWorldClick(tile: TileRef, additive = false): void {
    const clickedFighter = this.closestFighter(tile);
    if (clickedFighter !== undefined) {
      const isSelected = this.selected.has(clickedFighter.id());
      const directHit = clickedFighter.tile() === tile;

      if (additive) {
        this.select(clickedFighter, true);
        return;
      }
      if (this.selected.size === 0) {
        this.select(clickedFighter);
        return;
      }
      // Clicking a selected plane's sprite keeps the group selected. A click
      // near it (but not on its tile) is a destination, not another selection.
      if (directHit && isSelected) return;
      if (directHit && !isSelected) {
        this.select(clickedFighter);
        return;
      }
    }

    const selectedIds = [...this.selected.values()]
      .filter((unit) => unit.isActive())
      .map((unit) => unit.id());
    if (selectedIds.length === 0) {
      this.clearSelection();
      return;
    }

    this.eventBus.emit(new MoveFighterIntentEvent(selectedIds, tile));
    this.clearSelection();
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
