import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { describe, expect, test } from "vitest";
import { unitHealthBarMaxHealth } from "../../../../src/client/render/gl/passes/BarPass";
import {
  ALL_UNIT_TYPES,
  STRUCTURE_TYPES,
  UT_AIRCRAFT,
  UT_AIRPORT,
  UT_COMMERCIAL_AIRCRAFT,
} from "../../../../src/client/render/types";

describe("air unit renderer integration", () => {
  test("registers airports as structures and aircraft as mobile units", () => {
    expect(UT_AIRPORT).toBe(UnitType.Airport);
    expect(UT_AIRCRAFT).toBe(UnitType.Aircraft);
    expect(UT_COMMERCIAL_AIRCRAFT).toBe(UnitType.CommercialAircraft);
    expect(ALL_UNIT_TYPES).toContain(UnitType.Airport);
    expect(ALL_UNIT_TYPES).toContain(UnitType.Aircraft);
    expect(ALL_UNIT_TYPES).toContain(UnitType.CommercialAircraft);
    expect(STRUCTURE_TYPES.has(UnitType.Airport)).toBe(true);
    expect(STRUCTURE_TYPES.has(UnitType.Aircraft)).toBe(false);
    expect(STRUCTURE_TYPES.has(UnitType.CommercialAircraft)).toBe(false);
  });

  test("uses the correct maximum health for aircraft and airports", () => {
    expect(
      unitHealthBarMaxHealth(UnitType.Aircraft, 0, 1000, 650, 2500, 20),
    ).toBe(650);
    expect(
      unitHealthBarMaxHealth(
        UnitType.CommercialAircraft,
        0,
        1000,
        650,
        2500,
        20,
      ),
    ).toBe(650);
    expect(
      unitHealthBarMaxHealth(UnitType.Warship, 2, 1000, 650, 2500, 20),
    ).toBe(1400);
    expect(
      unitHealthBarMaxHealth(UnitType.Airport, 0, 1000, 650, 2500, 20),
    ).toBe(2500);
    expect(
      unitHealthBarMaxHealth(UnitType.TransportShip, 0, 1000, 650, 2500, 20),
    ).toBe(0);
  });
});
