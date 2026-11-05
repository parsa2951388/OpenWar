import {
  Difficulty,
  GameMapType,
  GameMode,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import type { TeamCountConfig } from "@openfront/engine-api/Schemas";
export type OperationsMissionId =
  | "iron-gate"
  | "tidebreaker"
  | "world-command"
  | "sandstorm"
  | "northern-bastion"
  | "pacific-ascendant"
  | "straitbreaker"
  | "southern-cross";
export type OperationsMissionTranslationKey =
  | "iron_gate"
  | "tidebreaker"
  | "world_command"
  | "sandstorm"
  | "northern_bastion"
  | "pacific_ascendant"
  | "straitbreaker"
  | "southern_cross";
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
  /** Total Operations victories required before this mission is available. */ unlockWins: number;
}
/** Playable Operations scenarios using deterministic rules supported by the current engine. */
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
    unlockWins: 0,
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
    unlockWins: 0,
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
    unlockWins: 0,
  },
  {
    id: "sandstorm",
    translationKey: "sandstorm",
    map: GameMapType.Africa,
    difficulty: Difficulty.Hard,
    gameMode: GameMode.Team,
    teamCount: 2,
    timeLimitMinutes: 16,
    winThresholdTenths: 640,
    bots: 140,
    disableNukes: true,
    disableAlliances: false,
    unlockWins: 1,
  },
  {
    id: "northern-bastion",
    translationKey: "northern_bastion",
    map: GameMapType.Arctic,
    difficulty: Difficulty.Impossible,
    gameMode: GameMode.FFA,
    teamCount: 2,
    timeLimitMinutes: 18,
    winThresholdTenths: 600,
    bots: 180,
    disableNukes: true,
    disableAlliances: true,
    unlockWins: 2,
  },
  {
    id: "pacific-ascendant",
    translationKey: "pacific_ascendant",
    map: GameMapType.Oceania,
    difficulty: Difficulty.Impossible,
    gameMode: GameMode.Team,
    teamCount: 2,
    timeLimitMinutes: 22,
    winThresholdTenths: 550,
    bots: 220,
    disableNukes: false,
    disableAlliances: false,
    unlockWins: 3,
  },
  {
    id: "straitbreaker",
    translationKey: "straitbreaker",
    map: GameMapType.MiddleEast,
    difficulty: Difficulty.Hard,
    gameMode: GameMode.FFA,
    teamCount: 2,
    timeLimitMinutes: 20,
    winThresholdTenths: 620,
    bots: 170,
    disableNukes: true,
    disableAlliances: true,
    unlockWins: 2,
  },
  {
    id: "southern-cross",
    translationKey: "southern_cross",
    map: GameMapType.SouthAmerica,
    difficulty: Difficulty.Impossible,
    gameMode: GameMode.Team,
    teamCount: 2,
    timeLimitMinutes: 21,
    winThresholdTenths: 580,
    bots: 190,
    disableNukes: false,
    disableAlliances: false,
    unlockWins: 4,
  },
] as const;
export function getOperationsMission(
  id: string,
): OperationsMissionPreset | undefined {
  return OPERATIONS_MISSIONS.find((m) => m.id === id);
}
export function isValidOperationsMissionPreset(
  m: OperationsMissionPreset,
): boolean {
  return (
    Number.isInteger(m.timeLimitMinutes) &&
    m.timeLimitMinutes >= 1 &&
    m.timeLimitMinutes <= 120 &&
    Number.isInteger(m.winThresholdTenths) &&
    m.winThresholdTenths >= 100 &&
    m.winThresholdTenths <= 999 &&
    Number.isInteger(m.bots) &&
    m.bots >= 0 &&
    m.bots <= 400 &&
    Object.values(GameMapType).includes(m.map) &&
    Object.values(Difficulty).includes(m.difficulty) &&
    Object.values(GameMode).includes(m.gameMode) &&
    typeof m.disableNukes === "boolean" &&
    typeof m.disableAlliances === "boolean" &&
    typeof m.id === "string" &&
    m.id.length > 0 &&
    Number.isInteger(m.unlockWins) &&
    m.unlockWins >= 0 &&
    m.unlockWins <= 20
  );
}
export const OPERATIONS_NON_NUCLEAR_UNITS: readonly UnitType[] = [
  UnitType.AtomBomb,
  UnitType.HydrogenBomb,
  UnitType.MIRV,
  UnitType.MissileSilo,
] as const;
