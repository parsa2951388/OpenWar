import { TileRef } from "@openfront/engine-api/game/GameMap";
import { MessageType, UnitType } from "@openfront/engine-api/game/GameTypes";
import {
  zInt,
  zPlayerRef,
  zRef,
  zTiles,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Player, Unit } from "../game/Game";
import { AirPathFinder } from "../pathfinding/PathFinder.Air";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

export class CommercialAircraftExecution implements Execution {
  private active = true;
  private mg: Game;
  private pathFinder: AirPathFinder;
  private aircraft?: Unit;
  private wasCaptured = false;
  private currentPath: TileRef[] = [];
  private pathIndex = 0;
  private cargoValue = 0;

  constructor(
    private origOwner: Player,
    private srcAirport: Unit,
    private dstAirport: Unit,
  ) {}

  init(mg: Game, _ticks: number): void {
    this.mg = mg;
    this.pathFinder = new AirPathFinder(mg);
  }

  tick(_ticks: number): void {
    if (this.aircraft === undefined) {
      const spawn = this.origOwner.canBuild(
        UnitType.CommercialAircraft,
        this.srcAirport.tile(),
      );
      if (spawn === false) {
        this.active = false;
        return;
      }
      const distance = this.mg.manhattanDist(
        this.srcAirport.tile(),
        this.dstAirport.tile(),
      );
      this.cargoValue = 5_000 + distance * 50;
      this.aircraft = this.origOwner.buildUnit(
        UnitType.CommercialAircraft,
        spawn,
        { targetUnit: this.dstAirport },
      );
      this.setRoute(spawn, this.dstAirport.tile());
    }

    const aircraft = this.aircraft;
    if (!aircraft.isActive()) {
      this.active = false;
      return;
    }

    const owner = aircraft.owner();
    const destinationOwner = this.dstAirport.owner();
    if (owner !== this.origOwner) this.wasCaptured = true;

    if (destinationOwner.id() === this.srcAirport.owner().id()) {
      aircraft.delete(false);
      this.active = false;
      return;
    }

    if (
      !this.wasCaptured &&
      (!this.dstAirport.isActive() || !owner.canTrade(destinationOwner))
    ) {
      aircraft.delete(false);
      this.active = false;
      return;
    }

    if (
      this.wasCaptured &&
      (owner !== destinationOwner || !this.dstAirport.isActive())
    ) {
      const nearest = this.findNearestFriendlyAirport(owner, aircraft.tile());
      if (nearest === null) {
        aircraft.delete(false);
        this.active = false;
        return;
      }
      this.dstAirport = nearest;
      aircraft.setTargetUnit(nearest);
      aircraft.touch();
      this.setRoute(aircraft.tile(), nearest.tile());
    }

    if (this.mg.manhattanDist(aircraft.tile(), this.dstAirport.tile()) <= 2) {
      this.complete();
      return;
    }

    if (this.pathIndex < this.currentPath.length) {
      aircraft.move(this.currentPath[this.pathIndex++]);
      return;
    }

    this.setRoute(aircraft.tile(), this.dstAirport.tile());
    if (this.currentPath.length <= 1) {
      aircraft.delete(false);
      this.active = false;
    }
  }

  private setRoute(from: TileRef, to: TileRef): void {
    this.currentPath = this.pathFinder.findPath(from, to) ?? [];
    this.pathIndex = 0;
  }

  private findNearestFriendlyAirport(
    owner: Player,
    tile: TileRef,
  ): Unit | null {
    const airports = owner
      .units(UnitType.Airport)
      .filter(
        (airport) =>
          airport.isActive() &&
          !airport.isMarkedForDeletion() &&
          !airport.isUnderConstruction(),
      );
    if (airports.length === 0) return null;

    let nearest: Unit | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const airport of airports) {
      const distance = this.mg.manhattanDist(tile, airport.tile());
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = airport;
      }
    }
    return nearest;
  }

  private complete(): void {
    const aircraft = this.aircraft;
    if (aircraft === undefined) return;
    this.active = false;
    aircraft.delete(false);

    const gold = BigInt(this.cargoValue);
    if (this.wasCaptured) {
      const captor = aircraft.owner();
      captor.addGold(gold, this.dstAirport.tile());
      this.mg.displayMessage(
        "events_display.received_gold_from_captured_commercial_aircraft",
        MessageType.CAPTURED_ENEMY_UNIT,
        captor.id(),
        gold,
        { gold: this.cargoValue },
      );
      return;
    }

    const sourceOwner = this.srcAirport.owner();
    const destinationOwner = this.dstAirport.owner();
    sourceOwner.addGold(gold);
    destinationOwner.addGold(gold, this.dstAirport.tile());
    this.mg.displayMessage(
      "events_display.received_gold_from_commercial_aircraft",
      MessageType.RECEIVED_GOLD_FROM_TRADE,
      destinationOwner.id(),
      undefined,
      { gold: this.cargoValue },
    );
    this.mg.displayMessage(
      "events_display.received_gold_from_commercial_aircraft",
      MessageType.RECEIVED_GOLD_FROM_TRADE,
      sourceOwner.id(),
      undefined,
      { gold: this.cargoValue },
    );
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return CommercialAircraftExecutionSnapshot.write({
      active: this.active,
      origOwner: w.player(this.origOwner),
      srcAirport: w.unit(this.srcAirport),
      dstAirport: w.unit(this.dstAirport),
      aircraft: w.unitOrNull(this.aircraft),
      wasCaptured: this.wasCaptured,
      currentPath: Uint32Array.from(this.currentPath),
      pathIndex: this.pathIndex,
      cargoValue: this.cargoValue,
    });
  }

  restoreSnapshot(s: CommercialAircraftState, r: SnapshotReader): void {
    this.active = s.active;
    this.origOwner = r.player(s.origOwner);
    this.srcAirport = r.unit(s.srcAirport);
    this.dstAirport = r.unit(s.dstAirport);
    this.aircraft = r.unitOrNull(s.aircraft) ?? undefined;
    this.wasCaptured = s.wasCaptured;
    this.currentPath = Array.from(s.currentPath);
    this.pathIndex = s.pathIndex;
    this.cargoValue = s.cargoValue;
    this.mg = r.game;
    this.pathFinder = new AirPathFinder(r.game);
  }
}

const CommercialAircraftStateSchema = z.object({
  active: z.boolean(),
  origOwner: zPlayerRef(),
  srcAirport: zRef(),
  dstAirport: zRef(),
  aircraft: zRef().nullable(),
  wasCaptured: z.boolean(),
  currentPath: zTiles(),
  pathIndex: zInt(),
  cargoValue: zInt(),
});
type CommercialAircraftState = z.infer<typeof CommercialAircraftStateSchema>;

export const CommercialAircraftExecutionSnapshot = execSnapshotType({
  name: "CommercialAircraft",
  version: 1,
  schema: CommercialAircraftStateSchema,
  cls: () => CommercialAircraftExecution,
});
