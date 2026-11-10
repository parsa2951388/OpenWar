import { TileRef } from "@openfront/engine-api/game/GameMap";
import { UnitType } from "@openfront/engine-api/game/GameTypes";
import {
  zInt,
  zPlayerRef,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

const FIGHTER_TYPES = [
  UnitType.StealthFighter,
  UnitType.GroundAttacker,
  UnitType.AirFighter,
] as const;

export class MoveFighterExecution implements Execution {
  constructor(
    private owner: Player,
    private unitIds: number[],
    private position: TileRef,
  ) {}

  init(mg: Game, _ticks: number): void {
    if (!mg.isValidRef(this.position)) return;
    const fighters = new Map(
      FIGHTER_TYPES.flatMap((type) =>
        this.owner.units(type).map((unit) => [unit.id(), unit] as const),
      ),
    );

    for (const id of new Set(this.unitIds)) {
      const fighter = fighters.get(id);
      if (!fighter || !fighter.isActive()) continue;
      fighter.updateFighterState({
        state: "patrolling",
        patrolTile: this.position,
        retreatAirbase: undefined,
        refuelSourceUnitId: undefined,
        refuelStartTick: undefined,
        isInCombat: false,
      });
      fighter.setTargetTile(undefined);
      fighter.setTargetUnit(undefined);
    }
  }

  tick(_ticks: number): void {}

  isActive(): boolean {
    return false;
  }

  activeDuringSpawnPhase(): boolean {
    return true;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return MoveFighterExecutionSnapshot.write({
      owner: w.player(this.owner),
      unitIds: this.unitIds,
      position: this.position,
    });
  }

  restoreSnapshot(s: MoveFighterState, r: SnapshotReader): void {
    this.owner = r.player(s.owner);
    this.unitIds = s.unitIds;
    this.position = s.position;
  }
}

const MoveFighterStateSchema = z.object({
  owner: zPlayerRef(),
  unitIds: z.array(zInt()),
  position: zInt(),
});
type MoveFighterState = z.infer<typeof MoveFighterStateSchema>;

export const MoveFighterExecutionSnapshot = execSnapshotType({
  name: "MoveFighter",
  version: 1,
  schema: MoveFighterStateSchema,
  cls: () => MoveFighterExecution,
});
