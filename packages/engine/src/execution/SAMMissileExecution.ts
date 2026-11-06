import { TileRef } from "@openfront/engine-api/game/GameMap";
import { MessageType, UnitType } from "@openfront/engine-api/game/GameTypes";
import { NukeType } from "@openfront/engine-api/StatsSchemas";
import {
  zNum,
  zPlayerRef,
  zRef,
  zTile,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Player, Unit } from "../game/Game";
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

const INTERCEPTED_UNIT_TRANSLATION_KEYS: Partial<Record<UnitType, string>> = {
  [UnitType.AtomBomb]: "unit_type.atom_bomb",
  [UnitType.HydrogenBomb]: "unit_type.hydrogen_bomb",
  [UnitType.MIRVWarhead]: "unit_type.mirv",
  [UnitType.Aircraft]: "unit_type.aircraft",
};

export class SAMMissileExecution implements Execution {
  private active = true;
  private pathFinder: SteppingPathFinder<TileRef>;
  private SAMMissile: Unit | undefined;
  private mg: Game;
  private speed: number = 0;

  constructor(
    private spawn: TileRef,
    private _owner: Player,
    private ownerUnit: Unit,
    private target: Unit,
    private targetTile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.pathFinder = PathFinding.Air(mg);
    this.mg = mg;
    this.speed = this.mg.config().defaultSamMissileSpeed();
    this.tick(ticks);
  }

  tick(ticks: number): void {
    this.SAMMissile ??= this._owner.buildUnit(UnitType.SAMMissile, this.spawn, {
      targetUnit: this.target,
    });
    if (!this.SAMMissile.isActive()) {
      this.active = false;
      return;
    }
    // The MIRV carrier itself can't be intercepted, only its warheads.
    // Aircraft are also valid SAM targets.
    const nukesWhitelist = [
      UnitType.AtomBomb,
      UnitType.HydrogenBomb,
      UnitType.MIRVWarhead,
    ];
    const isAircraft = this.target.type() === UnitType.Aircraft;
    const isNuke = nukesWhitelist.includes(this.target.type());
    if (
      !this.target.isActive() ||
      !this.ownerUnit.isActive() ||
      this.target.owner() === this.SAMMissile.owner() ||
      (!isNuke && !isAircraft)
    ) {
      if (this.target.isActive()) {
        if (isAircraft) this.target.setTargetable(true);
        else if (isNuke) this.target.setTargetedBySAM(false);
      }
      this.SAMMissile.delete(false);
      this.active = false;
      return;
    }

    // Aircraft keep moving while the SAM missile is in flight. Refresh the
    // destination each tick so the interceptor follows the live target instead
    // of applying damage at a stale launch-time coordinate.
    if (isAircraft) this.targetTile = this.target.tile();

    for (let i = 0; i < this.speed; i++) {
      const result = this.pathFinder.next(
        this.SAMMissile.tile(),
        this.targetTile,
      );
      if (result.status === PathStatus.COMPLETE) {
        this.mg.displayMessage(
          isAircraft
            ? "events_display.aircraft_shot_down"
            : "events_display.missile_intercepted",
          MessageType.SAM_HIT,
          this._owner.id(),
          undefined,
          isAircraft
            ? {}
            : {
                unit:
                  INTERCEPTED_UNIT_TRANSLATION_KEYS[this.target.type()] ??
                  this.target.type(),
              },
        );
        this.active = false;
        if (isAircraft) {
          this.target.modifyHealth(-this.target.health(), this._owner);
          if (this.target.isActive()) this.target.setTargetable(true);
        } else {
          this.target.delete(true, this._owner);
          // Record stats for intercepted bombs only.
          this.mg
            .stats()
            .bombIntercept(this._owner, this.target.type() as NukeType, 1);
        }
        this.SAMMissile.delete(false);
        return;
      } else if (result.status === PathStatus.NEXT) {
        this.SAMMissile.move(result.node);
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return SAMMissileExecutionSnapshot.write({
      active: this.active,
      // mg and the pathfinder are both set by init.
      pathFinder:
        this.mg === undefined ? null : airPathFinderState(this.pathFinder),
      missile: this.SAMMissile === undefined ? null : w.unit(this.SAMMissile),
      speed: this.speed,
      spawn: this.spawn,
      owner: w.player(this._owner),
      ownerUnit: w.unit(this.ownerUnit),
      target: w.unit(this.target),
      targetTile: this.targetTile,
    });
  }

  restoreSnapshot(s: SAMMissileState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.pathFinder !== null) {
      this.mg = r.game;
      this.pathFinder = restoreAirPathFinder(r.game, s.pathFinder);
    }
    if (s.missile !== null) this.SAMMissile = r.unit(s.missile);
    this.speed = s.speed;
    this.spawn = s.spawn;
    this._owner = r.player(s.owner);
    this.ownerUnit = r.unit(s.ownerUnit);
    this.target = r.unit(s.target);
    this.targetTile = s.targetTile;
  }
}

const SAMMissileStateSchema = z.object({
  active: z.boolean(),
  pathFinder: AirPathFinderSchema.nullable(),
  missile: zRef().nullable(),
  speed: zNum(),
  spawn: zTile(),
  owner: zPlayerRef(),
  ownerUnit: zRef(),
  target: zRef(),
  targetTile: zTile(),
});
type SAMMissileState = z.infer<typeof SAMMissileStateSchema>;

export const SAMMissileExecutionSnapshot = execSnapshotType({
  name: "SAMMissile",
  version: 1,
  schema: SAMMissileStateSchema,
  cls: () => SAMMissileExecution,
});
