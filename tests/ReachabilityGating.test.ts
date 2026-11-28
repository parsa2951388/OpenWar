// @vitest-environment jsdom
import { GameMapType, GameMode } from "@openfront/engine-api/game/GameTypes";
import type { GameConfig } from "@openfront/engine-api/Schemas";
import type {
  PublicGameInfo,
  PublicGames,
} from "@openfront/shared/WireSchemas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientEnv } from "../src/client/ClientEnv";
// This named import also registers <game-mode-selector> as a side effect.
import { shouldBlockMultiplayerAction } from "../src/client/GameModeSelector";
import {
  attemptInFlight,
  backendUnreachableConfirmed,
  ensureServerList,
  MANUAL_RETRY_COOLDOWN_MS,
  resetServerList,
  retryServerList,
} from "../src/client/ServerList";

// The component opens a public-lobby WebSocket the moment it connects. jsdom
// has no WebSocket worth talking to and this file is about the gate, not the
// lobby list, so the socket is a no-op -- except for retaining the update
// callback the real socket would drive off the wire, which is the only way a
// public-lobby card (one of the gated entry points) ever renders.
const { lobbiesCallbackRef } = vi.hoisted(() => ({
  lobbiesCallbackRef: { current: null as ((g: PublicGames) => void) | null },
}));

vi.mock("../src/client/LobbySocket", () => ({
  PublicLobbySocket: class {
    constructor(onUpdate: (g: PublicGames) => void) {
      lobbiesCallbackRef.current = onUpdate;
    }
    start(): void {}
    stop(): void {}
  },
}));

// The lobby modals load on demand; the stubs below stand in for loaded ones.
vi.mock("../src/client/LazyModals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/client/LazyModals")>()),
  whenModalLoaded: (_tag: string, open: () => void) => open(),
}));

/**
 * OPE-439. The server-list heartbeat already knows whether the API answers;
 * this is the half that turns that into something the player can see, on the
 * WEB as well as on desktop -- which is what separates it from the desktop
 * update/session gates the sibling files cover.
 *
 * Everything here runs against the real ServerList module, driven by a
 * stubbed fetch. A mocked backendReachable() would prove the call sites
 * consult *something*, but not that the signal the heartbeat actually
 * produces is the one they consult, nor that a component mounting after the
 * first attempt settles can still find it.
 */
let selector: HTMLElement & { updateComplete: Promise<unknown> };
let joinOpen: ReturnType<typeof vi.fn>;
let hostOpen: ReturnType<typeof vi.fn>;
let wiggle: ReturnType<typeof vi.fn>;
let joinLobby: ReturnType<typeof vi.fn>;
let messages: string[];
let fetchMock: ReturnType<typeof vi.fn>;
// Added to the real clock, so a test can step past the manual-retry cooldown
// without waiting out five real seconds. Only Date.now is moved: ServerList's
// throttles are all clock comparisons, and faking timers wholesale would
// stall Lit's own scheduling.
let clockOffset: number;

function stub(tag: string, methods: Record<string, unknown>): void {
  const el = document.createElement(tag);
  Object.assign(el, methods);
  document.body.appendChild(el);
}

function publicLobby(gameID: string): PublicGameInfo {
  return {
    gameID,
    numClients: 3,
    publicGameType: "ffa",
    gameConfig: {
      gameMap: GameMapType.World,
      gameMode: GameMode.FFA,
      maxPlayers: 8,
    } as unknown as GameConfig,
  };
}

/** Mounts <game-mode-selector> with one rendered public-lobby card. */
async function mountSelector(): Promise<
  HTMLElement & { updateComplete: Promise<unknown> }
> {
  const el = document.createElement("game-mode-selector") as HTMLElement & {
    updateComplete: Promise<unknown>;
  };
  document.body.appendChild(el);
  await el.updateComplete;
  lobbiesCallbackRef.current?.({
    serverTime: Date.now(),
    games: { ffa: [publicLobby("public-1")] },
  });
  await el.updateComplete;
  return el;
}

/** Clicks every button the selector renders. Returns how many it clicked. */
function clickEveryButton(): number {
  const buttons = Array.from(selector.querySelectorAll("button"));
  for (const button of buttons) button.click();
  return buttons.length;
}

