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

const FIGHTER_SELECT_RADIUS = 9;
const FIGHTER_TYPES = [
  UnitType.StealthFighter,
  UnitType.GroundAttacker,
  UnitType.AirFighter,
] as const;

/**
 * Click-to-select and click-to-move air-unit controls.
 * The selected marker uses the same GPU selection buffer as naval units.
 */
export class FighterSelectionController implements Controller {
  private selected: UnitView | null = null;

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
      if (event.isSelected) this.clearSelection();
    });
  }

  tick(): void {
    if (this.selected !== null && !this.selected.isActive()) {
      this.clearSelection();
    }
  }

  private localFighters(): UnitView[] {
    const owner = this.game.myPlayer();
    if (owner === undefined) return [];
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
    if (tile !== undefined) this.handleWorldClick(tile);
  }

  private onTouch(event: TouchEvent): void {
    const tile = this.tileFromScreen(event.x, event.y);
    if (tile !== undefined) this.handleWorldClick(tile);
  }

  private handleWorldClick(tile: TileRef): void {
    const clickedFighter = this.closestFighter(tile);
    if (clickedFighter !== undefined) {
      this.select(clickedFighter);
      return;
    }

    if (this.selected === null || !this.selected.isActive()) return;
    this.eventBus.emit(new MoveFighterIntentEvent([this.selected.id()], tile));
    this.clearSelection();
  }

  private select(unit: UnitView): void {
    this.selected = unit;
    this.view.setSelectedUnits([unit.id()]);
  }

  private clearSelection(): void {
    if (this.selected === null) return;
    this.selected = null;
    this.view.setSelectedUnits([]);
  }
}
