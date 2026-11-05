export type OpenWarEdition = "classic" | "operations";

/** Unknown, missing and legacy values resolve to Classic for backward compatibility. */
export function normalizeOpenWarEdition(value: string | null): OpenWarEdition {
  return value === "operations" ? "operations" : "classic";
}
