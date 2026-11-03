import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientEnv } from "../../src/client/ClientEnv";
import "../../src/client/LangSelector";
import "../../src/client/components/DesktopNavBar";
import "../../src/client/components/MobileNavBar";
import { translateText } from "../../src/client/Utils";

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
  localStorage.setItem("lang", "en");
  ClientEnv.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.BOOTSTRAP_CONFIG = undefined;
  localStorage.removeItem("lang");
  ClientEnv.reset();
});

describe("language selector navigation mount", () => {
  it("mounts the language selector in the desktop navigation", async () => {
    const nav = mount("desktop-nav-bar");
    await nav.updateComplete;

    expect(nav.querySelector("lang-selector")).not.toBeNull();
    await vi.waitFor(() => expect(translateText("main.solo")).toBe("Solo"));
  });

  it("opens the shared language picker from the mobile navigation", async () => {
    const desktop = mount("desktop-nav-bar");
    const mobile = mount("mobile-nav-bar");
    await Promise.all([desktop.updateComplete, mobile.updateComplete]);

    const languageModal = document.createElement("language-modal");
    languageModal.id = "page-language";
    document.body.appendChild(languageModal);
    const showPage = vi.fn();
    window.showPage = showPage;

    expect(desktop.querySelectorAll("lang-selector")).toHaveLength(1);
    expect(mobile.querySelectorAll("lang-selector")).toHaveLength(0);

    const trigger = mobile.querySelector<HTMLButtonElement>(
      "[data-language-picker-trigger]",
    );
    expect(trigger).not.toBeNull();
    trigger!.click();

    await vi.waitFor(() => expect(showPage).toHaveBeenCalledWith("page-language"));
  });
});
