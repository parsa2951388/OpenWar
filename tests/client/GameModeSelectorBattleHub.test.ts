import type { PublicGames } from "@openfront/shared/WireSchemas";
import { describe, expect, it } from "vitest";
import { countOnlineBattleRooms } from "../../src/client/GameModeSelector";

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
