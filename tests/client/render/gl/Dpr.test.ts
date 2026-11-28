import { afterEach, describe, expect, it } from "vitest";
import { renderDpr } from "../../../../src/client/render/gl/utils/Dpr";

const originalDpr = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
const originalTouchPoints = Object.getOwnPropertyDescriptor(
  navigator,
  "maxTouchPoints",
);

function restoreProperty(
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
  } else {
    Reflect.deleteProperty(target, key);
  }
}

afterEach(() => {
  restoreProperty(window, "devicePixelRatio", originalDpr);
  restoreProperty(window, "matchMedia", originalMatchMedia);
  restoreProperty(navigator, "maxTouchPoints", originalTouchPoints);
});

describe("renderDpr", () => {
  it("caps high-DPI touch devices at 1.5x", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true }),
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });

    expect(renderDpr()).toBe(1.5);
  });

  it("keeps the desktop cap at 2x", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: false }),
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 0,
    });

    expect(renderDpr()).toBe(2);
  });
});