function actionButton(key: "create" | "ranked" | "join"): HTMLButtonElement {
  const button = selector.querySelector<HTMLButtonElement>(
    `button[data-action-key="${key}"]`,
  );
  if (button === null) throw new Error(`Missing ${key} action button`);
  return button;
}

function clickAction(key: "create" | "ranked" | "join"): void {
  actionButton(key).click();
}

/**
 * The rendered public-lobby card's button. Socket-sourced: whatever the
 * server-list API is doing, this one must keep working (the reachability rule
 * at the top of GameModeSelector.ts).
 */
function lobbyCardButton(): HTMLButtonElement | null {
  return selector.querySelector("button.group");
}

/** Announces a reachability change the way the heartbeat does. */
async function announce(reachable: boolean, confirmed = false): Promise<void> {
  document.dispatchEvent(
    new CustomEvent("backend-reachability", {
      detail: { reachable, confirmed },
    }),
  );
  await selector.updateComplete;
}

/**
 * Drives the real module through enough failed attempts that the outage is
 * confirmed. Uses the manual retry for the second one so the test does not
 * have to wait out the heartbeat's retry interval.
 */
async function confirmOutage(): Promise<void> {
  fetchMock.mockImplementation(async () => {
    throw new TypeError("network down");
  });
  await ensureServerList();
  await retryServerList();
  expect(backendUnreachableConfirmed()).toBe(true);
}

beforeEach(() => {
  // The page is served by one game server. It has its own one-entry cluster
  // map even though the public registry has not registered this test site.
  window.BOOTSTRAP_CONFIG = {
    gameEnv: "dev",
    numWorkers: 1,
    cluster: { a: { host: "game.test", numWorkers: 1 } },
    instanceLetter: "a",
    turnstileSiteKey: "",
    jwtAudience: "test",
    instanceId: "test",
    gitCommit: "test",
  };
  ClientEnv.reset();
  resetServerList();

  fetchMock = vi.fn(async () => new Response("{}", { status: 404 }));
  vi.stubGlobal("fetch", fetchMock);
  clockOffset = 0;
  const realNow = Date.now.bind(Date);
  vi.spyOn(Date, "now").mockImplementation(() => realNow() + clockOffset);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});

  joinOpen = vi.fn();
  hostOpen = vi.fn();
  wiggle = vi.fn();
  joinLobby = vi.fn();
  stub("join-lobby-modal", { open: joinOpen });
  stub("host-lobby-modal", { open: hostOpen });
  stub("single-player-modal", { open: vi.fn() });
  // Present on the web too -- index.html mounts it on every build and it
  // simply renders nothing there -- which is exactly why the web message
  // cannot key on whether this element exists.
  stub("desktop-status-bar", { wiggle });
  (window as { showPage?: (id: string) => void }).showPage = vi.fn();
  document.addEventListener("join-lobby", joinLobby as EventListener);

  messages = [];
  window.addEventListener("show-message", (e) => {
    messages.push((e as CustomEvent).detail?.message);
  });

  lobbiesCallbackRef.current = null;
});

