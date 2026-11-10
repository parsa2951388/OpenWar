import { TileRef } from "@openfront/engine-api/game/GameMap";
import { MessageType, UnitType } from "@openfront/engine-api/game/GameTypes";
import {
  zNum,
  zPlayerRef,
  zTile,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

const BLAST_IMMUNE_TYPES = new Set<UnitType>([
  UnitType.AtomBomb,
  UnitType.HydrogenBomb,
  UnitType.MIRV,
  UnitType.MIRVWarhead,
  UnitType.SAMMissile,
  UnitType.AirMissile,
  UnitType.StealthFighter,
  UnitType.GroundAttacker,
  UnitType.AirFighter,
  UnitType.CommercialAircraft,
  UnitType.TradeShip,
]);

const STRUCTURE_TYPES: readonly UnitType[] = [
  UnitType.Airport,
  UnitType.City,
  UnitType.DefensePost,
  UnitType.Factory,
  UnitType.MissileSilo,
  UnitType.Port,
  UnitType.SAMLauncher,
];

export class FighterBombExecution implements Execution {
  private active = true;
  private exploded = false;
  private mg: Game | undefined;

  constructor(
    private player: Player,
    private targetTile: TileRef,
    private bombRadius: number,
    private notifyDefender = true,
  ) {}

  init(mg: Game): void {
    this.mg = mg;
  }

  tick(): void {
    if (!this.active) return;
    if (this.exploded) {
      this.active = false;
      return;
    }
    const mg = this.mg;
    if (mg === undefined) {
      this.active = false;
      return;
    }

    const defender = mg.owner(this.targetTile);
    if (this.notifyDefender && defender.isPlayer()) {
      mg.displayMessage(
        "events_display.bomb_dropped",
        MessageType.BOMB_DROPPED,
        defender.id(),
      );
    }

    const damageableTypes = (Object.values(UnitType) as UnitType[]).filter(
      (type) => !BLAST_IMMUNE_TYPES.has(type),
    );
    for (const { unit } of mg.nearbyUnits(
      this.targetTile,
      this.bombRadius,
      damageableTypes,
    )) {
      if (!unit.isActive()) continue;
      unit.delete(true, this.player);
    }

    for (const type of STRUCTURE_TYPES) {
      for (const { unit } of mg.nearbyUnits(
        this.targetTile,
        this.bombRadius + 8,
        type,
      )) {
        unit.touch();
      }
    }
    this.exploded = true;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return FighterBombExecutionSnapshot.write({
      active: this.active,
      exploded: this.exploded,
      player: w.player(this.player),
      targetTile: this.targetTile,
      bombRadius: this.bombRadius,
      notifyDefender: this.notifyDefender,
    });
  }

  restoreSnapshot(s: FighterBombState, r: SnapshotReader): void {
    this.active = s.active;
    this.exploded = s.exploded;
    this.player = r.player(s.player);
    this.targetTile = s.targetTile;
    this.bombRadius = s.bombRadius;
    this.notifyDefender = s.notifyDefender;
    this.mg = r.game;
  }
}

const FighterBombStateSchema = z.object({
  active: z.boolean(),
  exploded: z.boolean().default(false),
  player: zPlayerRef(),
  targetTile: zTile(),
  bombRadius: zNum(),
  notifyDefender: z.boolean(),
});
type FighterBombState = z.infer<typeof FighterBombStateSchema>;

export const FighterBombExecutionSnapshot = execSnapshotType({
  name: "FighterBomb",
  version: 1,
  schema: FighterBombStateSchema,
  cls: () => FighterBombExecution,
});
