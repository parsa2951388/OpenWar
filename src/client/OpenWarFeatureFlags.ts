/**
 * Product-scope switch for the current Open War release.
 *
 * Keep the familiar OpenFront/Open Battle-style core loop and aircraft set.
 * Experimental/long-tail entry points stay out of the player-facing build
 * until they are deliberately re-enabled here.
 */
export const OPEN_WAR_FEATURES = {
  /** Use the simplified standard match setup in solo and hosted lobbies. */
  basicSetup: true,
  /** Ranked matchmaking is outside the current basic release scope. */
  rankedMatchmaking: false,
  /** Hide the separate special public-lobby queue; retain FFA and Teams. */
  specialPublicLobbyQueue: false,
  /** Keep the saved preset editor out of the simplified lobby flow. */
  lobbyPresets: false,
} as const;

/**
 * Deliberately preserved in the basic release:
 * - territorial RTS, map selection, FFA and Team matches
 * - standard ground/naval structures and units
 * - Airport, Aircraft Carrier and Commercial Aircraft
 * - Air Fighter, Stealth Fighter and Ground Attacker
 * - normal accounts, store/cosmetics, map, chat and core diplomacy
 *
 * This is a reversible product-scope gate, not a deletion of engine systems.
 */
