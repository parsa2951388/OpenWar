import { describe, expect, it } from "vitest";
import {
  isOperationsPlayableHost,
  normalizeOpenWarEdition,
  setOpenWarEditionPreference,
  shouldBlockOperationsOnlineEntry,
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
    expect(
      shouldBlockOperationsOnlineEntry(
        "operations",
        "open-war-game.onrender.com",
      ),
    ).toBe(true);
    expect(shouldBlockOperationsOnlineEntry("operations", "example.com")).toBe(
      true,
    );
    expect(
      shouldBlockOperationsOnlineEntry("classic", "open-war-game.onrender.com"),
    ).toBe(false);
    expect(shouldBlockOperationsOnlineEntry("operations", "localhost")).toBe(
      false,
    );
  });

  it("keeps the public gate scoped to Operations and production hosts", () => {
    setOpenWarEditionPreference("operations");
    expect(normalizeOpenWarEdition("operations")).toBe("operations");
    setOpenWarEditionPreference("classic");
  });

  it("recognises the Operations edition", () => {
    expect(normalizeOpenWarEdition("operations")).toBe("operations");
  });
});
