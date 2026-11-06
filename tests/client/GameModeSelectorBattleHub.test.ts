import type { PublicGames } from "@openfront/shared/WireSchemas";
import { describe, expect, it } from "vitest";
import { formatLobbyPlayerCount } from "../../src/client/components/LobbyCard";
import {
  countOnlineBattlePlayers,
  countOnlineBattleRooms,
} from "../../src/client/GameModeSelector";

describe("online battle hub room counts", () => {
  it("counts public modes separately from hosted private rooms", () => {
    const lobbies = {
      games: {
        ffa: [{}],
        team: [{}, {}],
        special: [{}],
        hosted: [{}, {}],
      },
    } as unknown as PublicGames;

    expect(countOnlineBattleRooms(lobbies)).toEqual({
      publicRooms: 4,
      hostedRooms: 2,
    });
  });

  it("does not show stale counts before a lobby snapshot arrives", () => {
    expect(countOnlineBattleRooms(null)).toEqual({
      publicRooms: null,
      hostedRooms: null,
    });
  });

  it("reports zero when a valid lobby snapshot contains no rooms", () => {
    const lobbies = { games: {} } as unknown as PublicGames;

    expect(countOnlineBattleRooms(lobbies)).toEqual({
      publicRooms: 0,
      hostedRooms: 0,
    });
  });
});

describe("live player count", () => {
  it("sums connected players across public and hosted modes", () => {
    const lobbies = {
      games: {
        ffa: [{ numClients: 8 }, { numClients: 5 }],
        team: [{ numClients: 10 }],
        special: [{ numClients: 3 }],
        hosted: [{ numClients: 4 }],
      },
    } as unknown as PublicGames;

    expect(countOnlineBattlePlayers(lobbies)).toBe(30);
  });

  it("does not report a live count before the first server snapshot", () => {
    expect(countOnlineBattlePlayers(null)).toBeNull();
  });

  it("ignores invalid or negative client counts", () => {
    const lobbies = {
      games: {
        ffa: [
          { numClients: 5 },
          { numClients: Number.NaN },
          { numClients: -2 },
        ],
      },
    } as unknown as PublicGames;

    expect(countOnlineBattlePlayers(lobbies)).toBe(5);
  });
});

describe("lobby card player counts", () => {
  it("shows both players and capacity when capacity is valid", () => {
    expect(formatLobbyPlayerCount(5, 30)).toBe("5/30");
  });

  it("does not display a broken 0/0 placeholder", () => {
    expect(formatLobbyPlayerCount(0, 0)).toBe("0");
  });

  it("keeps a useful player count when capacity is absent or invalid", () => {
    expect(formatLobbyPlayerCount(7)).toBe("7");
    expect(formatLobbyPlayerCount(7, -1)).toBe("7");
  });

  it("uses a neutral fallback for non-finite counts", () => {
    expect(formatLobbyPlayerCount(Number.NaN, 30)).toBe("—");
  });
});
