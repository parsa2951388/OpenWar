import { afterEach, describe, expect, it } from "vitest";
import type { WebGLGate } from "../../src/client/components/WebGLGate";
import "../../src/client/components/WebGLGate";

function createGate(status: WebGLGate["status"]): WebGLGate {
  const gate = document.createElement("webgl-gate") as WebGLGate;
  gate.status = status;
  document.body.appendChild(gate);
  return gate;
}

describe("WebGLGate navigation and recovery", () => {
  afterEach(() => document.body.replaceChildren());

  it.each(["software", "unsupported"] as const)(
    "offers a safe route back to the menu for the %s hard gate",
    async (status) => {
      const gate = createGate(status);
      await gate.updateComplete;
      const dialog = gate.querySelector('[role="dialog"]');
      const backToMenu = gate.querySelector<HTMLAnchorElement>(
        '[data-testid="webgl-return-menu"]',
      );
      expect(dialog?.getAttribute("aria-modal")).toBe("true");
      expect(dialog?.getAttribute("aria-labelledby")).toBe("webgl-gate-title");
      expect(backToMenu?.getAttribute("href")).toBe("/");
      expect(backToMenu?.textContent?.trim()).toBeTruthy();
      expect(
        gate.querySelector('[data-testid="webgl-continue-anyway"]'),
      ).toBeNull();
    },
  );

  it("keeps Continue anyway for the limited-texture warning only", async () => {
    const gate = createGate("limited");
    await gate.updateComplete;
    expect(
      gate.querySelector('[data-testid="webgl-continue-anyway"]'),
    ).not.toBeNull();
    expect(
      gate.querySelector('[data-testid="webgl-return-menu"]'),
    ).not.toBeNull();
  });
});
