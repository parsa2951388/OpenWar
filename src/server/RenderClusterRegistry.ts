import { availableParallelism } from "node:os";

const DEFAULT_ATTEMPTS = 6;
const RETRY_DELAY_MS = 5_000;
const REQUEST_TIMEOUT_MS = 30_000;

export interface RenderClusterIdentity {
  site: string;
  host: string;
  letter: string;
  numWorkers: number;
}

interface RetryOptions {
  env?: NodeJS.ProcessEnv;
  fetchFn?: typeof fetch;
  attempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

interface RegistrationOptions extends RetryOptions {
  cpuCount?: number;
}

interface PublishOptions extends RetryOptions {
  verificationAttempts?: number;
}

class PermanentRegistryError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDnsHost(value: string | undefined): value is string {
  if (!value || value.length > 253) return false;
  const labels = value.split(".");
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
    )
  );
}

export function renderApiOrigin(env: NodeJS.ProcessEnv): string {
  const configured = env.OPENWAR_API_ORIGIN?.trim();
  if (!configured) {
    const domain = env.DOMAIN?.trim();
    if (domain === "localhost") return "http://localhost:8787";
    if (!isDnsHost(domain)) {
      throw new Error("A valid DOMAIN or OPENWAR_API_ORIGIN is required");
    }
    return `https://api.${domain}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("OPENWAR_API_ORIGIN must be an absolute URL");
  }
  const localHttp =
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  if (
    (parsed.protocol !== "https:" && !localHttp) ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(
      "OPENWAR_API_ORIGIN must be an HTTPS origin without a path",
    );
  }
  return parsed.origin;
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  if (!result) return undefined;
  return result;
}

function renderHosts(env: NodeJS.ProcessEnv): { site: string; host: string } {
  const subdomain = trimmed(env.SUBDOMAIN);
  const gameDomain = trimmed(env.GAME_DOMAIN) ?? trimmed(env.DOMAIN);
  const derivedHost =
    subdomain && gameDomain ? `${subdomain}.${gameDomain}` : undefined;
  const host =
    trimmed(env.GAME_HOST) ??
    trimmed(env.RENDER_EXTERNAL_HOSTNAME) ??
    derivedHost ??
    "";
  const site =
    trimmed(env.SITE_HOST) ?? trimmed(env.RENDER_EXTERNAL_HOSTNAME) ?? host;

  if (!isDnsHost(host) || !isDnsHost(site)) {
    throw new Error(
      "Render cluster registration requires valid SITE_HOST and GAME_HOST hostnames",
    );
  }
  return { site, host };
}

function configuredIdentity(
  env: NodeJS.ProcessEnv,
  site: string,
  host: string,
): RenderClusterIdentity | null {
  const letter = env.INSTANCE_LETTER?.trim();
  const workerCount = env.NUM_WORKERS?.trim();
  if (!letter && !workerCount) return null;
  if (!letter || !/^[a-z]$/.test(letter)) {
    throw new Error("INSTANCE_LETTER must be one lowercase letter");
  }
  const numWorkers = Number(workerCount);
  if (!Number.isSafeInteger(numWorkers) || numWorkers < 1) {
    throw new Error("NUM_WORKERS must be a positive integer");
  }
  return { site, host, letter, numWorkers };
}

function parseRegistration(value: unknown): {
  letter: string;
  numWorkers: number;
} {
  if (typeof value !== "object" || value === null) {
    throw new PermanentRegistryError(
      "Cluster registry returned an invalid identity response",
    );
  }
  const record = value as Record<string, unknown>;
  const letter = record.letter;
  const rawWorkers = record.numWorkers;
  const numWorkers =
    typeof rawWorkers === "number"
      ? rawWorkers
      : typeof rawWorkers === "string" && /^\d+$/.test(rawWorkers)
        ? Number(rawWorkers)
        : Number.NaN;
  if (
    typeof letter !== "string" ||
    !/^[a-z]$/.test(letter) ||
    !Number.isSafeInteger(numWorkers) ||
    numWorkers < 1
  ) {
    throw new PermanentRegistryError(
      "Cluster registry returned an invalid identity response",
    );
  }
  return { letter, numWorkers };
}

export async function registerRenderCluster(
  options: RegistrationOptions = {},
): Promise<RenderClusterIdentity> {
  const env = options.env ?? process.env;
  const fetchFn = options.fetchFn ?? fetch;
  const { site, host } = renderHosts(env);
  const configured = configuredIdentity(env, site, host);
  if (configured) {
    env.SITE_HOST ??= site;
    return configured;
  }

  const apiKey = env.API_KEY?.trim();
  if (!apiKey || apiKey.startsWith("WARNING_DEV_")) {
    throw new Error(
      "A valid API_KEY is required to register the Render game server",
    );
  }
  const cpus = options.cpuCount ?? availableParallelism();
  if (!Number.isSafeInteger(cpus) || cpus < 1) {
    throw new Error("Unable to determine a valid Render CPU count");
  }

  const apiOrigin = renderApiOrigin(env);
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  const sleepFn = options.sleepFn ?? sleep;
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchFn(`${apiOrigin}/cluster/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ site, host, cpus }),
        redirect: "error",
        signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      });
      lastStatus = response.status;

      if (
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500
      ) {
        throw new Error(`temporary registry response ${response.status}`);
      }
      if (!response.ok) {
        throw new PermanentRegistryError(
          `Cluster registry rejected this site or host (HTTP ${response.status})`,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new PermanentRegistryError(
          "Cluster registry returned a non-JSON identity response",
        );
      }
      const identity = parseRegistration(payload);
      env.SITE_HOST = site;
      env.INSTANCE_LETTER = identity.letter;
      env.NUM_WORKERS = String(identity.numWorkers);
      return { site, host, ...identity };
    } catch (error) {
      if (error instanceof PermanentRegistryError) throw error;
      if (attempt === attempts) break;
      await sleepFn(retryDelayMs);
    }
  }

  throw new Error(
    `Unable to register the Render game server after ${attempts} attempts${lastStatus ? ` (last HTTP ${lastStatus})` : ""}. Check the API origin, site registration, and API key configuration.`,
  );
}

