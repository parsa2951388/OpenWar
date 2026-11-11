import { EventBus } from "@openfront/shared/EventBus";
import { afterEach, describe, expect, it } from "vitest";
import {
  ContextMenuEvent,
  InputHandler,
  MouseUpEvent,
} from "../../src/client/InputHandler";
import type { UIState } from "../../src/client/UIState";
import type { GameView } from "../../src/client/view";

type InputHandlerTestAccess = {
  pointerDown: boolean;
  pointers: Map<number, PointerEvent>;
  lastPointerDownX: number;
  lastPointerDownY: number;
  userSettings: { leftClickOpensMenu: () => boolean };
};

function makePointerUp(overrides: Record<string, unknown> = {}): PointerEvent {
  return Object.assign(
    new Event("pointerup", { bubbles: true, cancelable: true }),
    {
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
      clientY: 100,
      x: 100,
      y: 100,
      shiftKey: false,
      ctrlKey: false,
      ...overrides,
    },
  ) as unknown as PointerEvent;
}

function setup(leftClickOpensMenu: boolean) {
  const canvas = document.createElement("div");
  const eventBus = new EventBus();
  const game = {
    inSpawnPhase: () => false,
    config: () => ({ gameConfig: () => ({ tutorial: false }) }),
  } as unknown as GameView;
  const input = new InputHandler(
    game,
    { ghostStructure: null } as UIState,
    canvas,
    eventBus,
  );
  const internals = input as unknown as InputHandlerTestAccess;
  internals.userSettings = { leftClickOpensMenu: () => leftClickOpensMenu };
  internals.pointerDown = true;
  internals.pointers = new Map([[7, {} as PointerEvent]]);
  internals.lastPointerDownX = 100;
  internals.lastPointerDownY = 100;

  const events: string[] = [];
  let claimMapClick = false;
  eventBus.on(MouseUpEvent, (event) => {
    events.push("map-click");
    if (claimMapClick) event.handled = true;
  });
  eventBus.on(ContextMenuEvent, () => events.push("radial-menu"));

  return {
    input,
    events,
    claim(value: boolean) {
      claimMapClick = value;
    },
    dispose() {
      input.destroy();
      canvas.remove();
    },
  };
}

describe("InputHandler map-click priority", () => {
  let context: ReturnType<typeof setup> | undefined;

  afterEach(() => {
    context?.dispose();
    context = undefined;
  });

  it("lets an aircraft or warship controller claim a click before the radial menu", () => {
    context = setup(true);
    context.claim(true);

    context.input.onPointerUp(makePointerUp());

    expect(context.events).toEqual(["map-click"]);
  });

  it("opens the radial menu when no map controller handles the click", () => {
    context = setup(true);

    context.input.onPointerUp(makePointerUp());

    expect(context.events).toEqual(["map-click", "radial-menu"]);
  });

  it("does not open the radial menu when the setting is disabled", () => {
    context = setup(false);

    context.input.onPointerUp(makePointerUp());

    expect(context.events).toEqual(["map-click"]);
  });

  it("keeps Shift-click out of the radial-menu fallback", () => {
    context = setup(true);

    context.input.onPointerUp(makePointerUp({ shiftKey: true }));

    expect(context.events).toEqual(["map-click"]);
  });
});
