import { ClientEnv } from "./ClientEnv";

// The account/shop API origin (api.<audience>). Lives apart from Api.ts so
// modules that Api.ts itself depends on (ServerList) can reach it without an
// import cycle; Api.ts re-exports both for its existing importers.

export function getApiBase() {
  // Keep the accessor optional at runtime. The production ClientEnv always
  // provides it, but older desktop shells and focused unit-test adapters may
  // only provide jwtAudience(). In those cases the audience-based origin is
  // still the correct, backwards-compatible fallback.
  const apiOrigin =
    typeof ClientEnv.apiOrigin === "function"
      ? ClientEnv.apiOrigin()
      : undefined;
  if (apiOrigin) return apiOrigin;

  const domainname = getAudience();

  if (domainname === "localhost") {
    const apiDomain = process.env.API_DOMAIN;
    if (apiDomain) {
      return `https://${apiDomain}`;
    }
    return localStorage.getItem("apiHost") ?? "http://localhost:8787";
  }

  return `https://api.${domainname}`;
}

export function getAudience() {
  // Sourced from BOOTSTRAP_CONFIG (server/desktop-injected) rather than
  // window.location, so the desktop app (app://openfront) targets real infra.
  return ClientEnv.jwtAudience();
}
