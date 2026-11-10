import { TileRef } from "@openfront/engine-api/game/GameMap";
import { MessageType, UnitType } from "@openfront/engine-api/game/GameTypes";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import {
  zInt,
  zNum,
  zPlayerRef,
  zRandom,
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

const FLARE_EVASION_TYPES = new Set<UnitType>([
  UnitType.StealthFighter,
  UnitType.GroundAttacker,
  UnitType.AirFighter,
]);

/** Air-to-air missile flight, represented by the same moving Shell entity as the source Worker. */
export class FighterAamExecution implements Execution {
  private active = true;
  private completed = false;
  private mg: Game | undefined;
  private shell: Unit | undefined;
  private pathfinder: SteppingPathFinder<TileRef> | undefined;
  private random: PseudoRandom | undefined;
  private destroyAtTick = -1;

  constructor(
    private spawn: TileRef,
    private owner: Player,
    private launchingFighter: Unit,
    private target: Unit,
    private damage: number,
    private flareEvasion: boolean,
  ) {}

  init(mg: Game, _ticks: number): void {
    this.mg = mg;
    this.pathfinder = PathFinding.Air(mg);
    this.random = new PseudoRandom(mg.ticks());
  }

  private finish(): void {
    if (this.completed) return;
    this.completed = true;
    this.active = false;
    this.mg?.clearFighterAamTarget(
      this.launchingFighter.id(),
      this.target.id(),
    );
  }

  tick(): void {
    const mg = this.mg;
    const pathfinder = this.pathfinder;
    if (!this.active || mg === undefined || pathfinder === undefined) return;

    this.shell ??= this.owner.buildUnit(UnitType.Shell, this.spawn, {});
    if (!this.shell.isActive()) {
      this.finish();
      return;
    }

    if (
      !this.target.isActive() ||
      this.target.owner() === this.shell.owner() ||
      (this.destroyAtTick !== -1 && mg.ticks() >= this.destroyAtTick)
    ) {
      this.shell.delete(false);
      this.finish();
      return;
    }

    if (this.destroyAtTick === -1 && !this.launchingFighter.isActive()) {
      this.destroyAtTick = mg.ticks() + mg.config().shellLifetime();
    }

    for (let i = 0; i < 3; i++) {
      const result = pathfinder.next(this.shell.tile(), this.target.tile());
      if (result.status === PathStatus.NOT_FOUND) {
        this.shell.delete(false);
        this.finish();
        return;
      }
      if (result.status === PathStatus.COMPLETE) {
        if (this.tryFlareEvasion()) {
          this.shell.delete(false);
          this.finish();
          return;
        }
        this.target.modifyHealth(-this.damage, this.owner);
        this.shell.setReachedTarget();
        this.shell.delete(false);
        this.finish();
        return;
      }
      if (result.status === PathStatus.NEXT) {
        this.shell.move(result.node);
      }
    }
  }

  private tryFlareEvasion(): boolean {
    const mg = this.mg;
    const random = this.random;
    if (
      !this.flareEvasion ||
      !FLARE_EVASION_TYPES.has(this.target.type()) ||
      mg === undefined ||
      random === undefined
    ) {
      return false;
    }

    const state = this.target.fighterState();
    if (state.flares <= 0) return false;
    this.target.updateFighterState({ flares: state.flares - 1 });
    if (!random.chance(mg.config().fighterFlareEvasionOdds())) return false;

    mg.displayMessage(
      "events_display.missile_evaded_by_flares",
      MessageType.SAM_MISS,
      this.target.owner().id(),
    );
    return true;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return FighterAamExecutionSnapshot.write({
      active: this.active,
      completed: this.completed,
      init:
        this.mg === undefined ||
        this.pathfinder === undefined ||
        this.random === undefined
          ? null
          : {
              pathfinder: airPathFinderState(this.pathfinder),
              random: w.random(this.random),
            },
      shell: this.shell === undefined ? null : w.unit(this.shell),
      spawn: this.spawn,
      owner: w.player(this.owner),
      launchingFighter: w.unit(this.launchingFighter),
      target: w.unit(this.target),
      damage: this.damage,
      flareEvasion: this.flareEvasion,
      destroyAtTick: this.destroyAtTick,
    });
  }

  restoreSnapshot(s: FighterAamState, r: SnapshotReader): void {
    this.active = s.active;
    this.completed = s.completed;
    if (s.init !== null) {
      this.mg = r.game;
      this.pathfinder = restoreAirPathFinder(r.game, s.init.pathfinder);
      this.random = r.random(s.init.random);
    }
    this.shell = s.shell === null ? undefined : r.unit(s.shell);
    this.spawn = s.spawn;
    this.owner = r.player(s.owner);
    this.launchingFighter = r.unit(s.launchingFighter);
    this.target = r.unit(s.target);
    this.damage = s.damage;
    this.flareEvasion = s.flareEvasion;
    this.destroyAtTick = s.destroyAtTick;

    if (this.active && !this.completed) {
      r.game.reserveFighterAamTarget(
        this.launchingFighter.id(),
        this.target.id(),
      );
    }
  }
}

const FighterAamStateSchema = z.object({
  active: z.boolean(),
  completed: z.boolean().default(false),
  init: z
    .object({
      pathfinder: AirPathFinderSchema,
      random: zRandom(),
    })
    .nullable(),
  shell: zRef().nullable(),
  spawn: zTile(),
  owner: zPlayerRef(),
  launchingFighter: zRef(),
  target: zRef(),
  damage: zNum(),
  flareEvasion: z.boolean(),
  destroyAtTick: zInt(),
});
type FighterAamState = z.infer<typeof FighterAamStateSchema>;

export const FighterAamExecutionSnapshot = execSnapshotType({
  name: "FighterAAM",
  version: 1,
  schema: FighterAamStateSchema,
  cls: () => FighterAamExecution,
});
