import { afterEach, beforeEach, describe, expect, it } from "vitest";

import "../../src/client/LangSelector";
import "../../src/client/components/DesktopNavBar";
import "../../src/client/components/MobileNavBar";

type Mountable = HTMLElement & { updateComplete: Promise<unknown> };

async function mount(tag: "desktop-nav-bar" | "mobile-nav-bar"): Promise<Mountable> {
  const el = document.createElement(tag) as Mountable;
  document.body.appendChild(el);
  await el.updateComplete;
  const utilityIcons = el.querySelector("nav-utility-icons") as
    | (HTMLElement & { updateComplete?: Promise<unknown> })
    | null;
  await utilityIcons?.updateComplete;
  const selector = el.querySelector("lang-selector") as
    | (HTMLElement & { updateComplete?: Promise<unknown> })
    | null;
  await selector?.updateComplete;
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  window.currentPageId = "page-play";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("navigation language selector", () => {
  it.each([
    ["desktop", "desktop-nav-bar"],
    ["mobile", "mobile-nav-bar"],
  ] as const)(
    "renders one functional language selector in the %s navigation",
    async (_label, tag) => {
      const el = await mount(tag);
      const selector = el.querySelector("lang-selector");
      expect(selector).not.toBeNull();
      expect(el.querySelectorAll("lang-selector")).toHaveLength(1);
      expect(selector?.querySelector("#lang-selector")).not.toBeNull();
      expect(
        selector?.querySelector<HTMLButtonElement>("#lang-selector")?.title,
      ).toBe("Change Language");
    },
  );
});
