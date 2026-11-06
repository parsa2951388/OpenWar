export type OpenWarEdition = "classic" | "operations";

/** Unknown, missing and legacy values resolve to Classic for backward compatibility. */
export function normalizeOpenWarEdition(value: string | null): OpenWarEdition {
  return value === "operations" ? "operations" : "classic";
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
