import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/client/LangSelector";
import "../../src/client/components/DesktopNavBar";
import "../../src/client/components/MobileNavBar";

type Mountable = HTMLElement & { updateComplete: Promise<unknown> };

async function mountNavigation(): Promise<{
  desktop: Mountable;
  mobile: Mountable;
  selector: HTMLElement & { updateComplete: Promise<unknown> };
}> {
  const desktop = document.createElement("desktop-nav-bar") as Mountable;
  const mobile = document.createElement("mobile-nav-bar") as Mountable;
  document.body.append(desktop, mobile);
  await Promise.all([desktop.updateComplete, mobile.updateComplete]);

  const utilityIcons = desktop.querySelector("nav-utility-icons") as
    | Mountable
    | null;
  await utilityIcons?.updateComplete;

  const selector = document.querySelector("lang-selector") as
    | (HTMLElement & { updateComplete: Promise<unknown> })
    | null;
  if (!selector) throw new Error("Shared language selector did not render");
  await selector.updateComplete;
  return { desktop, mobile, selector };
}

beforeEach(() => {
  document.body.innerHTML = "";
  window.currentPageId = "page-play";
});

afterEach(() => {
  document.body.innerHTML = "";
  window.showPage = undefined;
});

describe("shared desktop/mobile language selection", () => {
  it("mounts exactly one language selector for both navigation layouts", async () => {
    const { desktop, mobile, selector } = await mountNavigation();

    expect(document.querySelectorAll("lang-selector")).toHaveLength(1);
    expect(desktop.querySelector("lang-selector")).toBe(selector);
    expect(mobile.querySelector("lang-selector")).toBeNull();
    expect(
      selector.querySelector<HTMLButtonElement>("#lang-selector")?.title,
    ).toBe("Change Language");
  });

  it("opens the shared language page from the mobile sidebar action", async () => {
    const { mobile } = await mountNavigation();
    const showPage = vi.fn();
    window.showPage = showPage;
    const page = document.createElement("div");
    page.id = "page-language";
    document.body.appendChild(page);

    const trigger = mobile.querySelector<HTMLButtonElement>(
      '[data-action="open-language-selector"]',
    );
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("data-i18n-aria-label")).toBe(
      "select_lang.title",
    );

    trigger?.click();
    await vi.waitFor(() => {
      expect(showPage).toHaveBeenCalledWith("page-language");
    });
  });
});
