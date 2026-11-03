import { describe, expect, it } from "vitest";
import { normalizeOpenWarEdition } from "../../src/client/components/EditionHub";

describe("Open War edition preference", () => {
  it("defaults missing and unknown values to Classic for backward compatibility", () => {
    expect(normalizeOpenWarEdition(null)).toBe("classic");
    expect(normalizeOpenWarEdition("legacy")).toBe("classic");
    expect(normalizeOpenWarEdition("")).toBe("classic");
  });

  it("recognises the Operations edition", () => {
    expect(normalizeOpenWarEdition("operations")).toBe("operations");
  });
});
