import { describe, expect, it } from "vitest";
import {
  isOperationsPlayableHost,
  normalizeOpenWarEdition,
} from "../../src/client/components/EditionPreference";

describe("Open War edition preference", () => {
  it("defaults missing and unknown values to Classic for backward compatibility", () => {
    expect(normalizeOpenWarEdition(null)).toBe("classic");
    expect(normalizeOpenWarEdition("legacy")).toBe("classic");
    expect(normalizeOpenWarEdition("")).toBe("classic");
  });

  it("keeps Operations playable only on local development hosts", () => {
    expect(isOperationsPlayableHost("localhost")).toBe(true);
    expect(isOperationsPlayableHost("127.0.0.1")).toBe(true);
    expect(isOperationsPlayableHost("open-war-game.onrender.com")).toBe(false);
    expect(isOperationsPlayableHost("open-war-8o2.pages.dev")).toBe(false);
    expect(isOperationsPlayableHost("example.com")).toBe(false);
  });

  it("recognises the Operations edition", () => {
    expect(normalizeOpenWarEdition("operations")).toBe("operations");
  });
});
