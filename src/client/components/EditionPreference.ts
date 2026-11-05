export const OPEN_WAR_EDITION_STORAGE_KEY = "openwar.edition";

export type OpenWarEdition = "classic" | "operations";

let sessionEdition: OpenWarEdition | null = null;

/** Unknown, missing and legacy values resolve to Classic for backward compatibility. */
export function normalizeOpenWarEdition(value: string | null): OpenWarEdition {
  return value === "operations" ? "operations" : "classic";
}

/** Read the selected edition even when browser storage is unavailable. */
export function readOpenWarEditionPreference(): OpenWarEdition {
  if (sessionEdition !== null) return sessionEdition;
  try {
    return normalizeOpenWarEdition(
      window.localStorage.getItem(OPEN_WAR_EDITION_STORAGE_KEY),
    );
  } catch {
    return "classic";
  }
}

/** Persist the selection and keep a session fallback if storage is blocked. */
export function setOpenWarEditionPreference(
  edition: OpenWarEdition,
): void {
  sessionEdition = edition;
  try {
    window.localStorage.setItem(OPEN_WAR_EDITION_STORAGE_KEY, edition);
  } catch {
    // The current page session still remembers the selected edition.
  }
}

export function isOperationsEditionSelected(): boolean {
  return readOpenWarEditionPreference() === "operations";
}
