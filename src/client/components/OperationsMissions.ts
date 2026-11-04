import {
  Difficulty,
  GameMapType,
  GameMode,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import type { TeamCountConfig } from "@openfront/engine-api/Schemas";

export type OperationsMissionId = "iron-gate" | "tidebreaker" | "world-command";

/**
 * A playable Operations alpha scenario built from the deterministic rules
 * already supported by the core game. It does not pretend to enable
 * unimplemented logistics, fog-of-war, convoy, or capture-point systems.
 */
export type OperationsMissionTranslationKey =
  | "iron_gate"
  | "tidebreaker"
  | "world_command";

export interface OperationsMissionPreset {
  id: OperationsMissionId;
  translationKey: OperationsMissionTranslationKey;
  map: GameMapType;
  difficulty: Difficulty;
  gameMode: GameMode;
  teamCount: TeamCountConfig;
  timeLimitMinutes: number;
  winThresholdTenths: number;
  bots: number;
  disableNukes: boolean;
  disableAlliances: boolean;
}

export const OPERATIONS_MISSIONS: readonly OperationsMissionPreset[] = [
  {
    id: "iron-gate",
    translationKey: "iron_gate",
    map: GameMapType.Europe,
    difficulty: Difficulty.Hard,
    gameMode: GameMode.FFA,
    teamCount: 2,
    timeLimitMinutes: 15,
    winThresholdTenths: 650,
    bots: 120,
    disableNukes: true,
    disableAlliances: true,
  },
  {
    id: "tidebreaker",
    translationKey: "tidebreaker",
    map: GameMapType.Asia,
    difficulty: Difficulty.Hard,
    gameMode: GameMode.Team,
    teamCount: 2,
    timeLimitMinutes: 18,
    winThresholdTenths: 600,
    bots: 150,
    disableNukes: true,
    disableAlliances: false,
  },
  {
    id: "world-command",
    translationKey: "world_command",
    map: GameMapType.World,
    difficulty: Difficulty.Impossible,
    gameMode: GameMode.FFA,
    teamCount: 2,
    timeLimitMinutes: 22,
    winThresholdTenths: 550,
    bots: 220,
    disableNukes: false,
    disableAlliances: true,
  },
] as const;

export function getOperationsMission(
  id: string,
): OperationsMissionPreset | undefined {
  return OPERATIONS_MISSIONS.find((mission) => mission.id === id);
}

export function isValidOperationsMissionPreset(
  mission: OperationsMissionPreset,
): boolean {
  return (
    Number.isInteger(mission.timeLimitMinutes) &&
    mission.timeLimitMinutes >= 1 &&
    mission.timeLimitMinutes <= 120 &&
    Number.isInteger(mission.winThresholdTenths) &&
    mission.winThresholdTenths >= 100 &&
    mission.winThresholdTenths <= 999 &&
    Number.isInteger(mission.bots) &&
    mission.bots >= 0 &&
    mission.bots <= 400 &&
    Object.values(GameMapType).includes(mission.map) &&
    Object.values(Difficulty).includes(mission.difficulty) &&
    Object.values(GameMode).includes(mission.gameMode) &&
    typeof mission.disableNukes === "boolean" &&
    typeof mission.disableAlliances === "boolean" &&
    typeof mission.id === "string" &&
    mission.id.length > 0
  );
}

/** Units hidden for the non-nuclear Operations scenarios. */
export const OPERATIONS_NON_NUCLEAR_UNITS: readonly UnitType[] = [
  UnitType.AtomBomb,
  UnitType.HydrogenBomb,
  UnitType.MIRV,
  UnitType.MissileSilo,
] as const;
