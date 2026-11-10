import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import {
  zInt,
  zRandom,
  zRef,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Unit } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";
import { CommercialAircraftExecution } from "./CommercialAircraftExecution";
import { TrainStationExecution } from "./TrainStationExecution";

export class AirportExecution implements Execution {
  private active = true;
  private mg: Game;
  private airport: Unit;
  private random: PseudoRandom;
  private checkOffset: number;
  private commercialSpawnRejections = 0;
  private cachedTradingAirports: Unit[] = [];
  private nextTradingAirportsRefreshTick = 0;
  private readonly tradingAirportRefreshInterval = 50;

  constructor(airport: Unit) {
    this.airport = airport;
  }

  init(mg: Game, _ticks: number): void {
    this.mg = mg;
    this.random = new PseudoRandom(mg.ticks());
    this.checkOffset = mg.ticks() % 10;
  }

  tick(_ticks: number): void {
    if (!this.airport.isActive()) {
      this.active = false;
      return;
    }
    if (this.airport.isUnderConstruction()) return;
    if (!this.airport.hasTrainStation()) this.createStation();

    if ((this.mg.ticks() + this.checkOffset) % 10 !== 0) return;
    if (!this.shouldSpawnCommercialAircraft()) return;

    const candidates = this.tradingAirports();
    if (candidates.length === 0) return;
    const target = candidates[this.random.nextInt(0, candidates.length)];
    if (target === undefined || target === this.airport) return;

    this.mg.addExecution(
      new CommercialAircraftExecution(
        this.airport.owner(),
        this.airport,
        target,
      ),
    );
  }

  private shouldSpawnCommercialAircraft(): boolean {
    const aircraftCount = this.mg.unitCount(UnitType.CommercialAircraft);
    const rate = this.mg
      .config()
      .commercialAircraftSpawnRate(
        this.commercialSpawnRejections,
        aircraftCount,
      );

    for (let i = 0; i < this.airport.level(); i++) {
      if (this.random.chance(rate)) {
        this.commercialSpawnRejections = 0;
        return true;
      }
      this.commercialSpawnRejections++;
    }
    return false;
  }

  private createStation(): void {
    if (
      this.mg.hasUnitNearby(
        this.airport.tile(),
        this.mg.config().trainStationMaxRange(),
        UnitType.Factory,
      )
    ) {
      this.mg.addExecution(new TrainStationExecution(this.airport));
    }
  }

  private tradingAirports(): Unit[] {
    const now = this.mg.ticks();
    if (now < this.nextTradingAirportsRefreshTick) {
      return this.cachedTradingAirports;
    }

    const owner = this.airport.owner();
    const airports = this.mg
      .players()
      .filter(
        (player) =>
          player !== owner &&
          player.canTrade(owner) &&
          !this.mg.config().isUnitDisabled(UnitType.CommercialAircraft),
      )
      .flatMap((player) => player.units(UnitType.Airport))
      .filter((airport) => airport.isActive() && !airport.isUnderConstruction())
      .sort(
        (a, b) =>
          this.mg.manhattanDist(this.airport.tile(), a.tile()) -
          this.mg.manhattanDist(this.airport.tile(), b.tile()),
      );

    const weighted: Unit[] = [];
    for (const [index, destination] of airports.entries()) {
      const copies =
        destination.level() *
        (1 + Number(owner.isFriendly(destination.owner())) + Number(index < 3));
      for (let i = 0; i < copies; i++) weighted.push(destination);
    }

    this.cachedTradingAirports = weighted;
    this.nextTradingAirportsRefreshTick =
      now + this.tradingAirportRefreshInterval;
    return this.cachedTradingAirports;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    const initialized = this.mg !== undefined;
    return AirportExecutionSnapshot.write({
      active: this.active,
      airport: w.unit(this.airport),
      init: initialized
        ? { random: w.random(this.random), checkOffset: this.checkOffset }
        : null,
      commercialSpawnRejections: this.commercialSpawnRejections,
      cachedTradingAirports: this.cachedTradingAirports.map((unit) =>
        w.unit(unit),
      ),
      nextTradingAirportsRefreshTick: this.nextTradingAirportsRefreshTick,
    });
  }

  restoreSnapshot(s: AirportState, r: SnapshotReader): void {
    this.active = s.active;
    this.airport = r.unit(s.airport);
    this.commercialSpawnRejections = s.commercialSpawnRejections;
    this.cachedTradingAirports = s.cachedTradingAirports.map((unit) =>
      r.unit(unit),
    );
    this.nextTradingAirportsRefreshTick = s.nextTradingAirportsRefreshTick;
    if (s.init !== null) {
      this.mg = r.game;
      this.random = r.random(s.init.random);
      this.checkOffset = s.init.checkOffset;
    }
  }
}

const AirportStateSchema = z.object({
  active: z.boolean(),
  airport: zRef(),
  init: z.object({ random: zRandom(), checkOffset: zInt() }).nullable(),
  commercialSpawnRejections: zInt(),
  cachedTradingAirports: z.array(zRef()).default([]),
  nextTradingAirportsRefreshTick: zInt().default(0),
});
type AirportState = z.infer<typeof AirportStateSchema>;

export const AirportExecutionSnapshot = execSnapshotType({
  name: "Airport",
  version: 1,
  schema: AirportStateSchema,
  cls: () => AirportExecution,
});
