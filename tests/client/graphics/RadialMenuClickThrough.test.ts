import { afterEach, describe, expect, it, vi } from "vitest";
import { forwardClickToLayerBelow } from "../../../src/client/hud/layers/RadialMenu";
import {
  FORWARDED_CLICK,
  FORWARDED_TOUCH_CLICK,
} from "../../../src/client/InputHandler";

describe("radial-menu click-through", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, "elementFromPoint");
    document.body.innerHTML = "";
  });

  function createClickThroughTarget() {
    const root = document.createElement("div");
    root.setAttribute("data-radial-click-through", "");
    const button = document.createElement("button");
    root.append(button);
    document.body.append(root);
    return button;
  }

  it("forwards a click to an opted-in HUD layer and marks its origin", () => {
    const target = createClickThroughTarget();
    const onClick = vi.fn();
    target.addEventListener("click", onClick);
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => target),
    });

    forwardClickToLayerBelow(
      new MouseEvent("click", { clientX: 42, clientY: 24 }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
    const forwarded = onClick.mock.calls[0][0] as MouseEvent &
      Record<string, unknown>;
    expect(forwarded[FORWARDED_CLICK]).toBe(true);
    expect(forwarded[FORWARDED_TOUCH_CLICK]).toBeUndefined();
    expect(forwarded.clientX).toBe(42);
    expect(forwarded.clientY).toBe(24);
  });

  it("preserves the touch origin when forwarding a touch click", () => {
    const target = createClickThroughTarget();
    const onClick = vi.fn();
    target.addEventListener("click", onClick);
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => target),
    });

    forwardClickToLayerBelow(
      new MouseEvent("click", { clientX: 10, clientY: 20 }),
      "touch",
    );

    const forwarded = onClick.mock.calls[0][0] as MouseEvent &
      Record<string, unknown>;
    expect(forwarded[FORWARDED_CLICK]).toBe(true);
    expect(forwarded[FORWARDED_TOUCH_CLICK]).toBe(true);
  });

  it("does not forward a click to ordinary map content", () => {
    const target = document.createElement("div");
    document.body.append(target);
    const onClick = vi.fn();
    target.addEventListener("click", onClick);
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => target),
    });

    forwardClickToLayerBelow(
      new MouseEvent("click", { clientX: 1, clientY: 2 }),
    );

    expect(onClick).not.toHaveBeenCalled();
  });
});
