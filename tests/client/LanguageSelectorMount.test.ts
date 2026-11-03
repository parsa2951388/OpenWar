import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClientEnv } from "../../src/client/ClientEnv";
import "../../src/client/LangSelector";
import "../../src/client/components/DesktopNavBar";
import "../../src/client/components/MobileNavBar";

type LitElementLike = HTMLElement & { updateComplete: Promise<unknown> };

function mount(tag: "desktop-nav-bar" | "mobile-nav-bar"): LitElementLike {
  const element = document.createElement(tag) as LitElementLike;
  document.body.appendChild(element);
  return element;
}

beforeEach(() => {
  window.BOOTSTRAP_CONFIG = {
    gameEnv: "dev",
    numWorkers: 1,
    turnstileSiteKey: "",
    jwtAudience: "test",
    instanceId: "test",
    gitCommit: "test",
  };
  window.currentPageId = "page-play";
  ClientEnv.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.BOOTSTRAP_CONFIG = undefined;
  ClientEnv.reset();
});

describe("language selector navigation mount", () => {
  it("mounts the language selector in the desktop navigation", async () => {
    const nav = mount("desktop-nav-bar");
    await nav.updateComplete;

    expect(nav.querySelector("lang-selector")).not.toBeNull();
  });

  it("mounts the language selector in the mobile navigation", async () => {
    const nav = mount("mobile-nav-bar");
    await nav.updateComplete;

    expect(nav.querySelector("lang-selector")).not.toBeNull();
  });
});
