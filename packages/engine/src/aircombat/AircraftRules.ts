/**
 * Deterministic, renderer-independent rules shared by the server and tests.
 *
 * This module deliberately contains no balance constants: profiles are data
 * supplied by game configuration so aircraft can be tuned without changing
 * flight/fuel semantics.
 */

export type AircraftRole =
  | "air-fighter"
  | "stealth-fighter"
  | "ground-attacker"
  | "commercial";

export type AircraftTargetClass = "air" | "ground" | "structure";

export type AircraftOperationalStatus =
  | "parked"
  | "in-flight"
  | "returning"
  | "refuelling"
  | "repairing"
  | "destroyed";

export interface AircraftPoint {
  x: number;
  y: number;
}

export interface AircraftProfile {
  role: AircraftRole;
  /** Fuel consumed for one map tile of flight. */
  fuelPerTile: number;
  /** Maximum fuel the aircraft can carry. */
  fuelCapacity: number;
  /** Maximum distance an aircraft may fly in one simulation tick. */
  speedTilesPerTick: number;
  /** Damage against aircraft. Commercial aircraft must use zero. */
  airDamage: number;
  /** Damage against ground units and structures. */
  groundDamage: number;
  /** Multiplier applied to the base detection probability; lower is stealthier. */
  detectionMultiplier: number;
  /** Whether the aircraft may launch and recover from an aircraft carrier. */
  carrierCapable: boolean;
}

export interface AircraftState {
  fuel: number;
  health: number;
  status: AircraftOperationalStatus;
}

export type AircraftBaseType = "airport" | "carrier";

