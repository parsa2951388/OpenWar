import { GameType } from "@openfront/engine-api/game/GameTypes";
import {
  getOperationsMission,
  OPERATIONS_MISSIONS,
  type OperationsMissionId,
  type OperationsMissionPreset,
} from "./OperationsMissions";
export const OPERATIONS_CAMPAIGN_UPDATED_EVENT = "operations-campaign-updated";
export const OPERATIONS_CAMPAIGN_STORAGE_KEY = "openwar.operations.campaign.v1";
export const OPERATIONS_PENDING_MISSION_KEY = "openwar.operations.pending.v1";
const PENDING_MISSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;
export interface OperationsMissionRecord {
  attempts: number;
  wins: number;
  bestStars: 0 | 1 | 2 | 3;
  bestTimeSeconds: number | null;
  lastPlayedAt: number | null;
}
export interface OperationsCampaignProgress {
  version: 1;
  missions: Record<string, OperationsMissionRecord>;
}
export interface OperationsCampaignSummary {
  wins: number;
  stars: number;
  clearedMissions: number;
  totalMissions: number;
}
export interface OperationsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
interface PendingMission {
  missionId: OperationsMissionId;
  createdAt: number;
}
export interface OperationsGameConfigLike {
  gameType?: unknown;
  gameMap?: unknown;
  difficulty?: unknown;
  gameMode?: unknown;
  playerTeams?: unknown;
  maxTimerValue?: unknown;
  winThresholdTenths?: unknown;
  bots?: unknown;
}
const EMPTY_RECORD: OperationsMissionRecord = {
  attempts: 0,
  wins: 0,
  bestStars: 0,
  bestTimeSeconds: null,
  lastPlayedAt: null,
};
function browserStorage(
  kind: "localStorage" | "sessionStorage",
): OperationsStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[kind];
  } catch {
    return null;
  }
}
function emptyProgress(): OperationsCampaignProgress {
  return { version: 1, missions: {} };
}
function safeCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.min(1_000_000, Math.floor(v)))
    : 0;
}
function cleanRecord(value: unknown): OperationsMissionRecord {
  if (!value || typeof value !== "object") return { ...EMPTY_RECORD };
  const raw = value as Record<string, unknown>,
    attempts = safeCount(raw.attempts);
  const bestTime =
    typeof raw.bestTimeSeconds === "number" &&
    Number.isFinite(raw.bestTimeSeconds) &&
    raw.bestTimeSeconds >= 0
      ? Math.floor(raw.bestTimeSeconds)
      : null;
  const lastPlayed =
    typeof raw.lastPlayedAt === "number" &&
    Number.isFinite(raw.lastPlayedAt) &&
    raw.lastPlayedAt >= 0
      ? Math.floor(raw.lastPlayedAt)
      : null;
  return {
    attempts,
    wins: Math.min(safeCount(raw.wins), attempts),
    bestStars: Math.max(0, Math.min(3, safeCount(raw.bestStars))) as
      | 0
      | 1
      | 2
      | 3,
    bestTimeSeconds: bestTime,
    lastPlayedAt: lastPlayed,
  };
}
export function readOperationsCampaignProgress(
  storage: OperationsStorage | null = browserStorage("localStorage"),
): OperationsCampaignProgress {
  if (!storage) return emptyProgress();
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(OPERATIONS_CAMPAIGN_STORAGE_KEY) ?? "null",
    );
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as Record<string, unknown>).version !== 1 ||
      !(parsed as Record<string, unknown>).missions ||
      typeof (parsed as Record<string, unknown>).missions !== "object"
    )
      return emptyProgress();
    const raw = (parsed as { missions: Record<string, unknown> }).missions,
      records: Record<string, OperationsMissionRecord> = {};
    for (const mission of OPERATIONS_MISSIONS)
      records[mission.id] = cleanRecord(raw[mission.id]);
    return { version: 1, missions: records };
  } catch {
    return emptyProgress();
  }
}
export function getOperationsMissionProgress(
  id: OperationsMissionId,
  progress: OperationsCampaignProgress = readOperationsCampaignProgress(),
): OperationsMissionRecord {
  return progress.missions[id] ?? { ...EMPTY_RECORD };
}
export function getOperationsCampaignSummary(
  progress: OperationsCampaignProgress = readOperationsCampaignProgress(),
): OperationsCampaignSummary {
  let wins = 0,
    stars = 0,
    clearedMissions = 0;
  for (const mission of OPERATIONS_MISSIONS) {
    const r = getOperationsMissionProgress(mission.id, progress);
    wins += r.wins;
    stars += r.bestStars;
    if (r.wins > 0) clearedMissions++;
  }
  return {
    wins,
    stars,
    clearedMissions,
    totalMissions: OPERATIONS_MISSIONS.length,
  };
}
export function isOperationsMissionUnlocked(
  mission: OperationsMissionPreset,
  progress: OperationsCampaignProgress = readOperationsCampaignProgress(),
): boolean {
  return getOperationsCampaignSummary(progress).wins >= mission.unlockWins;
}
/**
 * Picks the first unlocked mission that has not been cleared yet. Once the
 * campaign is fully cleared, falls back to the first available mission so the
 * primary Operations action remains useful as a replay entry point.
 */
