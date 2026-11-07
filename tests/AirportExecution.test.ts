import {
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { AirportExecution } from "@openfront/engine/execution/AirportExecution";
import { Game, Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";
import { executeTicks } from "./util/utils";
import { expectSnapshotRoundTrip } from "./util/Snapshot";

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
    execution.init(game);

    execution.tick();
    expect(player.units(UnitType.Aircraft)).toHaveLength(1);

    execution.tick();
    expect(player.units(UnitType.Aircraft)).toHaveLength(1);

    const aircraft = player.units(UnitType.Aircraft)[0];
    expect(aircraft).toBeDefined();
    expect(airport.isActive()).toBeTruthy();
  });

  it("flies between trading airports and pays both partners deterministically", async () => {
    const network = await setup(
      "plains",
      {
        infiniteGold: true,
        instantBuild: true,
        disabledUnits: [UnitType.Aircraft],
      },
      [
        new PlayerInfo("origin", PlayerType.Human, null, "origin_id"),
        new PlayerInfo("partner", PlayerType.Human, null, "partner_id"),
      ],
    );
    const origin = network.player("origin_id");
    const partner = network.player("partner_id");
    const originTile = network.ref(10, 10);
    const partnerTile = network.ref(30, 10);
    origin.conquer(originTile);
    partner.conquer(partnerTile);

    const originAirport = origin.buildUnit(UnitType.Airport, originTile, {});
    partner.buildUnit(UnitType.Airport, partnerTile, {});

    network.config().aircraftSpawnCooldown = () => 100_000;
    network.config().commercialFlightSpawnCooldown = () => 1;
    network.config().commercialFlightGold = () => 1_000n;

    network.addExecution(new AirportExecution(originAirport));
    executeTicks(network, 2);

    expect(origin.units(UnitType.CommercialAircraft)).toHaveLength(1);
    const aircraft = origin.units(UnitType.CommercialAircraft)[0];
    expect(aircraft).toBeDefined();

    // Mid-route restore must preserve both the selected destination and the
    // deterministic air-path traversal cursor.
    executeTicks(network, 8);
    await expectSnapshotRoundTrip(network, "plains", 5);

    executeTicks(network, 20);
    expect(origin.tradeGold()).toBeGreaterThan(0n);
    expect(partner.tradeGold()).toBeGreaterThan(0n);
    expect(origin.goldEarned()).toBeGreaterThan(0n);
    expect(partner.goldEarned()).toBeGreaterThan(0n);
  });
});
