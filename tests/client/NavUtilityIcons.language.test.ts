import { afterEach, beforeEach, describe, expect, it } from "vitest";

import "../../src/client/LangSelector";
import "../../src/client/components/NavUtilityIcons";

type Mountable = HTMLElement & { updateComplete: Promise<unknown> };

async function mount(size: "desktop" | "mobile"): Promise<Mountable> {
  const el = document.createElement("nav-utility-icons") as Mountable;
  el.setAttribute("size", size);
  document.body.appendChild(el);
  await el.updateComplete;
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

describe("shared navigation language selector", () => {
  it.each(["desktop", "mobile"] as const)(
    "renders one functional language selector in %s navigation",
    async (size) => {
      const el = await mount(size);
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
