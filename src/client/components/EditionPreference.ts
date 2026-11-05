export const OPEN_WAR_EDITION_STORAGE_KEY = "openwar.edition";

export type OpenWarEdition = "classic" | "operations";

/** Unknown, missing and legacy values resolve to Classic for backward compatibility. */
export function normalizeOpenWarEdition(value: string | null): OpenWarEdition {
  return value === "operations" ? "operations" : "classic";
}

/** Read the persisted edition without letting unavailable browser storage break routing. */
export function isOperationsEditionSelected(): boolean {
  try {
    return (
      normalizeOpenWarEdition(
        window.localStorage.getItem(OPEN_WAR_EDITION_STORAGE_KEY),
      ) === "operations"
    );
  } catch {
    return false;
  }
}
