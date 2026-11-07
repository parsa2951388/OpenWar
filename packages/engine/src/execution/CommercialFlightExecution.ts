import { TileRef } from "@openfront/engine-api/game/GameMap";
import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { zRef } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Unit } from "../game/Game";
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

/**
 * Deterministic commercial service between two trading partners.
 *
 * One aircraft continuously flies source -> destination -> source. Both
 * airport owners receive a distance-scaled payout when each leg completes.
 * The plane is a normal targetable unit, so hostile aircraft and SAMs can
 * intercept it. The pathfinder and direction are snapshotted for replay-safe
 * continuation.
 */
export class CommercialFlightExecution implements Execution {
  private active = true;
  private mg: Game | undefined;
  private pathFinder: SteppingPathFinder<TileRef> | undefined;
  private returning = false;

  constructor(
    private sourceAirport: Unit,
    private destinationAirport: Unit,
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
      throw new Error("CommercialFlightExecution not initialized");
    }

    if (!this.aircraft.isActive()) {
      this.active = false;
      return;
    }

    if (
      !this.sourceAirport.isActive() ||
      !this.destinationAirport.isActive() ||
      this.sourceAirport.isUnderConstruction() ||
      this.destinationAirport.isUnderConstruction()
    ) {
      this.aircraft.delete(false);
      this.active = false;
      return;
    }

    const sourceOwner = this.sourceAirport.owner();
    const destinationOwner = this.destinationAirport.owner();
    if (
      !sourceOwner.isAlive() ||
      !destinationOwner.isAlive() ||
      !sourceOwner.canTrade(destinationOwner) ||
      mg.config().isUnitDisabled(UnitType.CommercialAircraft)
    ) {
      this.aircraft.delete(false);
      this.active = false;
      return;
    }

    // Airport ownership is authoritative if a border capture changes hands
    // while the flight is in progress.
    if (this.aircraft.owner() !== sourceOwner) {
      this.aircraft.setOwner(sourceOwner);
    }

    const targetAirport = this.returning
      ? this.sourceAirport
      : this.destinationAirport;
    const result = pathFinder.next(this.aircraft.tile(), targetAirport.tile());

    switch (result.status) {
      case PathStatus.NEXT:
        this.aircraft.move(result.node);
        return;
      case PathStatus.COMPLETE: {
        const distance = mg.manhattanDist(
          this.sourceAirport.tile(),
          this.destinationAirport.tile(),
        );
        const sourceGold = mg
          .config()
          .commercialFlightGold(distance, sourceOwner);
        const destinationGold = mg
          .config()
          .commercialFlightGold(distance, destinationOwner);

        sourceOwner.addGold(sourceGold, this.sourceAirport.tile());
        destinationOwner.addGold(
          destinationGold,
          this.destinationAirport.tile(),
        );
        sourceOwner.addTradeGold(sourceGold);
        destinationOwner.addTradeGold(destinationGold);

        this.returning = !this.returning;
        pathFinder.invalidate();
        return;
      }
      case PathStatus.NOT_FOUND:
        this.aircraft.delete(false);
        this.active = false;
        return;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return CommercialFlightExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined && this.pathFinder !== undefined,
      sourceAirport: w.unit(this.sourceAirport),
      destinationAirport: w.unit(this.destinationAirport),
      aircraft: w.unit(this.aircraft),
      returning: this.returning,
      pathFinder:
        this.pathFinder === undefined
          ? null
          : airPathFinderState(this.pathFinder),
    });
  }

  restoreSnapshot(s: CommercialFlightState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized && s.pathFinder !== null) {
      this.mg = r.game;
      this.pathFinder = restoreAirPathFinder(r.game, s.pathFinder);
    }
    this.sourceAirport = r.unit(s.sourceAirport);
    this.destinationAirport = r.unit(s.destinationAirport);
    this.aircraft = r.unit(s.aircraft);
    this.returning = s.returning;
  }
}

const CommercialFlightStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  sourceAirport: zRef(),
  destinationAirport: zRef(),
  aircraft: zRef(),
  returning: z.boolean(),
  pathFinder: AirPathFinderSchema.nullable(),
});
type CommercialFlightState = z.infer<typeof CommercialFlightStateSchema>;

export const CommercialFlightExecutionSnapshot = execSnapshotType({
  name: "CommercialFlight",
  version: 1,
  schema: CommercialFlightStateSchema,
  cls: () => CommercialFlightExecution,
});
