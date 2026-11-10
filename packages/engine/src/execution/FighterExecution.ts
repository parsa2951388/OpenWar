import { TileRef } from "@openfront/engine-api/game/GameMap";
import {
  FighterState,
  FighterType,
  MessageType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import {
  zInt,
  zPlayerRef,
  zRandom,
  zRef,
  zTile,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import {
  Attack,
  Execution,
  Game,
  isUnit,
  OwnerComp,
  Player,
  Unit,
} from "../game/Game";
import { PathFinding } from "../pathfinding/PathFinder";
import { PathStatus, SteppingPathFinder } from "../pathfinding/types";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import {
  AirPathFinderSchema,
  airPathFinderState,
  restoreAirPathFinder,
} from "../snapshot/PathfinderSnapshots";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

import { FighterAamExecution } from "./FighterAamExecution";
import { FighterBombExecution } from "./FighterBombExecution";

export type FighterBuildInput = OwnerComp & {
  fighterType: FighterType;
  patrolTile: TileRef;
};

const FIGHTER_UNIT_TYPES = [
  UnitType.StealthFighter,
  UnitType.GroundAttacker,
  UnitType.AirFighter,
] as const;

const STRUCTURE_TYPES: readonly UnitType[] = [
  UnitType.City,
  UnitType.DefensePost,
  UnitType.SAMLauncher,
  UnitType.MissileSilo,
  UnitType.Port,
  UnitType.Factory,
  UnitType.Airport,
];

const CIRCLE_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [8, 0],
  [7, 1],
  [6, 2],
  [5, 3],
  [4, 4],
  [3, 5],
  [2, 6],
  [1, 7],
  [0, 8],
  [-1, 7],
  [-2, 6],
  [-3, 5],
  [-4, 4],
  [-5, 3],
  [-6, 2],
  [-7, 1],
];

function fighterUnitType(type: FighterType): UnitType {
  switch (type) {
    case FighterType.Stealth:
      return UnitType.StealthFighter;
    case FighterType.Ground:
      return UnitType.GroundAttacker;
    case FighterType.Air:
      return UnitType.AirFighter;
  }
}

function isFighterUnit(type: UnitType): boolean {
  return FIGHTER_UNIT_TYPES.includes(
    type as (typeof FIGHTER_UNIT_TYPES)[number],
  );
}

function isAircraft(type: UnitType): boolean {
  return isFighterUnit(type) || type === UnitType.CommercialAircraft;
}

function isWarshipLike(type: UnitType): boolean {
  return type === UnitType.Warship || type === UnitType.AircraftCarrier;
}

type RefuelPoint = {
  tile: TileRef;
  unit?: Unit;
};

type RefuelPointWithDistance = RefuelPoint & {
  distanceSquared: number;
};

type AttackMode = "aam" | "gun" | "bomb" | "capture" | null;

export class FighterExecution implements Execution {
  private active = true;
  private mg: Game | undefined;
  private fighter: Unit | undefined;
  private pathfinder: SteppingPathFinder<TileRef> | undefined;
  private random: PseudoRandom | undefined;
  private moveSpeedRemainder = 0;
  private lastObservedPatrolTile: TileRef | undefined;
  private lastManualMoveTickRetreatDisabled = 0;
  private lastEmittedCombat = false;

  constructor(private input: FighterBuildInput | Unit) {}

  init(mg: Game, _ticks: number): void {
    this.mg = mg;
    this.pathfinder = PathFinding.Air(mg);
    this.random = new PseudoRandom(mg.ticks());

    if (isUnit(this.input)) {
      this.fighter = this.input;
    } else {
      const unitType = fighterUnitType(this.input.fighterType);
      const spawn = this.input.owner.canBuild(unitType, this.input.patrolTile);
      if (spawn === false) {
        this.active = false;
        return;
      }
      this.fighter = this.input.owner.buildUnit(unitType, spawn, {
        patrolTile: this.input.patrolTile,
      });
    }
    this.lastObservedPatrolTile = this.fighter.fighterState().patrolTile;
  }

  tick(_ticks: number): void {
    const mg = this.mg;
    const fighter = this.fighter;
    if (!this.active || mg === undefined || fighter === undefined) return;

    if (!fighter.isActive() || fighter.health() <= 0) {
      if (fighter.isActive()) fighter.delete();
      mg.clearFighterBombAlerts(fighter.id());
      this.active = false;
      return;
    }

    const previousState = fighter.fighterState();
    const wasInCombat = previousState.isInCombat ?? false;
    if (this.lastEmittedCombat && !wasInCombat) fighter.touch();
    this.lastEmittedCombat = wasInCombat;

    if (previousState.state === "crashed") {
      this.active = false;
      return;
    }

    this.handleManualPatrolOverride();

    let state = fighter.fighterState();
    if (state.state !== "refueling") {
      const shouldReturnForDamageOrAmmo =
        state.state !== "returning" &&
        (this.isOutOfAmmo(state.fighterType, state) || this.isDamaged());

      if (
        state.state !== "returning" &&
        (this.needsImmediateReturnForFuel() ||
          state.fuel <= mg.config().fighterLowFuelThreshold(state.fighterType))
      ) {
        this.startReturnToBase();
      } else if (shouldReturnForDamageOrAmmo) {
        this.startReturnToBase();
      } else {
        this.tickFuel();
      }
      state = fighter.fighterState();
    }

    if (state.state !== "returning" && state.state !== "refueling") {
      if (
        this.needsImmediateReturnForFuel() ||
        state.fuel <= mg.config().fighterLowFuelThreshold(state.fighterType) ||
        this.isOutOfAmmo(state.fighterType, state) ||
        this.isDamaged()
      ) {
        this.startReturnToBase();
        state = fighter.fighterState();
      }
    }

    if (state.state === "refueling" && this.handleRefueling()) return;
    if (state.state === "returning" && this.handleReturnToBase()) return;
    if (
      (state.state === "patrolling" || state.state === "returning") &&
      this.tryStartServiceAtStation()
    ) {
      return;
    }

    if (
      !this.isNearPatrolOrbit() &&
      !this.shouldBypassPatrolOrbitForCommercialCapture()
    ) {
      fighter.setTargetUnit(undefined);
      this.patrol();
      return;
    }

    if (state.fighterType === FighterType.Ground) {
      const groundAttack = this.findGroundAttackTarget();
      if (groundAttack !== undefined) {
        this.attackGroundTarget(groundAttack.attack, groundAttack.tile);
        return;
      }

      const airTarget = this.findAirGunTarget();
      if (airTarget !== undefined) {
        fighter.setTargetUnit(airTarget);
        this.attackTarget(airTarget);
        return;
      }

      const structureTarget = this.findGroundStructureBombTarget();
      if (structureTarget !== undefined) {
        fighter.setTargetUnit(structureTarget);
        this.attackTarget(structureTarget);
        return;
      }
    }

    const target = this.findTarget();
    if (target !== undefined) {
      fighter.setTargetUnit(target);
      this.attackTarget(target);
      return;
    }

    const pursuitTarget = this.findPursuitTarget();
    if (pursuitTarget !== undefined) {
      if (state.fighterType === FighterType.Stealth) {
        fighter.setTargetUnit(undefined);
      } else {
        fighter.setTargetUnit(pursuitTarget);
      }
      this.orbitAround(pursuitTarget.tile());
      return;
    }

    fighter.setTargetUnit(undefined);
    this.patrol();
  }

  private isDamaged(): boolean {
    const fighter = this.fighter!;
    return fighter.hasHealth() && fighter.health() < fighter.maxHealth();
  }

  private isOutOfAmmo(type: FighterType, state: FighterState): boolean {
    const config = this.mg!.config();
    const hasAam = config.fighterMaxAam(type) > 0 && state.aam > 0;
    const hasBomb = config.fighterMaxBomb(type) > 0 && state.bomb > 0;
    const hasGunAmmo = config.fighterMaxGunAmmo(type) > 0 && state.ammo > 0;
    return !hasAam && !hasBomb && !hasGunAmmo;
  }

  private isAmmoFull(type: FighterType, state: FighterState): boolean {
    const config = this.mg!.config();
    return !(
      (config.fighterMaxAam(type) > 0 &&
        state.aam < config.fighterMaxAam(type)) ||
      (config.fighterMaxBomb(type) > 0 &&
        state.bomb < config.fighterMaxBomb(type)) ||
      (config.fighterMaxGunAmmo(type) > 0 &&
        state.ammo < config.fighterMaxGunAmmo(type)) ||
      (config.fighterMaxFlares(type) > 0 &&
        state.flares < config.fighterMaxFlares(type))
    );
  }

  private isFullyServiced(): boolean {
    if (this.isDamaged()) return false;
    const state = this.fighter!.fighterState();
    const config = this.mg!.config();
    if (!this.isAmmoFull(state.fighterType, state)) return false;
    const fuelThreshold = Math.floor(
      config.fighterMaxFuel(state.fighterType) *
        config.fighterFullyServicedFuelRatio(),
    );
    return state.fuel > fuelThreshold;
  }

  private needsService(): boolean {
    if (this.isFullyServiced()) return false;
    const state = this.fighter!.fighterState();
    const config = this.mg!.config();
    return (
      this.isDamaged() ||
      this.isOutOfAmmo(state.fighterType, state) ||
      (config.fighterMaxFlares(state.fighterType) > 0 && state.flares <= 0) ||
      state.fuel <= config.fighterLowFuelThreshold(state.fighterType) ||
      this.needsImmediateReturnForFuel()
    );
  }

  private canServicePlayer(player: Player): boolean {
    const owner = this.fighter!.owner();
    return player === owner || owner.isFriendly(player);
  }

  private canServiceCarrier(carrier: Unit): boolean {
    return (
      carrier.isActive() &&
      carrier.type() === UnitType.AircraftCarrier &&
      this.canServicePlayer(carrier.owner()) &&
      carrier.warshipState().state === "patrolling"
    );
  }

  private isAirportSaturated(airport: Unit, ignore?: Unit): boolean {
    const mg = this.mg!;
    const servicing = mg
      .nearbyUnits(
        airport.tile(),
        mg.config().fighterRefuelRange(),
        FIGHTER_UNIT_TYPES,
      )
      .filter(({ unit }) => {
        if (unit === ignore || !unit.isActive()) return false;
        const state = unit.fighterState();
        return (
          (state.state === "returning" || state.state === "refueling") &&
          (unit.owner() === airport.owner() ||
            unit.owner().isFriendly(airport.owner()))
        );
      }).length;
    return servicing >= airport.level();
  }

  private findServiceStationAtFighter(): RefuelPoint | undefined {
    const fighter = this.fighter!;
    const tile = fighter.tile();

    // A carrier services aircraft only when the aircraft is on the deck tile.
    for (const player of this.mg!.players()) {
      if (!this.canServicePlayer(player)) continue;
      for (const carrier of player.units(UnitType.AircraftCarrier)) {
        if (carrier.tile() === tile && this.canServiceCarrier(carrier)) {
          return { tile: carrier.tile(), unit: carrier };
        }
      }
    }

    const range = this.mg!.config().fighterRefuelRange();
    let nearest: RefuelPointWithDistance | undefined;
    for (const player of this.mg!.players()) {
      if (!this.canServicePlayer(player)) continue;
      for (const airport of player.units(UnitType.Airport)) {
        if (
          !airport.isActive() ||
          airport.isUnderConstruction() ||
          this.isAirportSaturated(airport, fighter)
        ) {
          continue;
        }
        const distanceSquared = this.mg!.euclideanDistSquared(
          tile,
          airport.tile(),
        );
        if (distanceSquared > range * range) continue;
        if (
          nearest === undefined ||
          distanceSquared < nearest.distanceSquared
        ) {
          nearest = { tile: airport.tile(), distanceSquared };
        }
      }
    }
    return nearest === undefined ? undefined : { tile: nearest.tile };
  }

  private tryStartServiceAtStation(): boolean {
    const state = this.fighter!.fighterState();
    if (
      (state.state !== "patrolling" && state.state !== "returning") ||
      !this.needsService()
    ) {
      return false;
    }
    const station = this.findServiceStationAtFighter();
    if (station === undefined) return false;
    this.fighter!.updateFighterState({
      retreatAirbase: station.tile,
      refuelSourceUnitId:
        station.unit?.type() === UnitType.AircraftCarrier
          ? station.unit.id()
          : undefined,
    });
    this.startRefueling(station.tile, station.unit);
    return true;
  }

  private collectRefuelPoints(): RefuelPoint[] {
    const points: RefuelPoint[] = [];
    for (const player of this.mg!.players()) {
      if (!this.canServicePlayer(player)) continue;
      for (const airport of player.units(UnitType.Airport)) {
        if (
          airport.isActive() &&
          !airport.isUnderConstruction() &&
          !this.isAirportSaturated(airport, this.fighter)
        ) {
          points.push({ tile: airport.tile() });
        }
      }
      for (const carrier of player.units(UnitType.AircraftCarrier)) {
        if (this.canServiceCarrier(carrier)) {
          points.push({ tile: carrier.tile(), unit: carrier });
        }
      }
    }
    return points;
  }

  private nearestAvailableRefuelPoint(): RefuelPointWithDistance | undefined {
    const from = this.fighter!.tile();
    let nearest: RefuelPointWithDistance | undefined;
    for (const point of this.collectRefuelPoints()) {
      const distanceSquared = this.mg!.euclideanDistSquared(from, point.tile);
      if (nearest === undefined || distanceSquared < nearest.distanceSquared) {
        nearest = { ...point, distanceSquared };
      }
    }
    return nearest;
  }

  private estimateTicksToReachRefuelPoint(point: RefuelPoint): number {
    const state = this.fighter!.fighterState();
    const path = this.pathfinder!.findPath(this.fighter!.tile(), point.tile);
    if (path === null || path.length === 0) return Number.POSITIVE_INFINITY;

    let distance = Math.max(0, path.length - 1);
    if (point.unit === undefined) {
      distance = Math.max(0, distance - this.mg!.config().fighterRefuelRange());
    }
    return Math.ceil(
      distance / this.mg!.config().fighterSpeed(state.fighterType),
    );
  }

  private needsImmediateReturnForFuel(): boolean {
    const point = this.nearestAvailableRefuelPoint();
    if (point === undefined) return false;
    const ticksToRefuel = this.estimateTicksToReachRefuelPoint(point);
    if (!Number.isFinite(ticksToRefuel)) return false;
    return (
      this.fighter!.fighterState().fuel <
      ticksToRefuel + this.mg!.config().fighterFuelReturnSafetyBuffer()
    );
  }

  private findBetterRefuelPoint(): RefuelPointWithDistance | undefined {
    const nearest = this.nearestAvailableRefuelPoint();
    if (nearest === undefined) return undefined;

    const currentTile = this.fighter!.fighterState().retreatAirbase;
    if (currentTile === undefined) return nearest;

    const currentDistance = this.mg!.euclideanDistSquared(
      this.fighter!.tile(),
      currentTile,
    );
    if (
      nearest.distanceSquared <
      currentDistance * this.mg!.config().warshipPortSwitchThreshold()
    ) {
      return nearest;
    }
    return undefined;
  }

  private getAirportAtTile(tile: TileRef): Unit | undefined {
    for (const player of this.mg!.players()) {
      if (!this.canServicePlayer(player)) continue;
      const airport = player
        .units(UnitType.Airport)
        .find(
          (unit) =>
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            unit.tile() === tile,
        );
      if (airport !== undefined) return airport;
    }
    return undefined;
  }

  private startReturnToBase(): void {
    const point = this.nearestAvailableRefuelPoint();
    if (point === undefined) return;
    this.fighter!.updateFighterState({
      retreatAirbase: point.tile,
      refuelSourceUnitId:
        point.unit?.type() === UnitType.AircraftCarrier
          ? point.unit.id()
          : undefined,
      state: "returning",
      refuelStartTick: undefined,
    });
    this.fighter!.setTargetUnit(undefined);
  }

  private resolveRefuelPoint(): RefuelPoint | undefined {
    const state = this.fighter!.fighterState();
    if (state.refuelSourceUnitId !== undefined) {
      const carrier = this.mg!.unit(state.refuelSourceUnitId);
      return carrier !== undefined && this.canServiceCarrier(carrier)
        ? { tile: carrier.tile(), unit: carrier }
        : undefined;
    }
    if (state.retreatAirbase === undefined) return undefined;
    const airport = this.getAirportAtTile(state.retreatAirbase);
    return airport === undefined
      ? undefined
      : { tile: airport.tile(), unit: airport };
  }

  private refreshRetreatAirbase(): boolean {
    const state = this.fighter!.fighterState();

    // If the selected carrier is no longer available, select another
    // friendly service point; carriers are mobile runways.
    if (state.refuelSourceUnitId !== undefined) {
      const currentCarrier = this.resolveRefuelPoint();
      if (currentCarrier !== undefined) return true;
      const next = this.nearestAvailableRefuelPoint();
      if (next === undefined) return false;
      this.fighter!.updateFighterState({
        retreatAirbase: next.tile,
        refuelSourceUnitId:
          next.unit?.type() === UnitType.AircraftCarrier
            ? next.unit.id()
            : undefined,
      });
      return true;
    }

    const retreatTile = state.retreatAirbase;
    const friendlyAirports = this.mg!.players()
      .filter((player) => this.canServicePlayer(player))
      .flatMap((player) => player.units(UnitType.Airport))
      .filter(
        (airport) => airport.isActive() && !airport.isUnderConstruction(),
      );

    if (friendlyAirports.length === 0) {
      const next = this.nearestAvailableRefuelPoint();
      if (next?.unit === undefined) return retreatTile !== undefined;
      this.fighter!.updateFighterState({
        retreatAirbase: next.tile,
        refuelSourceUnitId: next.unit.id(),
      });
      return true;
    }

    if (retreatTile === undefined) {
      const next = this.nearestAvailableRefuelPoint();
      if (next === undefined) return false;
      this.fighter!.updateFighterState({
        retreatAirbase: next.tile,
        refuelSourceUnitId:
          next.unit?.type() === UnitType.AircraftCarrier
            ? next.unit.id()
            : undefined,
      });
      return true;
    }

    const airport = this.getAirportAtTile(retreatTile);
    if (airport === undefined) {
      const next = this.nearestAvailableRefuelPoint();
      this.fighter!.updateFighterState({
        retreatAirbase: next?.tile,
        refuelSourceUnitId:
          next?.unit?.type() === UnitType.AircraftCarrier
            ? next.unit.id()
            : undefined,
      });
      return next !== undefined;
    }

    if (this.isAirportSaturated(airport, this.fighter)) {
      const next = this.nearestAvailableRefuelPoint();
      if (next !== undefined && next.tile !== retreatTile) {
        this.fighter!.updateFighterState({
          retreatAirbase: next.tile,
          refuelSourceUnitId:
            next.unit?.type() === UnitType.AircraftCarrier
              ? next.unit.id()
              : undefined,
        });
        return true;
      }
    }

    const better = this.findBetterRefuelPoint();
    if (better !== undefined && better.tile !== retreatTile) {
      this.fighter!.updateFighterState({
        retreatAirbase: better.tile,
        refuelSourceUnitId:
          better.unit?.type() === UnitType.AircraftCarrier
            ? better.unit.id()
            : undefined,
      });
    }
    return true;
  }

  private handleReturnToBase(): boolean {
    if (this.fighter!.fighterState().state !== "returning") return false;
    if (!this.refreshRetreatAirbase()) {
      this.cancelReturnToBase();
      return false;
    }

    const point = this.resolveRefuelPoint();
    if (point === undefined) {
      this.cancelReturnToBase();
      return false;
    }

    if (point.unit?.type() === UnitType.AircraftCarrier) {
      if (this.fighter!.tile() === point.tile) {
        this.startRefueling(point.tile, point.unit);
        return true;
      }
    } else {
      const reached =
        this.mg!.euclideanDistSquared(this.fighter!.tile(), point.tile) <=
        this.mg!.config().fighterRefuelRange() ** 2;
      if (reached) {
        const airport = this.getAirportAtTile(point.tile);
        if (
          airport !== undefined &&
          this.isAirportSaturated(airport, this.fighter)
        ) {
          const next = this.nearestAvailableRefuelPoint();
          if (next !== undefined && next.tile !== point.tile) {
            this.fighter!.updateFighterState({
              retreatAirbase: next.tile,
              refuelSourceUnitId:
                next.unit?.type() === UnitType.AircraftCarrier
                  ? next.unit.id()
                  : undefined,
            });
          }
          return true;
        }
        this.startRefueling(point.tile);
        return true;
      }
    }

    this.fighter!.setTargetTile(point.tile);
    const steps = this.getMoveSteps(this.fighter!.fighterState().fighterType);
    for (let i = 0; i < steps; i++) {
      const result = this.pathfinder!.next(this.fighter!.tile(), point.tile);
      if (result.status === PathStatus.COMPLETE) {
        this.fighter!.move(result.node);
        return true;
      }
      if (result.status === PathStatus.NEXT) {
        this.fighter!.move(result.node);
        continue;
      }
      this.cancelReturnToBase();
      return false;
    }
    return true;
  }

  private startRefueling(tile: TileRef, unit?: Unit): void {
    this.fighter!.move(tile);
    this.fighter!.setTargetTile(undefined);
    this.fighter!.setTargetUnit(undefined);
    this.fighter!.updateFighterState({
      state: "refueling",
      retreatAirbase: tile,
      refuelSourceUnitId:
        unit?.type() === UnitType.AircraftCarrier ? unit.id() : undefined,
      refuelStartTick: this.mg!.ticks(),
    });
  }

  private handleRefueling(): boolean {
    const state = this.fighter!.fighterState();
    if (state.state !== "refueling") return false;
    const point = this.resolveRefuelPoint();
    if (point === undefined) {
      this.cancelReturnToBase();
      return true;
    }

    const startedAt = state.refuelStartTick;
    if (startedAt === undefined) {
      this.completeRefueling();
      return true;
    }

    this.fighter!.move(point.tile);
    if (
      this.mg!.ticks() - startedAt >=
      this.mg!.config().fighterRefuelTicks(state.fighterType)
    ) {
      this.completeRefueling();
    }
    return true;
  }

  private completeRefueling(): void {
    const type = this.fighter!.fighterState().fighterType;
    const config = this.mg!.config();
    this.fighter!.updateFighterState({
      fuel: config.fighterMaxFuel(type),
      aam: config.fighterMaxAam(type),
      bomb: config.fighterMaxBomb(type),
      ammo: config.fighterMaxGunAmmo(type),
      flares: config.fighterMaxFlares(type),
      state: "patrolling",
      retreatAirbase: undefined,
      refuelSourceUnitId: undefined,
      refuelStartTick: undefined,
      isInCombat: false,
    });
    this.mg!.clearFighterBombAlerts(this.fighter!.id());
    if (this.fighter!.hasHealth()) {
      const missing = this.fighter!.maxHealth() - this.fighter!.health();
      if (missing > 0) this.fighter!.modifyHealth(missing);
    }
    this.fighter!.setTargetTile(undefined);
  }

  private cancelReturnToBase(): void {
    this.fighter!.updateFighterState({
      state: "patrolling",
      retreatAirbase: undefined,
      refuelSourceUnitId: undefined,
      refuelStartTick: undefined,
    });
    this.fighter!.setTargetTile(undefined);
  }

  private handleManualPatrolOverride(): void {
    const state = this.fighter!.fighterState();
    const patrolTile = state.patrolTile;
    if (
      this.lastObservedPatrolTile !== undefined &&
      patrolTile !== this.lastObservedPatrolTile
    ) {
      this.lastManualMoveTickRetreatDisabled = this.mg!.ticks();
      this.fighter!.setTargetUnit(undefined);
      const airport = this.getAirportAtTile(patrolTile);
      if (
        airport !== undefined &&
        !this.isAirportSaturated(airport, this.fighter)
      ) {
        if (this.isFullyServiced()) {
          if (state.state === "returning" || state.state === "refueling") {
            this.cancelReturnToBase();
          }
        } else {
          this.fighter!.updateFighterState({
            retreatAirbase: patrolTile,
            refuelSourceUnitId: undefined,
            state: "returning",
          });
        }
      } else if (state.state === "returning" || state.state === "refueling") {
        this.cancelReturnToBase();
      }
    }
    this.lastObservedPatrolTile = patrolTile;
  }

  private canEngagePlayer(player: Player): boolean {
    return this.fighter!.owner().canAttackPlayer(player, true);
  }

  private getFighterScanTypes(type: FighterType): UnitType[] | undefined {
    if (type === FighterType.Stealth) {
      return [
        UnitType.AirFighter,
        UnitType.Warship,
        UnitType.AircraftCarrier,
        ...STRUCTURE_TYPES,
      ];
    }
    if (type === FighterType.Air) {
      return [
        UnitType.CommercialAircraft,
        UnitType.StealthFighter,
        UnitType.GroundAttacker,
        UnitType.AirFighter,
      ];
    }
    return undefined;
  }

  private selectAttackMode(
    type: FighterType,
    target: Unit,
    distanceSquared: number,
    state: FighterState,
  ): AttackMode {
    const config = this.mg!.config();
    const targetType = target.type();
    if (targetType === UnitType.TradeShip) return null;
    if (targetType === UnitType.CommercialAircraft) {
      return type === FighterType.Air ? "capture" : null;
    }

    if (type === FighterType.Air) {
      return isFighterUnit(targetType) &&
        state.aam > 0 &&
        distanceSquared <= config.fighterAamAttackRange() ** 2
        ? "aam"
        : null;
    }

    if (type === FighterType.Stealth) {
      if (
        targetType === UnitType.AirFighter &&
        state.aam > 0 &&
        distanceSquared <= config.fighterAamAttackRange() ** 2
      ) {
        return "aam";
      }
      if (
        state.bomb > 0 &&
        this.canEngagePlayer(target.owner()) &&
        (STRUCTURE_TYPES.includes(targetType) || isWarshipLike(targetType)) &&
        distanceSquared <= config.fighterBombAttackRange(type) ** 2
      ) {
        return "bomb";
      }
      return null;
    }

    if (type === FighterType.Ground) {
      if (
        isFighterUnit(targetType) &&
        state.ammo > 0 &&
        distanceSquared <= config.fighterGunAirRange() ** 2
      ) {
        return "gun";
      }
      if (
        state.bomb > 0 &&
        this.canEngagePlayer(target.owner()) &&
        STRUCTURE_TYPES.includes(targetType) &&
        distanceSquared <= config.fighterBombAttackRange(type) ** 2
      ) {
        return "bomb";
      }
    }
    return null;
  }

  private canEngageTarget(
    type: FighterType,
    target: Unit,
    state: FighterState,
  ): boolean {
    const targetType = target.type();
    if (targetType === UnitType.TradeShip) return false;
    if (type === FighterType.Air) {
      if (targetType === UnitType.CommercialAircraft) {
        return this.canEngagePlayer(target.owner());
      }
      return isFighterUnit(targetType) && state.aam > 0;
    }
    if (type === FighterType.Stealth) {
      return (
        (targetType === UnitType.AirFighter && state.aam > 0) ||
        (state.bomb > 0 &&
          this.canEngagePlayer(target.owner()) &&
          (STRUCTURE_TYPES.includes(targetType) || isWarshipLike(targetType)))
      );
    }
    return (
      ((targetType === UnitType.StealthFighter ||
        targetType === UnitType.GroundAttacker ||
        targetType === UnitType.AirFighter) &&
        state.ammo > 0) ||
      (state.bomb > 0 &&
        this.canEngagePlayer(target.owner()) &&
        STRUCTURE_TYPES.includes(targetType))
    );
  }

  private findNearestCombatUnit(
    requireInWeaponRange: boolean,
  ): Unit | undefined {
    const fighter = this.fighter!;
    const state = fighter.fighterState();
    const types = this.getFighterScanTypes(state.fighterType);
    if (types === undefined) return undefined;

    const scanRange = this.mg!.config().fighterTargetRange(state.fighterType);
    const scanTile =
      state.fighterType === FighterType.Air ? state.patrolTile : fighter.tile();
    let nearest: { unit: Unit; distanceSquared: number } | undefined;

    for (const { unit, distSquared } of this.mg!.nearbyUnits(
      scanTile,
      scanRange,
      types,
    )) {
      if (
        unit === fighter ||
        unit.owner() === fighter.owner() ||
        !this.canEngagePlayer(unit.owner()) ||
        !unit.isActive() ||
        (state.fighterType === FighterType.Air &&
          !this.isInAFighterPatrolArea(unit.tile())) ||
        unit.type() === UnitType.TradeShip ||
        (state.fighterType === FighterType.Stealth &&
          unit.type() === UnitType.SAMLauncher &&
          distSquared > this.mg!.config().fighterStealthRange() ** 2) ||
        !this.canEngageTarget(state.fighterType, unit, state)
      ) {
        continue;
      }

      const mode = this.selectAttackMode(
        state.fighterType,
        unit,
        distSquared,
        state,
      );
      const inWeaponRange = mode !== null;
      if (requireInWeaponRange !== inWeaponRange) continue;
      if (nearest === undefined || distSquared < nearest.distanceSquared) {
        nearest = { unit, distanceSquared: distSquared };
      }
    }
    return nearest?.unit;
  }

  private findTarget(): Unit | undefined {
    return this.findNearestCombatUnit(true);
  }

  private findPursuitTarget(): Unit | undefined {
    return this.findNearestCombatUnit(false);
  }

  private findAirGunTarget(): Unit | undefined {
    const state = this.fighter!.fighterState();
    if (state.ammo <= 0) return undefined;
    const owner = this.fighter!.owner();
    const range = this.mg!.config().fighterGunAirRange();
    for (const { unit, distSquared } of this.mg!.nearbyUnits(
      this.fighter!.tile(),
      range,
      FIGHTER_UNIT_TYPES,
    )) {
      if (
        unit.owner() !== owner &&
        this.canEngagePlayer(unit.owner()) &&
        unit.isActive() &&
        distSquared <= range * range
      ) {
        return unit;
      }
    }
    return undefined;
  }

  private findGroundStructureBombTarget(): Unit | undefined {
    if (this.fighter!.fighterState().bomb <= 0) return undefined;
    const owner = this.fighter!.owner();
    const range = this.mg!.config().fighterBombAttackRange(FighterType.Ground);
    for (const { unit, distSquared } of this.mg!.nearbyUnits(
      this.fighter!.tile(),
      range,
      STRUCTURE_TYPES,
    )) {
      if (
        unit.owner() !== owner &&
        this.canEngagePlayer(unit.owner()) &&
        unit.isActive() &&
        distSquared <= range * range
      ) {
        return unit;
      }
    }
    return undefined;
  }

  private findGroundAttackTarget():
    | { attack: Attack; tile: TileRef }
    | undefined {
    const state = this.fighter!.fighterState();
    if (state.ammo <= 0 && state.bomb <= 0) return undefined;
    const owner = this.fighter!.owner();
    const range = this.mg!.config().fighterTargetRange(FighterType.Ground);
    const rangeSquared = range * range;
    let nearest:
      | { attack: Attack; tile: TileRef; distanceSquared: number }
      | undefined;

    for (const attack of owner.incomingAttacks()) {
      if (!attack.isActive() || attack.sourceTile() !== null) continue;
      const attacker = attack.attacker();
      if (!attacker.isPlayer() || !this.canEngagePlayer(attacker)) continue;
      for (const tile of attack.clusteredPositions()) {
        const distanceSquared = this.mg!.euclideanDistSquared(
          this.fighter!.tile(),
          tile,
        );
        if (distanceSquared > rangeSquared) continue;
        if (
          nearest === undefined ||
          distanceSquared < nearest.distanceSquared
        ) {
          nearest = { attack, tile, distanceSquared };
        }
      }
    }
    return nearest === undefined
      ? undefined
      : { attack: nearest.attack, tile: nearest.tile };
  }

  private selectGroundAttackMode(
    distanceSquared: number,
    state: FighterState,
    attacker: Player,
  ): "bomb" | "gun" | null {
    const config = this.mg!.config();
    if (
      state.bomb > 0 &&
      this.canEngagePlayer(attacker) &&
      distanceSquared <= config.fighterBombAttackRange(FighterType.Ground) ** 2
    ) {
      return "bomb";
    }
    if (
      state.ammo > 0 &&
      distanceSquared <= config.fighterAamAttackRange() ** 2
    ) {
      return "gun";
    }
    return null;
  }

  private attackGroundTarget(attack: Attack, tile: TileRef): void {
    const fighter = this.fighter!;
    fighter.setTargetUnit(undefined);
    const state = fighter.fighterState();
    const attacker = attack.attacker();
    if (attacker.isPlayer() && !this.canEngagePlayer(attacker)) {
      this.patrol();
      return;
    }
    if (this.isOutOfAmmo(FighterType.Ground, state)) {
      this.startReturnToBase();
      return;
    }

    const distanceSquared = this.mg!.euclideanDistSquared(fighter.tile(), tile);
    const mode = attacker.isPlayer()
      ? this.selectGroundAttackMode(distanceSquared, state, attacker)
      : null;

    if (mode === "gun" && attack.isActive()) {
      fighter.updateFighterState({ isInCombat: true, ammo: state.ammo - 1 });
      const damage = this.mg!.config().fighterGroundAttackDamage(
        FighterType.Ground,
      );
      const remaining = Math.max(0, attack.troops() - damage);
      attack.setTroops(remaining);
      if (remaining <= 0) attack.delete();
      if (
        this.isOutOfAmmo(FighterType.Ground, {
          ...state,
          ammo: state.ammo - 1,
        })
      ) {
        this.startReturnToBase();
        return;
      }
    } else if (
      mode === "bomb" &&
      attack.isActive() &&
      attacker.isPlayer() &&
      this.canEngagePlayer(attacker)
    ) {
      fighter.updateFighterState({ isInCombat: true, bomb: state.bomb - 1 });
      const damage = this.mg!.config().fighterBombTroopDamage(
        FighterType.Ground,
      );
      const remaining = Math.max(0, attack.troops() - damage);
      attack.setTroops(remaining);
      if (remaining <= 0) attack.delete();
      if (
        this.isOutOfAmmo(FighterType.Ground, {
          ...state,
          bomb: state.bomb - 1,
        })
      ) {
        this.startReturnToBase();
        return;
      }
    }
    this.orbitAround(tile);
  }

  private attackTarget(target: Unit): void {
    const fighter = this.fighter!;
    const state = fighter.fighterState();
    const type = state.fighterType;
    if (!this.canEngagePlayer(target.owner())) {
      fighter.setTargetUnit(undefined);
      this.patrol();
      return;
    }
    if (this.isOutOfAmmo(type, state)) {
      this.startReturnToBase();
      return;
    }

    const distanceSquared = this.mg!.euclideanDistSquared(
      fighter.tile(),
      target.tile(),
    );
    const mode = this.selectAttackMode(type, target, distanceSquared, state);
    if (mode === null) {
      this.orbitAround(target.tile());
      return;
    }

    if (mode === "capture") {
      if (this.mg!.manhattanDist(fighter.tile(), target.tile()) <= 5) {
        fighter.updateFighterState({ isInCombat: true });
        fighter.owner().captureUnit(target);
        fighter.setTargetUnit(undefined);
        return;
      }
      this.orbitAround(target.tile());
      return;
    }

    const config = this.mg!.config();
    const attackRange =
      mode === "aam"
        ? config.fighterAamAttackRange()
        : mode === "bomb"
          ? config.fighterBombAttackRange(type)
          : config.fighterGunAirRange();

    if (distanceSquared <= attackRange * attackRange) {
      fighter.updateFighterState({ isInCombat: true });
      if (mode === "aam") {
        this.fireAamShell(target, config.fighterAamAttackDamage(type));
      } else if (mode === "gun") {
        fighter.updateFighterState({ ammo: state.ammo - 1 });
        target.modifyHealth(-config.fighterGunAirDamage(), fighter.owner());
      } else if (mode === "bomb" && this.canEngagePlayer(target.owner())) {
        fighter.updateFighterState({ bomb: state.bomb - 1 });
        const targetTile = target.tile();
        const notifyDefender = this.mg!.recordFighterBombAlert(
          fighter.id(),
          targetTile,
        );
        this.mg!.addExecution(
          new FighterBombExecution(
            fighter.owner(),
            targetTile,
            config.fighterBombRadius(type),
            notifyDefender,
          ),
        );
      }

      const nextState = fighter.fighterState();
      if (this.isOutOfAmmo(type, nextState)) {
        this.startReturnToBase();
        return;
      }
    }
    this.orbitAround(target.tile());
  }

  private fireAamShell(target: Unit, damage: number): void {
    const fighter = this.fighter!;
    const state = fighter.fighterState();
    if (state.aam <= 0) return;

    if (!this.mg!.reserveFighterAamTarget(fighter.id(), target.id())) return;
    fighter.updateFighterState({ aam: state.aam - 1 });
    this.mg!.addExecution(
      new FighterAamExecution(
        fighter.tile(),
        fighter.owner(),
        fighter,
        target,
        damage,
        isFighterUnit(target.type()),
      ),
    );
  }

  private isNearPatrolOrbit(): boolean {
    const state = this.fighter!.fighterState();
    return (
      this.mg!.manhattanDist(this.fighter!.tile(), state.patrolTile) <=
      this.mg!.config().fighterOrbitRadius(state.fighterType) + 1
    );
  }

  private getCombatScanTile(type: FighterType): TileRef {
    return type === FighterType.Air
      ? this.fighter!.fighterState().patrolTile
      : this.fighter!.tile();
  }

  private isInAFighterPatrolArea(tile: TileRef): boolean {
    const state = this.fighter!.fighterState();
    return (
      this.mg!.manhattanDist(tile, state.patrolTile) <=
      this.mg!.config().fighterTargetRange(FighterType.Air)
    );
  }

  private findCapturableCommercial(): Unit | undefined {
    const state = this.fighter!.fighterState();
    if (state.fighterType !== FighterType.Air) return undefined;
    const owner = this.fighter!.owner();
    const range = this.mg!.config().fighterTargetRange(FighterType.Air);
    for (const { unit } of this.mg!.nearbyUnits(state.patrolTile, range, [
      UnitType.CommercialAircraft,
    ])) {
      if (
        unit.owner() !== owner &&
        unit.isActive() &&
        this.isInAFighterPatrolArea(unit.tile()) &&
        this.canEngageTarget(FighterType.Air, unit, state)
      ) {
        return unit;
      }
    }
    return undefined;
  }

  private shouldBypassPatrolOrbitForCommercialCapture(): boolean {
    if (this.fighter!.fighterState().fighterType !== FighterType.Air) {
      return false;
    }
    const currentTarget = this.fighter!.targetUnit();
    if (
      currentTarget !== undefined &&
      currentTarget.isActive() &&
      currentTarget.type() === UnitType.CommercialAircraft &&
      this.canEngagePlayer(currentTarget.owner())
    ) {
      return true;
    }
    return this.findCapturableCommercial() !== undefined;
  }

  private getMoveSpeed(type: FighterType): number {
    const target = this.fighter!.targetUnit();
    if (
      type === FighterType.Air &&
      target !== undefined &&
      target.isActive() &&
      target.type() === UnitType.CommercialAircraft &&
      this.canEngagePlayer(target.owner())
    ) {
      return this.mg!.config().fighterCommercialCaptureSpeed(type);
    }
    return this.mg!.config().fighterSpeed(type);
  }

  private getMoveSteps(type: FighterType): number {
    this.moveSpeedRemainder += this.getMoveSpeed(type);
    const steps = Math.floor(this.moveSpeedRemainder);
    this.moveSpeedRemainder -= steps;
    return steps;
  }

  private moveToward(target: TileRef, type: FighterType): void {
    const steps = this.getMoveSteps(type);
    for (let i = 0; i < steps; i++) {
      const result = this.pathfinder!.next(this.fighter!.tile(), target);
      if (result.status === PathStatus.NOT_FOUND) {
        this.fighter!.setTargetTile(undefined);
        return;
      }
      this.fighter!.move(result.node);
      if (result.status === PathStatus.COMPLETE) return;
    }
  }

  private orbitAround(target: TileRef): void {
    const state = this.fighter!.fighterState();
    const radius = this.mg!.config().fighterOrbitRadius(state.fighterType);
    const steps = this.getMoveSteps(state.fighterType);
    if (steps <= 0) return;

    const seed = this.mg!.ticks() + this.fighter!.id();
    for (let step = 0; step < steps; step++) {
      let moved = false;
      for (let i = 0; i < CIRCLE_DIRECTIONS.length; i++) {
        const index = (seed + i) % CIRCLE_DIRECTIONS.length;
        const [dx, dy] = CIRCLE_DIRECTIONS[index];
        const x = this.mg!.x(target) + Math.round((dx * radius) / 8);
        const y = this.mg!.y(target) + Math.round((dy * radius) / 8);
        if (!this.mg!.isValidCoord(x, y)) continue;
        const waypoint = this.mg!.ref(x, y);
        const result = this.pathfinder!.next(this.fighter!.tile(), waypoint);
        if (
          result.status !== PathStatus.NEXT &&
          result.status !== PathStatus.COMPLETE
        ) {
          continue;
        }
        this.fighter!.setTargetTile(waypoint);
        this.fighter!.move(result.node);
        moved = true;
        break;
      }
      if (!moved) break;
    }
  }

  private patrol(): void {
    if (this.fighter!.targetUnit() !== undefined) {
      this.fighter!.setTargetUnit(undefined);
    }
    const state = this.fighter!.fighterState();
    this.orbitAround(state.patrolTile);
  }

  private tickFuel(): void {
    const remaining = this.fighter!.fighterState().fuel - 1;
    if (remaining <= 0) {
      this.fighter!.updateFighterState({ state: "crashed", fuel: 0 });
      this.fighter!.delete(true, this.fighter!.owner());
      this.active = false;
      return;
    }
    this.fighter!.updateFighterState({ fuel: remaining });
  }

  isActive(): boolean {
    return this.active && this.fighter !== undefined && this.fighter.isActive();
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return FighterExecutionSnapshot.write({
      active: this.active,
      input: isUnit(this.input)
        ? { unit: w.unit(this.input) }
        : {
            owner: w.player(this.input.owner),
            fighterType: this.input.fighterType,
            patrolTile: this.input.patrolTile,
          },
      initialized: this.mg !== undefined,
      fighter: this.fighter === undefined ? null : w.unit(this.fighter),
      pathfinder:
        this.pathfinder === undefined
          ? null
          : airPathFinderState(this.pathfinder),
      random: this.random === undefined ? null : w.random(this.random),
      moveSpeedRemainder: this.moveSpeedRemainder,
      lastObservedPatrolTile: this.lastObservedPatrolTile,
      lastManualMoveTickRetreatDisabled: this.lastManualMoveTickRetreatDisabled,
      lastEmittedCombat: this.lastEmittedCombat,
    });
  }

  restoreSnapshot(s: FighterExecutionState, r: SnapshotReader): void {
    this.active = s.active;
    this.input =
      "unit" in s.input
        ? r.unit(s.input.unit)
        : {
            owner: r.player(s.input.owner),
            fighterType: s.input.fighterType,
            patrolTile: s.input.patrolTile,
          };
    if (s.initialized) this.mg = r.game;
    this.fighter = r.unitOrNull(s.fighter) ?? undefined;
    if (s.pathfinder !== null) {
      this.pathfinder = restoreAirPathFinder(r.game, s.pathfinder);
    }
    if (s.random !== null) this.random = r.random(s.random);
    this.moveSpeedRemainder = s.moveSpeedRemainder;
    this.lastObservedPatrolTile = s.lastObservedPatrolTile;
    this.lastManualMoveTickRetreatDisabled =
      s.lastManualMoveTickRetreatDisabled;
    this.lastEmittedCombat = s.lastEmittedCombat;
  }
}

const FighterExecutionStateSchema = z.object({
  active: z.boolean(),
  input: z.union([
    z.object({ unit: zRef() }),
    z.object({
      owner: zPlayerRef(),
      fighterType: z.enum(FighterType),
      patrolTile: zTile(),
    }),
  ]),
  initialized: z.boolean(),
  fighter: zRef().nullable(),
  pathfinder: AirPathFinderSchema.nullable(),
  random: zRandom().nullable(),
  moveSpeedRemainder: z.number(),
  lastObservedPatrolTile: zTile().optional(),
  lastManualMoveTickRetreatDisabled: zInt().default(0),
  lastEmittedCombat: z.boolean().default(false),
});
type FighterExecutionState = z.infer<typeof FighterExecutionStateSchema>;

export const FighterExecutionSnapshot = execSnapshotType({
  name: "Fighter",
  version: 1,
  schema: FighterExecutionStateSchema,
  cls: () => FighterExecution,
});
