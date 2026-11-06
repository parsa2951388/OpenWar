export type OpenWarEdition = "classic" | "operations";
export type OperationsOnlineAction = "public" | "private" | "join" | "direct";

const EDITION_STORAGE_KEY = "openwar.edition";
let activeEdition: OpenWarEdition | null = null;

/** Unknown, missing and legacy values resolve to Classic for backward compatibility. */
export function normalizeOpenWarEdition(value: string | null): OpenWarEdition {
  return value === "operations" ? "operations" : "classic";
}

export function getOpenWarEditionPreference(): OpenWarEdition {
  if (activeEdition !== null) return activeEdition;
  try {
    return normalizeOpenWarEdition(
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(EDITION_STORAGE_KEY),
    );
  } catch {
    return "classic";
  }
}

/** Keep every entry point in sync with the selection made by the edition hub. */
export function setOpenWarEditionPreference(edition: OpenWarEdition): void {
  activeEdition = edition;
  try {
    window.localStorage.setItem(EDITION_STORAGE_KEY, edition);
  } catch {
    // The current page still honours the in-memory selection.
  }
}

export function isOperationsEditionSelected(): boolean {
  return getOpenWarEditionPreference() === "operations";
}

/**
 * Operations is kept available on local development hosts for QA, but the
 * public online edition stays informational until its complete gameplay and
 * server-side entry paths have shipped.
 */
export function isOperationsPlayableHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function canPlayOperationsInCurrentBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    isOperationsPlayableHost(window.location.hostname)
  );
}

/** The public Operations online route is intentionally closed on production hosts. */
export function isOperationsOnlineLockedInCurrentBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    isOperationsEditionSelected() &&
    !canPlayOperationsInCurrentBrowser()
  );
}

/**
 * Route all blocked online actions to the same in-page maintenance explanation.
 * The method is optional so the gate remains safe during initial page boot.
 */
export function showOperationsOnlineMaintenance(
  action: OperationsOnlineAction = "direct",
): void {
  if (typeof document === "undefined") return;
  const hub = document.querySelector("openwar-edition-hub") as
    | (HTMLElement & {
        showOnlineMaintenance?: (nextAction?: OperationsOnlineAction) => void;
      })
    | null;
  hub?.showOnlineMaintenance?.(action);
}
