import { describe, expect, it } from "vitest";
import {
  aircraftDamageAgainst,
  canLaunchFromBase,
  aircraftDetectionChance,
  aircraftDistance,
  aircraftFlightTicks,
  aircraftFuelForDistance,
  consumeAircraftFuel,
  damageAircraft,
  planAircraftMission,
  refuelAircraft,
  repairAircraft,
  type AircraftProfile,
  type AircraftState,
} from "../packages/engine/src/aircombat/AircraftRules";

const fighter: AircraftProfile = {
  role: "air-fighter",
  fuelPerTile: 1.2,
  fuelCapacity: 100,
  speedTilesPerTick: 4,
  airDamage: 30,
  groundDamage: 8,
  detectionMultiplier: 1,
  carrierCapable: true,
};

const parked: AircraftState = {
  fuel: 100,
  health: 100,
  status: "parked",
};

describe("aircraft flight and fuel rules", () => {
  it("allows only carrier-capable aircraft to use carrier bases", () => {
    const commercial = { ...fighter, role: "commercial" as const, airDamage: 0, groundDamage: 0, carrierCapable: false };
    expect(canLaunchFromBase(fighter, "airport")).toBe(true);
    expect(canLaunchFromBase(fighter, "carrier")).toBe(true);
    expect(canLaunchFromBase(commercial, "carrier")).toBe(false);
  });

  it("uses direct map distance", () => {
    expect(aircraftDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("rounds fuel use up and applies a return reserve", () => {
    expect(aircraftFuelForDistance(fighter, 2.1)).toBe(3);
    expect(aircraftFuelForDistance(fighter, 10, 0.1)).toBe(14);
  });

  it("accepts a mission only when outbound, return and reserve fuel fit", () => {
    const enough = planAircraftMission(
      fighter,
      parked,
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 0, y: 0 },
      0.1,
    );
    expect(enough?.requiredFuel).toBe(53);

    const lowFuel = planAircraftMission(
      fighter,
      { ...parked, fuel: 52 },
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 0, y: 0 },
      0.1,
    );
    expect(lowFuel).toBeNull();
  });

  it("rejects a second mission while already in flight", () => {
    expect(
      planAircraftMission(
        fighter,
        { ...parked, status: "in-flight" },
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ),
    ).toBeNull();
  });

  it("never lets fuel become negative", () => {
    expect(consumeAircraftFuel(fighter, { ...parked, fuel: 2 }, 3)).toBeNull();
    expect(consumeAircraftFuel(fighter, parked, 3)?.fuel).toBe(96);
  });

  it("refuels only at a friendly base and clamps to capacity", () => {
    expect(refuelAircraft(fighter, { ...parked, fuel: 90 }, 50, true).fuel).toBe(100);
    expect(refuelAircraft(fighter, { ...parked, fuel: 20 }, 50, false).fuel).toBe(20);
  });

  it("repairs at a friendly base and clamps health", () => {
    expect(repairAircraft({ ...parked, health: 70 }, 50, true).health).toBe(100);
    expect(repairAircraft({ ...parked, health: 70 }, 50, false).health).toBe(70);
  });

  it("marks an aircraft destroyed at zero health", () => {
    expect(damageAircraft({ ...parked, health: 20 }, 25)).toMatchObject({
      health: 0,
      status: "destroyed",
    });
  });

  it("keeps commercial aircraft unarmed and models stealth detection", () => {
    const commercial = { ...fighter, role: "commercial" as const, airDamage: 0, groundDamage: 0 };
    const stealth = { ...fighter, role: "stealth-fighter" as const, detectionMultiplier: 0.25 };
    expect(aircraftDamageAgainst(commercial, "air")).toBe(0);
    expect(aircraftDetectionChance(stealth, 0.8)).toBe(0.2);
    expect(aircraftDamageAgainst(fighter, "air")).toBe(30);
  });

  it("calculates flight duration from configured speed", () => {
    expect(aircraftFlightTicks(fighter, 9)).toBe(3);
  });

  it("rejects malformed profiles and invalid inputs", () => {
    expect(() => aircraftDistance({ x: Number.NaN, y: 0 }, { x: 1, y: 1 })).toThrow();
    expect(() => aircraftFlightTicks({ ...fighter, speedTilesPerTick: 0 }, 1)).toThrow();
    expect(() => aircraftDamageAgainst({
      ...fighter, role: "commercial", airDamage: 10
    }, "ground")).toThrow();
  });
});