afterEach(() => {
  document.removeEventListener("join-lobby", joinLobby as EventListener);
  document.body.innerHTML = "";
  window.BOOTSTRAP_CONFIG = undefined;
  ClientEnv.reset();
  resetServerList();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("local and registry actions while the backend is unreachable", () => {
  it("keeps local Create and Join available while registry status is unknown", async () => {
    selector = await mountSelector();
    expect(backendUnreachableConfirmed()).toBe(false);

    expect(actionButton("create").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("join").getAttribute("aria-disabled")).toBe("false");
    expect(messages).toEqual([]);
  });

  it("keeps local Create and Join available after a single missed attempt", async () => {
    selector = await mountSelector();
    await announce(false, false);

    expect(actionButton("create").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("join").getAttribute("aria-disabled")).toBe("false");
    expect(messages).toEqual([]);
  });

  it("keeps private lobbies available but blocks Ranked after a confirmed registry outage", async () => {
    selector = await mountSelector();
    await announce(false, true);

    expect(actionButton("create").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("join").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("ranked").getAttribute("aria-disabled")).toBe("true");

    clickAction("create");
    clickAction("join");
    expect(hostOpen).toHaveBeenCalled();
    expect(joinOpen).toHaveBeenCalled();

    clickAction("ranked");
    expect(messages).toContain("common.backend_unreachable");
  });

  it("still joins the public lobby card during a confirmed outage", async () => {
    // The rule (GameModeSelector, top of file): this lobby arrived over a
    // live game-server socket, which is the only liveness the join needs. The
    // server-list API's health says nothing about that server, and Main's
    // funnel would let the very same join through -- so refusing here would
    // only reject a join that is already under way.
    selector = await mountSelector();
    await announce(false, true);

    const card = lobbyCardButton();
    expect(card).not.toBeNull();
    card!.click();

    expect(joinLobby).toHaveBeenCalled();
    expect(joinLobby.mock.calls[0][0].detail.gameID).toBe("public-1");
  });

  it("does not dim the public lobby card during a confirmed outage", async () => {
    selector = await mountSelector();
    await announce(false, true);

    expect(lobbyCardButton()?.getAttribute("aria-disabled")).toBe("false");
  });

  it("says nothing when a card click goes through during an outage", async () => {
    // The toast is for a REFUSAL. A join that proceeded has nothing to
    // apologise for, and telling the player the servers are unreachable while
    // taking them into a game would be a lie.
    selector = await mountSelector();
    await announce(false, true);

    lobbyCardButton()!.click();

    expect(messages).toEqual([]);
  });

  it("says why when Ranked is refused on the web", async () => {
    selector = await mountSelector();
    await announce(false, true);

    clickAction("ranked");

    // Refusing silently would look like a broken button, and unlike the
    // desktop gates there is nothing else on screen naming the reason.
    expect(messages).toContain("common.backend_unreachable");
  });

  it("keeps private actions available while the registry recovers", async () => {
    selector = await mountSelector();
    await announce(false, true);
    clickAction("ranked");
    document.dispatchEvent(new CustomEvent("leave-lobby"));

    await announce(true);

    expect(actionButton("create").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("join").getAttribute("aria-disabled")).toBe("false");
    // A reachable 404 means the API is healthy but this site has no compatible
    // registered server, so Ranked remains unavailable.
    expect(actionButton("ranked").getAttribute("aria-disabled")).toBe("true");
  });

  it("leaves single-player alone", async () => {
    selector = await mountSelector();
    const soloOpen = vi.fn();
    (
      document.querySelector("single-player-modal") as unknown as {
        open: () => void;
      }
    ).open = soloOpen;
    await announce(false, true);

    clickEveryButton();

    // Bot games run entirely in-client: an unreachable backend is no reason
    // to refuse one, and refusing would break the desktop build's core
    // offline promise.
    expect(soloOpen).toHaveBeenCalled();
  });

  it("keeps local actions available when a selector mounts during a confirmed outage", async () => {
    // The seed half. No "backend-reachability" event is dispatched anywhere
    // below: the only ones this document will ever see fired while nothing
    // was listening, so the accessor is the sole path by which the selector
    // can know. This is OPE-396's bug, on a new signal.
    await confirmOutage();

    selector = await mountSelector();

    expect(actionButton("create").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("join").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("ranked").getAttribute("aria-disabled")).toBe("true");
    clickAction("ranked");
    expect(messages).toContain("common.backend_unreachable");
    // ...and the card that came over the socket still joins, from the same
    // seed.
    expect(joinLobby).toHaveBeenCalled();
  });

  it("keeps private actions available when the API answers but this site is unregistered", async () => {
    // A 404 is an answer: the API is reachable, but this test host has no
    // compatible global registry entry. That must affect Ranked only.
    await ensureServerList();
    expect(backendUnreachableConfirmed()).toBe(false);

    selector = await mountSelector();

    expect(actionButton("create").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("join").getAttribute("aria-disabled")).toBe("false");
    expect(actionButton("ranked").getAttribute("aria-disabled")).toBe("true");
  });
});

/**
 * The web's escape hatch. Desktop has the status bar's Retry button; the web
 * has no bar at all, so without this the only way out of a gated state is the
 * heartbeat's next beat -- and that backs off to as much as RETRY_MAX_MS once
 * an outage has run a while. A toast reading "Check your connection and try
 * again" over a button where trying again provably does nothing is worse than
 * no toast, so on the web the refused click IS the retry.
 *
 * Driven through the real ServerList module: the point is that the click
 * reaches the same probe the desktop button does, throttled by the same
 * policy (manualRetryAvailable) and the same clock.
 */
describe("a refused multiplayer click on the web", () => {
  /** Past the shared manual-retry cooldown, so a probe is available again. */
  function advancePastRetryCooldown(): void {
    clockOffset += MANUAL_RETRY_COOLDOWN_MS + 1;
  }

  /** Mounts a selector against a module that has already confirmed an outage. */
  async function mountGated(): Promise<void> {
    await confirmOutage();
    selector = await mountSelector();
    // confirmOutage's own manual retry started the cooldown; step past it so
    // each test starts from "a probe is available".
    advancePastRetryCooldown();
  }

  it("probes the API again", async () => {
    await mountGated();
    const before = fetchMock.mock.calls.length;

    clickAction("ranked");

    expect(messages).toContain("common.backend_unreachable");
    expect(fetchMock.mock.calls.length).toBe(before + 1);
  });

  it("collapses a flurry of refused clicks into a single probe", async () => {
    // Three gated entry points are clicked in that one pass. The first starts
    // an attempt; while it is in flight the rest could only join it, so
    // offering them a request each would just point traffic at a backend that
    // is already known to be struggling.
    await mountGated();
    const before = fetchMock.mock.calls.length;

    clickAction("ranked");

    expect(fetchMock.mock.calls.length).toBe(before + 1);
  });

  it("does not probe again inside the cooldown, but still says why", async () => {
    await mountGated();
    clickAction("ranked");
    document.dispatchEvent(new CustomEvent("leave-lobby"));
    await vi.waitFor(() => expect(attemptInFlight()).toBe(false));
    const after = fetchMock.mock.calls.length;
    messages.length = 0;

    clickAction("ranked");

    expect(fetchMock.mock.calls.length).toBe(after);
    // The player is still being refused, so they are still told so: the
    // throttle is on the request, not on the explanation.
    expect(messages).toContain("common.backend_unreachable");
  });

  it("probes again once the cooldown has elapsed", async () => {
    await mountGated();
    clickAction("ranked");
    document.dispatchEvent(new CustomEvent("leave-lobby"));
    await vi.waitFor(() => expect(attemptInFlight()).toBe(false));
    const after = fetchMock.mock.calls.length;

    advancePastRetryCooldown();
    clickAction("ranked");

    expect(fetchMock.mock.calls.length).toBe(after + 1);
  });

  it("keeps private lobby actions available when the API probe succeeds for an unregistered site", async () => {
    // End to end: a refused click starts the probe, the probe answers, the
    // reachability event that carries the answer un-dims the buttons, and the
    // next click goes through. No Retry button involved anywhere.
    await mountGated();
    fetchMock.mockImplementation(
      async () =>
        new Response("{}", {
          status: 404,
        }),
    );

    clickAction("ranked");
    document.dispatchEvent(new CustomEvent("leave-lobby"));
    await vi.waitFor(() => expect(backendUnreachableConfirmed()).toBe(false));
    await selector.updateComplete;

    expect(
      selector.querySelectorAll('button[aria-disabled="true"]').length,
    ).toBe(0);
    expect(clickEveryButton()).toBeGreaterThan(0);
    expect(hostOpen).toHaveBeenCalled();
    expect(joinOpen).toHaveBeenCalled();
  });

  it("does not probe when a local Create click is not refused", async () => {
    selector = await mountSelector();
    const before = fetchMock.mock.calls.length;

    clickAction("create");

    expect(fetchMock.mock.calls.length).toBe(before);
    expect(hostOpen).toHaveBeenCalled();
  });

  it("does not probe on a card click that goes through", async () => {
    // Socket-sourced: it was never refused, so there is nothing to retry.
    await mountGated();
    const before = fetchMock.mock.calls.length;

    lobbyCardButton()!.click();

    expect(joinLobby).toHaveBeenCalled();
    expect(fetchMock.mock.calls.length).toBe(before);
  });
});

/**
 * `multiplayerAllowedForSession` refuses every `signed-out` state regardless
 * of `reason`, so "needs-account" gates multiplayer for free and needed no
 * production change here. This pins that: if the rule is ever narrowed to an
 * allowlist of reasons, this is what would catch a player with no account yet
 * slipping through.
 */
describe("shouldBlockMultiplayerAction with a needs-account session", () => {
  it("blocks multiplayer when no account exists yet, online or offline", () => {
    for (const backendOutage of [false, true]) {
      expect(
        shouldBlockMultiplayerAction(
          null,
          { status: "signed-out", reason: "needs-account" },
          backendOutage,
        ),
      ).toBe(true);
    }
  });
});
