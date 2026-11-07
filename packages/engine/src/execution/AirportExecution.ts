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
import { CommercialFlightExecution } from "./CommercialFlightExecution";

/**
 * An active airport maintains one defensive aircraft and one commercial
 * service slot per completed airfield. Commercial flights only connect live
 * airports whose owners can trade, and the global owner cap prevents an
 * airport-rich player from spawning an unbounded fleet.
 */
export class AirportExecution implements Execution {
  private active = true;
  private mg: Game | undefined;
  private lastSpawnTick = -1_000_000_000;
  private lastCommercialFlightTick = -1_000_000_000;

  constructor(private airport: Unit) {}

  init(mg: Game): void {
    this.mg = mg;
    this.lastSpawnTick = mg.ticks() - mg.config().aircraftSpawnCooldown();
    this.lastCommercialFlightTick =
      mg.ticks() - mg.config().commercialFlightSpawnCooldown();
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
      .filter(
        (airport) => airport.isActive() && !airport.isUnderConstruction(),
      ).length;
    if (readyAirports === 0) return;

    const tick = mg.ticks();

    if (
      !mg.config().isUnitDisabled(UnitType.Aircraft) &&
      owner.units(UnitType.Aircraft).filter((aircraft) => aircraft.isActive())
        .length < readyAirports &&
      tick - this.lastSpawnTick >= mg.config().aircraftSpawnCooldown()
    ) {
      const aircraft = owner.buildUnit(
        UnitType.Aircraft,
        this.airport.tile(),
        {},
      );
      mg.addExecution(new AircraftExecution(this.airport, aircraft));
      this.lastSpawnTick = tick;
    }

    this.spawnCommercialFlight(mg, owner, readyAirports, tick);
  }

  private spawnCommercialFlight(
    mg: Game,
    owner: ReturnType<Unit["owner"]>,
    readyAirports: number,
    tick: number,
  ): void {
    if (mg.config().isUnitDisabled(UnitType.CommercialAircraft)) return;
    if (
      tick - this.lastCommercialFlightTick <
      mg.config().commercialFlightSpawnCooldown()
    ) {
      return;
    }

    const activeFlights = owner
      .units(UnitType.CommercialAircraft)
      .filter((aircraft) => aircraft.isActive()).length;
    if (activeFlights >= readyAirports) return;

    const destinations = mg
      .players()
      .filter(
        (player) =>
          player !== owner && player.isAlive() && owner.canTrade(player),
      )
      .flatMap((player) => player.units(UnitType.Airport))
      .filter(
        (airport) =>
          airport.isActive() &&
          !airport.isUnderConstruction() &&
          airport.owner().canTrade(owner),
      )
      .sort(
        (left, right) =>
          mg.manhattanDist(this.airport.tile(), left.tile()) -
          mg.manhattanDist(this.airport.tile(), right.tile()),
      );

    if (destinations.length === 0) return;

    // Rotate deterministically through the nearest available trade partners.
    const cycle = Math.floor(
      tick / mg.config().commercialFlightSpawnCooldown(),
    );
    const destination = destinations[cycle % destinations.length] as Unit;

    const aircraft = owner.buildUnit(
      UnitType.CommercialAircraft,
      this.airport.tile(),
      {},
    );
    mg.addExecution(
      new CommercialFlightExecution(this.airport, destination, aircraft),
    );
    this.lastCommercialFlightTick = tick;
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
      lastCommercialFlightTick: this.lastCommercialFlightTick,
    });
  }

  restoreSnapshot(s: AirportState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized) this.mg = r.game;
    this.airport = r.unit(s.airport);
    this.lastSpawnTick = s.lastSpawnTick;
    this.lastCommercialFlightTick = s.lastCommercialFlightTick;
  }
}

const AirportStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  airport: zRef(),
  lastSpawnTick: zInt(),
  lastCommercialFlightTick: zInt(),
});
type AirportState = z.infer<typeof AirportStateSchema>;

export const AirportExecutionSnapshot = execSnapshotType({
  name: "Airport",
  version: 2,
  schema: AirportStateSchema,
  migrations: {
    1: (data) => ({
      ...data,
      lastCommercialFlightTick: -1_000_000_000,
    }),
  },
  cls: () => AirportExecution,
});
