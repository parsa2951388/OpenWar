import {
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { AirportExecution } from "@openfront/engine/execution/AirportExecution";
import { Game, Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";

describe("AirportExecution", () => {
  let game: Game;
  let player: Player;

  beforeEach(async () => {
    game = await setup(
      "half_land_half_ocean",
      { infiniteGold: true, instantBuild: true },
      [new PlayerInfo("pilot", PlayerType.Human, null, "pilot_id")],
    );
    player = game.player("pilot_id");
    player.conquer(game.ref(7, 10));
    game.config().aircraftSpawnCooldown = () => 100;
  });

  it("creates one aircraft automatically and respects one active aircraft per airport", () => {
    const airport = player.buildUnit(UnitType.Airport, game.ref(7, 10), {});
    const execution = new AirportExecution(airport);
    execution.init(game, 0);

    execution.tick(0);
    expect(player.units(UnitType.Aircraft)).toHaveLength(1);

    execution.tick(1);
    expect(player.units(UnitType.Aircraft)).toHaveLength(1);

    const aircraft = player.units(UnitType.Aircraft)[0];
    expect(aircraft.owner()).toBe(player);
    expect(aircraft.tile()).toBe(airport.tile());
    expect(aircraft.health()).toBeGreaterThan(0);
  });
});
