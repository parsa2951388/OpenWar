import { TileRef } from "@openfront/engine-api/game/GameMap";
import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { zInt, zRef } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, isUnit, Unit } from "../game/Game";
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
import { ShellExecution } from "./ShellExecution";

/**
 * Autonomous aircraft patrol the radius around their home airport, attack
 * reachable enemy airfields, aircraft and warships, then return to re-arm.
 * Aircraft are produced by airports; they are not a separate build-menu item.
 */
export class AircraftExecution implements Execution {
  private active = true;
  private mg: Game | undefined;
  private pathFinder: SteppingPathFinder<TileRef> | undefined;
  private target: Unit | undefined;
  private lastStrikeTick = -1_000_000_000;

  constructor(
    private airport: Unit,
    private aircraft: Unit,
  ) {}

  init(mg: Game): void {
    this.mg = mg;
    this.pathFinder = PathFinding.Air(mg);
  }

  tick(): void {
    const mg = this.mg;
    const pathFinder = this.pathFinder;
    if (mg === undefined || pathFinder === undefined) {
      throw new Error("AircraftExecution not initialized");
    }
    if (!this.aircraft.isActive()) {
      this.active = false;
      return;
    }
    if (!this.airport.isActive() || !this.airport.owner().isAlive()) {
      this.aircraft.delete(false);
      this.active = false;
      return;
    }
    if (this.airport.isUnderConstruction()) return;

    // If an airport changes hands, its remaining airframe changes hands too.
    if (this.aircraft.owner() !== this.airport.owner()) {
      this.aircraft.setOwner(this.airport.owner());
    }

    if (this.target !== undefined && !this.isValidTarget(this.target)) {
      this.target = undefined;
    }
    this.target ??= this.findTarget();

    if (this.target !== undefined) {
      const target = this.target;
      const distance = mg.euclideanDistSquared(
        this.aircraft.tile(),
        target.tile(),
      );
      if (distance > 9) {
        const result = pathFinder.next(this.aircraft.tile(), target.tile());
        if (result.status === PathStatus.NEXT) this.aircraft.move(result.node);
        return;
      }

      if (
        mg.ticks() - this.lastStrikeTick >=
        mg.config().aircraftStrikeCooldown()
      ) {
        mg.addExecution(
          new ShellExecution(
            this.aircraft.tile(),
            this.aircraft.owner(),
            this.aircraft,
            target,
          ),
        );
        this.lastStrikeTick = mg.ticks();
      }
      return;
    }

    // No enemy is currently in the operational radius: return to the runway.
    const home = this.airport.tile();
    if (mg.euclideanDistSquared(this.aircraft.tile(), home) > 4) {
      const result = pathFinder.next(this.aircraft.tile(), home);
      if (result.status === PathStatus.NEXT) this.aircraft.move(result.node);
      return;
    }
    if (
      mg.ticks() % 10 === 0 &&
      this.aircraft.health() < this.aircraft.maxHealth()
    ) {
      this.aircraft.modifyHealth(25);
    }
  }

  private findTarget(): Unit | undefined {
    const mg = this.mg!;
    const candidates = mg.nearbyUnits(
      this.airport.tile(),
      mg.config().aircraftRange(),
      [UnitType.Aircraft, UnitType.CommercialAircraft, UnitType.Airport, UnitType.Warship],
      ({ unit }) => isUnit(unit) && this.isValidTarget(unit),
    );
    let best: { unit: Unit; distSquared: number } | undefined;
    for (const candidate of candidates) {
      const unit = candidate.unit;
      if (
        !isUnit(unit) ||
        (best !== undefined && candidate.distSquared >= best.distSquared)
      ) {
        continue;
      }
      best = { unit, distSquared: candidate.distSquared };
    }
    return best?.unit;
  }

  private isValidTarget(unit: Unit): boolean {
    const owner = this.aircraft.owner();
    return (
      unit !== this.aircraft &&
      unit.isActive() &&
      !unit.isUnderConstruction() &&
      unit.hasHealth() &&
      unit.isTargetable() &&
      owner.canAttackPlayer(unit.owner(), true) &&
      this.mg!.euclideanDistSquared(this.airport.tile(), unit.tile()) <=
        this.mg!.config().aircraftRange() ** 2
    );
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return AircraftExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined && this.pathFinder !== undefined,
      airport: w.unit(this.airport),
      aircraft: w.unit(this.aircraft),
      target: this.target === undefined ? null : w.unit(this.target),
      lastStrikeTick: this.lastStrikeTick,
      pathFinder:
        this.pathFinder === undefined
          ? null
          : airPathFinderState(this.pathFinder),
    });
  }

  restoreSnapshot(s: AircraftState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized && s.pathFinder !== null) {
      this.mg = r.game;
      this.pathFinder = restoreAirPathFinder(r.game, s.pathFinder);
    }
    this.airport = r.unit(s.airport);
    this.aircraft = r.unit(s.aircraft);
    this.target = r.unitOrNull(s.target) ?? undefined;
    this.lastStrikeTick = s.lastStrikeTick;
  }
}

const AircraftStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  airport: zRef(),
  aircraft: zRef(),
  target: zRef().nullable(),
  lastStrikeTick: zInt(),
  pathFinder: AirPathFinderSchema.nullable(),
});
type AircraftState = z.infer<typeof AircraftStateSchema>;

export const AircraftExecutionSnapshot = execSnapshotType({
  name: "Aircraft",
  version: 1,
  schema: AircraftStateSchema,
  cls: () => AircraftExecution,
});
