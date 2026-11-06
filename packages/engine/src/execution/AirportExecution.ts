import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { zInt, zRef } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Unit } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";
import { AircraftExecution } from "./AircraftExecution";

/**
 * One active airframe per completed airport. If an aircraft is destroyed,
 * the airfield produces a replacement after a short cooldown.
 */
export class AirportExecution implements Execution {
  private active = true;
  private mg: Game | undefined;
  private lastSpawnTick = -1_000_000_000;

  constructor(private airport: Unit) {}

  init(mg: Game): void {
    this.mg = mg;
    this.lastSpawnTick = mg.ticks() - mg.config().aircraftSpawnCooldown();
  }

  tick(): void {
    const mg = this.mg;
    if (mg === undefined) throw new Error("AirportExecution not initialized");
    if (!this.airport.isActive()) {
      this.active = false;
      return;
    }
    if (this.airport.isUnderConstruction()) return;

    const owner = this.airport.owner();
    if (!owner.isAlive()) return;

    const readyAirports = owner
      .units(UnitType.Airport)
      .filter((airport) => airport.isActive() && !airport.isUnderConstruction())
      .length;
    if (readyAirports === 0) return;

    const activeAircraft = owner
      .units(UnitType.Aircraft)
      .filter((aircraft) => aircraft.isActive()).length;
    if (activeAircraft >= readyAirports) return;

    if (
      mg.ticks() - this.lastSpawnTick <
      mg.config().aircraftSpawnCooldown()
    ) {
      return;
    }

    const aircraft = owner.buildUnit(UnitType.Aircraft, this.airport.tile(), {});
    mg.addExecution(new AircraftExecution(this.airport, aircraft));
    this.lastSpawnTick = mg.ticks();
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return AirportExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined,
      airport: w.unit(this.airport),
      lastSpawnTick: this.lastSpawnTick,
    });
  }

  restoreSnapshot(s: AirportState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized) this.mg = r.game;
    this.airport = r.unit(s.airport);
    this.lastSpawnTick = s.lastSpawnTick;
  }
}

const AirportStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  airport: zRef(),
  lastSpawnTick: zInt(),
});
type AirportState = z.infer<typeof AirportStateSchema>;

export const AirportExecutionSnapshot = execSnapshotType({
  name: "Airport",
  version: 1,
  schema: AirportStateSchema,
  cls: () => AirportExecution,
});