export interface AircraftMissionFuel {
  outboundDistance: number;
  returnDistance: number;
  requiredFuel: number;
  remainingAfterReturn: number;
}

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number`);
  }
}

function validateProfile(profile: AircraftProfile): void {
  assertFiniteNonNegative(profile.fuelPerTile, "fuelPerTile");
  assertFiniteNonNegative(profile.fuelCapacity, "fuelCapacity");
  assertFiniteNonNegative(profile.speedTilesPerTick, "speedTilesPerTick");
  assertFiniteNonNegative(profile.airDamage, "airDamage");
  assertFiniteNonNegative(profile.groundDamage, "groundDamage");
  if (
    !Number.isFinite(profile.detectionMultiplier) ||
    profile.detectionMultiplier < 0 ||
    profile.detectionMultiplier > 1
  ) {
    throw new RangeError("detectionMultiplier must be between 0 and 1");
  }
  if (
    profile.role === "commercial" &&
    (profile.airDamage !== 0 || profile.groundDamage !== 0)
  ) {
    throw new RangeError("commercial aircraft cannot carry combat damage");
  }
}

function validatePoint(point: AircraftPoint, name: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`${name} coordinates must be finite`);
  }
}

/** Carrier launches are restricted by the aircraft profile; all aircraft may use land airports. */
export function canLaunchFromBase(
  profile: AircraftProfile,
  baseType: AircraftBaseType,
): boolean {
  validateProfile(profile);
  return baseType === "airport" || profile.carrierCapable;
}

/** Euclidean map distance, matching direct air travel rather than land pathfinding. */
export function aircraftDistance(
  from: AircraftPoint,
  to: AircraftPoint,
): number {
  validatePoint(from, "from");
  validatePoint(to, "to");
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Fuel required for a route, rounded up so partial tiles are never free. */
export function aircraftFuelForDistance(
  profile: AircraftProfile,
  distance: number,
  reserveFraction = 0,
): number {
  validateProfile(profile);
  assertFiniteNonNegative(distance, "distance");
  if (
    !Number.isFinite(reserveFraction) ||
    reserveFraction < 0 ||
    reserveFraction > 1
  ) {
    throw new RangeError("reserveFraction must be between 0 and 1");
  }
  return Math.ceil(distance * profile.fuelPerTile * (1 + reserveFraction));
}

/**
 * Checks a complete mission, including the return leg to base and a fuel
 * reserve. A mission is rejected before takeoff when it cannot safely return.
 */
export function planAircraftMission(
  profile: AircraftProfile,
  state: AircraftState,
  origin: AircraftPoint,
  target: AircraftPoint,
  recoveryBase: AircraftPoint = origin,
  reserveFraction = 0.1,
): AircraftMissionFuel | null {
  validateProfile(profile);
  validateAircraftState(state, profile);
  const outboundDistance = aircraftDistance(origin, target);
  const returnDistance = aircraftDistance(target, recoveryBase);
  const requiredFuel = aircraftFuelForDistance(
    profile,
    outboundDistance + returnDistance,
    reserveFraction,
  );
  if (
    state.status === "destroyed" ||
    state.status === "in-flight" ||
    state.status === "returning"
  ) {
    return null;
  }
  if (state.fuel < requiredFuel) return null;
  return {
    outboundDistance,
    returnDistance,
    requiredFuel,
    remainingAfterReturn: state.fuel - requiredFuel,
  };
}

function validateAircraftState(
  state: AircraftState,
  profile: AircraftProfile,
): void {
  assertFiniteNonNegative(state.fuel, "fuel");
  assertFiniteNonNegative(state.health, "health");
  if (state.fuel > profile.fuelCapacity) {
    throw new RangeError("fuel cannot exceed aircraft fuel capacity");
  }
  if (state.health > 100) {
    throw new RangeError("health cannot exceed 100");
  }
}

/** Consumes fuel atomically; returns null instead of allowing negative fuel. */
export function consumeAircraftFuel(
  profile: AircraftProfile,
  state: AircraftState,
  distance: number,
): AircraftState | null {
  validateProfile(profile);
  validateAircraftState(state, profile);
  if (state.status === "destroyed") return null;
  const cost = aircraftFuelForDistance(profile, distance);
  if (state.fuel < cost) return null;
  return { ...state, fuel: state.fuel - cost };
}

/** Refuels only at a valid friendly base; amount is clamped to the capacity. */
export function refuelAircraft(
  profile: AircraftProfile,
  state: AircraftState,
  amount: number,
  atFriendlyBase: boolean,
): AircraftState {
  validateProfile(profile);
  validateAircraftState(state, profile);
  assertFiniteNonNegative(amount, "amount");
  if (!atFriendlyBase || state.status === "destroyed") return state;
  return {
    ...state,
    fuel: Math.min(profile.fuelCapacity, state.fuel + amount),
    status: "refuelling",
  };
}

/** Repairs only at a valid friendly base; health is clamped to 100. */
export function repairAircraft(
  state: AircraftState,
  amount: number,
  atFriendlyBase: boolean,
): AircraftState {
  assertFiniteNonNegative(amount, "amount");
  if (!atFriendlyBase || state.status === "destroyed") return state;
  return {
    ...state,
    health: Math.min(100, state.health + amount),
    status: "repairing",
  };
}

/** Applies damage with a hard zero floor and a terminal destroyed state. */
export function damageAircraft(
  state: AircraftState,
  damage: number,
): AircraftState {
  assertFiniteNonNegative(damage, "damage");
  if (state.status === "destroyed") return state;
  const health = Math.max(0, state.health - damage);
  return {
    ...state,
    health,
    status: health === 0 ? "destroyed" : state.status,
  };
}

/** Resolves a role's damage against an air, ground, or structure target. */
export function aircraftDamageAgainst(
  profile: AircraftProfile,
  target: AircraftTargetClass,
): number {
  validateProfile(profile);
  if (profile.role === "commercial") return 0;
  return target === "air" ? profile.airDamage : profile.groundDamage;
}

/** Returns the effective detection probability after role-specific stealth. */
export function aircraftDetectionChance(
  profile: AircraftProfile,
  baseChance: number,
): number {
  validateProfile(profile);
  if (!Number.isFinite(baseChance) || baseChance < 0 || baseChance > 1) {
    throw new RangeError("baseChance must be between 0 and 1");
  }
  return Math.max(0, Math.min(1, baseChance * profile.detectionMultiplier));
}

/** Number of simulation ticks needed for the direct flight segment. */
export function aircraftFlightTicks(
  profile: AircraftProfile,
  distance: number,
): number {
  validateProfile(profile);
  assertFiniteNonNegative(distance, "distance");
  if (profile.speedTilesPerTick <= 0) {
    throw new RangeError("speedTilesPerTick must be greater than zero");
  }
  return Math.ceil(distance / profile.speedTilesPerTick);
}