interface ClusterServerEntry {
  host?: unknown;
  numWorkers?: unknown;
  version?: unknown;
  state?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function publishAndVerifyRenderCluster(
  identity: RenderClusterIdentity,
  options: PublishOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;
  const fetchFn = options.fetchFn ?? fetch;
  const apiKey = env.API_KEY?.trim();
  const version = trimmed(env.RENDER_GIT_COMMIT) ?? trimmed(env.GIT_COMMIT);
  if (!apiKey || apiKey.startsWith("WARNING_DEV_")) {
    throw new Error(
      "A valid API_KEY is required to publish the Render deployment",
    );
  }
  if (!version || !/^[0-9a-f]{40}$/i.test(version)) {
    throw new Error("Render must provide a full 40-character Git commit SHA");
  }

  const apiOrigin = renderApiOrigin(env);
  const attempts = options.attempts ?? 18;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  const sleepFn = options.sleepFn ?? sleep;
  let published = false;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchFn(`${apiOrigin}/cluster/latest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ site: identity.site, version }),
        redirect: "error",
        signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      });

      if (response.status === 404) {
        throw new PermanentRegistryError(
          "The API registry does not recognise this Open War site",
        );
      }
      if (
        response.status === 409 ||
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500
      ) {
        if (attempt === attempts) {
          throw new Error(
            "The API has not accepted the deployment version yet",
          );
        }
        await sleepFn(retryDelayMs);
        continue;
      }
      if (!response.ok) {
        throw new PermanentRegistryError(
          `The API rejected the deployment version (HTTP ${response.status})`,
        );
      }
      published = true;
      break;
    } catch (error) {
      if (error instanceof PermanentRegistryError) throw error;
      if (attempt === attempts) {
        throw new Error(
          `Unable to publish the Render deployment version after ${attempts} attempts`,
        );
      }
      await sleepFn(retryDelayMs);
    }
  }

  if (!published) {
    throw new Error("The Render deployment version was not published");
  }

  const verificationAttempts = options.verificationAttempts ?? 12;
  for (let attempt = 1; attempt <= verificationAttempts; attempt++) {
    const listUrl = new URL("/cluster.json", apiOrigin);
    listUrl.searchParams.set("site", identity.site);

    let response: Response;
    try {
      response = await fetchFn(listUrl, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
        redirect: "error",
        signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      });
    } catch {
      if (attempt === verificationAttempts) break;
      await sleepFn(retryDelayMs);
      continue;
    }

    if (response.status === 404) {
      throw new PermanentRegistryError(
        "The API registry returned Unknown site for the Render page hostname",
      );
    }
    if (response.status >= 500) {
      if (attempt === verificationAttempts) break;
      await sleepFn(retryDelayMs);
      continue;
    }
    if (!response.ok) {
      throw new PermanentRegistryError(
        `Unable to verify the Render server list (HTTP ${response.status})`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new PermanentRegistryError(
        "The API returned an invalid cluster server list",
      );
    }
    const servers = isRecord(payload) ? payload.servers : undefined;
    const entryValue = isRecord(servers) ? servers[identity.letter] : undefined;
    const entry = isRecord(entryValue)
      ? (entryValue as ClusterServerEntry)
      : undefined;

    if (entry) {
      if (entry.host !== identity.host) {
        throw new PermanentRegistryError(
          "The registered instance letter is bound to a different game host",
        );
      }
      if (entry.numWorkers !== identity.numWorkers) {
        throw new PermanentRegistryError(
          "The API registry worker count does not match this Render instance",
        );
      }
      if (entry.version !== version) {
        if (attempt === verificationAttempts) break;
        await sleepFn(retryDelayMs);
        continue;
      }
      if (
        entry.state === "open" &&
        isRecord(payload) &&
        payload.latest === version
      ) {
        return;
      }
    }

    if (attempt < verificationAttempts) await sleepFn(retryDelayMs);
  }

  throw new Error(
    "The API did not expose this Render instance as an open server for the deployed commit",
  );
}