export function getRecommendedOperationsMission(
  progress: OperationsCampaignProgress = readOperationsCampaignProgress(),
): OperationsMissionPreset | undefined {
  const unlocked = OPERATIONS_MISSIONS.filter((mission) =>
    isOperationsMissionUnlocked(mission, progress),
  );
  return (
    unlocked.find(
      (mission) =>
        getOperationsMissionProgress(mission.id, progress).wins === 0,
    ) ?? unlocked[0]
  );
}

export function markPendingOperationsMission(
  id: OperationsMissionId,
  storage: OperationsStorage | null = browserStorage("sessionStorage"),
  now = Date.now(),
): void {
  if (!storage || !getOperationsMission(id)) return;
  try {
    storage.setItem(
      OPERATIONS_PENDING_MISSION_KEY,
      JSON.stringify({
        missionId: id,
        createdAt: now,
      } satisfies PendingMission),
    );
  } catch {
    /* Optional progression must not block a match. */
  }
}
function configMatchesMission(
  c: OperationsGameConfigLike,
  m: OperationsMissionPreset,
): boolean {
  return (
    c.gameType === GameType.Singleplayer &&
    c.gameMap === m.map &&
    c.difficulty === m.difficulty &&
    c.gameMode === m.gameMode &&
    c.playerTeams === m.teamCount &&
    c.maxTimerValue === m.timeLimitMinutes &&
    c.winThresholdTenths === m.winThresholdTenths &&
    c.bots === m.bots
  );
}
export function consumePendingOperationsMission(
  config: OperationsGameConfigLike,
  storage: OperationsStorage | null = browserStorage("sessionStorage"),
  now = Date.now(),
): OperationsMissionId | null {
  if (!storage) return null;
  let pending: PendingMission;
  try {
    const raw = storage.getItem(OPERATIONS_PENDING_MISSION_KEY);
    storage.removeItem(OPERATIONS_PENDING_MISSION_KEY);
    if (!raw) return null;
    const p: unknown = JSON.parse(raw);
    if (
      !p ||
      typeof p !== "object" ||
      typeof (p as Record<string, unknown>).missionId !== "string" ||
      typeof (p as Record<string, unknown>).createdAt !== "number"
    )
      return null;
    pending = p as PendingMission;
  } catch {
    return null;
  }
  const mission = getOperationsMission(pending.missionId);
  if (
    !mission ||
    !Number.isFinite(pending.createdAt) ||
    pending.createdAt > now ||
    now - pending.createdAt > PENDING_MISSION_MAX_AGE_MS ||
    !configMatchesMission(config, mission)
  )
    return null;
  return mission.id;
}
export function recordOperationsMissionResult(
  id: OperationsMissionId,
  won: boolean,
  elapsedSeconds: number,
  storage: OperationsStorage | null = browserStorage("localStorage"),
  now = Date.now(),
): 0 | 1 | 2 | 3 {
  const mission = getOperationsMission(id);
  if (!mission) return 0;
  const elapsed = Number.isFinite(elapsedSeconds)
    ? Math.max(0, Math.floor(elapsedSeconds))
    : mission.timeLimitMinutes * 60;
  const ratio = elapsed / (mission.timeLimitMinutes * 60);
  const stars: 0 | 1 | 2 | 3 = !won
    ? 0
    : ratio <= 0.55
      ? 3
      : ratio <= 0.85
        ? 2
        : 1;
  if (!storage) return stars;
  try {
    const progress = readOperationsCampaignProgress(storage),
      previous = getOperationsMissionProgress(id, progress);
    progress.missions[id] = {
      attempts: previous.attempts + 1,
      wins: previous.wins + (won ? 1 : 0),
      bestStars: Math.max(previous.bestStars, stars) as 0 | 1 | 2 | 3,
      bestTimeSeconds:
        won &&
        (previous.bestTimeSeconds === null ||
          elapsed < previous.bestTimeSeconds)
          ? elapsed
          : previous.bestTimeSeconds,
      lastPlayedAt: now,
    };
    storage.setItem(OPERATIONS_CAMPAIGN_STORAGE_KEY, JSON.stringify(progress));
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent(OPERATIONS_CAMPAIGN_UPDATED_EVENT));
  } catch {
    /* Best-effort local persistence. */
  }
  return stars;
}
