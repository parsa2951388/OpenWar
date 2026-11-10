import {
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { AirportExecution } from "@openfront/engine/execution/AirportExecution";
import { CommercialAircraftExecution } from "@openfront/engine/execution/CommercialAircraftExecution";
import { FighterAamExecution } from "@openfront/engine/execution/FighterAamExecution";
import { FighterBombExecution } from "@openfront/engine/execution/FighterBombExecution";
import { FighterExecution } from "@openfront/engine/execution/FighterExecution";
import { MoveFighterExecution } from "@openfront/engine/execution/MoveFighterExecution";
import { Game, Player } from "@openfront/engine/game/Game";
import { setup } from "../../util/Setup";
import { expectSnapshotRoundTrip } from "../../util/Snapshot";

const MAP = "plains";

function human(name: string): PlayerInfo {
  return new PlayerInfo(name, PlayerType.Human, null, name);
}

function conquerRect(
  game: Game,
  player: Player,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  for (let x = x0; x < x1; x++) {
    for (let y = y0; y < y1; y++) {
      const tile = game.ref(x, y);
      if (game.isLand(tile)) player.conquer(tile);
    }
  }
}

describe("aircraft execution snapshots", () => {
  test("airbases, flights, fighters and air attacks round-trip", async () => {
    const game = await setup(MAP, { infiniteGold: true, instantBuild: true }, [
      human("alice"),
      human("bob"),
    ]);
    const alice = game.player("alice");
    const bob = game.player("bob");

    conquerRect(game, alice, 5, 5, 35, 35);
    conquerRect(game, bob, 65, 65, 95, 95);

    const sourceAirport = alice.buildUnit(
      UnitType.Airport,
      game.ref(15, 15),
      {},
    );
    const destinationAirport = bob.buildUnit(
      UnitType.Airport,
      game.ref(80, 80),
      {},
    );
    const aliceFighter = alice.buildUnit(
      UnitType.AirFighter,
      game.ref(20, 20),
      { patrolTile: game.ref(22, 20) },
    );
    const bobFighter = bob.buildUnit(UnitType.AirFighter, game.ref(78, 78), {
      patrolTile: game.ref(76, 78),
    });

    game.reserveFighterAamTarget(aliceFighter.id(), bobFighter.id());
    game.addExecution(
      new AirportExecution(sourceAirport),
      new AirportExecution(destinationAirport),
      new CommercialAircraftExecution(alice, sourceAirport, destinationAirport),
      new FighterExecution(aliceFighter),
      new FighterExecution(bobFighter),
      new FighterAamExecution(
        game.ref(20, 20),
        alice,
        aliceFighter,
        bobFighter,
        100,
        false,
      ),
      new FighterBombExecution(alice, game.ref(10, 90), 3),
      new MoveFighterExecution(alice, [aliceFighter.id()], game.ref(24, 24)),
    );

    // Initialize pathfinders and execution-owned state before taking the
    // first snapshot. The AAM reservation is created by the normal game
    // command path, so this fixture reserves the same pair explicitly.
    game.executeNextTick();
    await expectSnapshotRoundTrip(game, MAP, 5);
  }, 60_000);
});
