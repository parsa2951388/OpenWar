import { describe, expect, it } from "vitest";
import {
  isOperationsEditionSelected,
  normalizeOpenWarEdition,
} from "../../src/client/components/EditionPreference";

describe("Open War edition preference", () => {
  it("defaults missing and unknown values to Classic for backward compatibility", () => {
    expect(normalizeOpenWarEdition(null)).toBe("classic");
    expect(normalizeOpenWarEdition("legacy")).toBe("classic");
    expect(normalizeOpenWarEdition("")).toBe("classic");
  });

  it("recognises the Operations edition", () => {
    expect(normalizeOpenWarEdition("operations")).toBe("operations");
  });

  it("reads the persisted Operations gate without affecting Classic", () => {
    window.localStorage.setItem("openwar.edition", "operations");
    expect(isOperationsEditionSelected()).toBe(true);
    window.localStorage.setItem("openwar.edition", "classic");
    expect(isOperationsEditionSelected()).toBe(false);
    window.localStorage.removeItem("openwar.edition");
  });
});
