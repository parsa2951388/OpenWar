import { availableParallelism } from "node:os";
import { z } from "zod";
import { ServerEnv } from "./ServerEnv";

// Multi-server v2 (docs/MultiServer.md, "Server list v2"): every server
// tells the API on boot and every CHECKIN_INTERVAL_MS who it is and what it
// runs, and the API answers with whether this server should take new games.
// The API's list is what clients read (src/client/ServerList.ts), so a
// server that is not checking in is not offered to anyone; a deploy that
// fails halfway can't leave the list claiming servers that aren't there.

export const CHECKIN_INTERVAL_MS = 10_000;
const CHECKIN_TIMEOUT_MS = 8_000;
const REGISTER_ATTEMPTS = 3;
const REGISTER_RETRY_DELAY_MS = 2_000;

// The states the API assigns (infra #700), the same vocabulary the client
// reads from GET /cluster.json:
//   open: runs the site's `latest` and isn't fenced, so it takes new games.
//   draining: on its way out (an older version, a deploy moving off it);
//     existing games and rejoins still work, it just gets no new ones.
//   fenced: deliberately held out of rotation by an operator. Same effect
//     here as draining, but the API keeps them apart so the list can say
//     why. Only "open" takes new games, so a state we fail to recognise
//     must never be read as open (see sendCheckin: it returns null).
const ServerStateSchema = z.enum(["open", "draining", "fenced"]);
export type ServerState = z.infer<typeof ServerStateSchema>;

// The API binds a letter to a host for good and answers 409 to any other
// host claiming it. The API routes that letter's games elsewhere, so a
// refused server must take no new ones.
export interface CheckinRefusal {
  refused: string;
}
export type CheckinResult = ServerState | CheckinRefusal | null;

export function isRefusal(result: CheckinResult): result is CheckinRefusal {
  return typeof result === "object" && result !== null;
}

export interface CheckinBody {
  // The PAGE host: the hostname players load the page from (SITE_HOST) —
  // the apex behind a load balancer, `<subdomain>.<DOMAIN>` where a separate
  // GAME_DOMAIN gives the deployment two names (docs/MultiServer.md, "Two
  // hostnames per deployment"), else this deployment's own host, so an
  // old-style beta, nightly, alpha or branch preview registers under itself.
  // Lists are keyed by it. Mirrors, such as the openfront.dev apex serving
  // nightly, are an alias table in the API, never something a server reports
  // about itself.
  site: string;
  letter: string;
  // The GAME host: where clients open sockets and send /api for games this
  // server runs (ServerEnv.publicHost). Distinct from `site` whenever
  // something else owns the page host — a load balancer on prod, the static
  // Worker on a dev deployment with GAME_DOMAIN set.
  host: string;
  // GIT_COMMIT, the full sha. Clients compare it prefix-tolerantly.
  version: string;
  numWorkers: number;
  liveGames: number;
  // The machine this container runs on (ServerEnv.machine(), ultimately
  // deploy.sh's machine argument): `falk2`, `nbg2`, `staging`. The registry
  // uses it to keep a site to at most one OPEN server per machine (OPE-455),
  // since blue and green frequently share a box. Omitted entirely when
  // MACHINE is unset or malformed — the registry's schema predates the field
  // and an absent key is exactly what it expects.
  machine?: string;
}

const CheckinReplySchema = z.object({ state: ServerStateSchema });
const RegisterReplySchema = z.object({
  letter: z.string().regex(/^[a-z]$/),
  numWorkers: z.number().int().positive(),
});
const RefusalBodySchema = z.object({
  reason: z.string().optional(),
  host: z.string().optional(),
});

/**
 * The site this server registers under: the page host (SITE_HOST — the apex
 * for blue/green, `<subdomain>.<DOMAIN>` under GAME_DOMAIN), else its own
 * public host for an old-style standalone deploy. Undefined under local
 * development, where there is no public host and nothing registers. The
 * ranked check-in names the same site (RankedCheckin.ts), so the API pools
 * this server only with players whose page reads this site's list.
 */
export function registeredSite(): string | undefined {
  return ServerEnv.siteHost() ?? ServerEnv.publicHost();
}

/**
 * What this server reports, or null under local development (`npm run dev`:
 * no SUBDOMAIN, so no public host), where there is nothing to register.
 * Every deployed host has one and registers under its own site.
 */
export function checkinBody(liveGames: number): CheckinBody | null {
  const host = ServerEnv.publicHost();
  if (host === undefined) return null;
  const machine = ServerEnv.machine();
  return {
    site: registeredSite() ?? host,
    letter: ServerEnv.instanceLetter(),
    host,
    version: ServerEnv.gitCommit(),
    numWorkers: ServerEnv.numWorkers(),
    liveGames,
    // Spread, not `machine: undefined`: JSON.stringify would drop the key
    // either way, but an explicit undefined would make every equality
    // assertion here and every future reader wonder which it is.
    ...(machine !== undefined ? { machine } : {}),
  };
}

/**
 * Register a new page/game host before it starts checking in. The registry
 * assigns the permanent letter and, when not explicitly configured, the
 * worker count. Without this step a new site has no record and
 * GET /cluster.json returns "Unknown site".
 *
 * Production deployments that already carry both values from deploy.sh do
 * not register again. Standalone Render/test deployments with a public host
 * register once at startup and preserve any explicitly configured value.
 */
export async function registerClusterIdentity(
  fetchFn: typeof fetch = fetch,
  cpus: number = availableParallelism(),
): Promise<boolean> {
  if (process.env.OPENWAR_LOCAL_PREVIEW === "true") return false;

  const host = ServerEnv.publicHost();
  if (host === undefined) return false;

  const site = registeredSite() ?? host;
  const hasInstanceLetter = Boolean(process.env.INSTANCE_LETTER?.trim());
  const hasNumWorkers = Boolean(process.env.NUM_WORKERS?.trim());
  if (hasInstanceLetter && hasNumWorkers) return false;

  if (!Number.isInteger(cpus) || cpus < 1) {
    throw new Error(`Invalid CPU count for cluster registration: ${cpus}`);
  }

  // A same-origin API_ORIGIN is the Render-side browser proxy. At master
  // startup the HTTP listener is not up yet, so registration must go straight
  // to the real API host instead of calling back into this process.
  const apiOrigin = ServerEnv.apiOrigin();
  const isSameOriginProxy = apiOrigin === `https://${host}`;
  const issuer = isSameOriginProxy
    ? `https://api.${ServerEnv.jwtAudience()}`
    : ServerEnv.jwtIssuer();
  const url = `${issuer}/cluster/register`;
  const body = JSON.stringify({ site, host, cpus });
  let lastError: Error = new Error("No registration attempt completed");

  for (let attempt = 1; attempt <= REGISTER_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...ServerEnv.apiKeyHeaders(),
        },
        body,
        signal: AbortSignal.timeout(CHECKIN_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < REGISTER_ATTEMPTS) {
        await new Promise((resolve) =>
          setTimeout(resolve, REGISTER_RETRY_DELAY_MS),
        );
        continue;
      }
      break;
    }

    if (response.status >= 400 && response.status < 500) {
      const detail = await response.text().catch(() => "");
      const detailSuffix = detail ? `: ${detail.slice(0, 300)}` : "";
      throw new Error(
        `Cluster registration refused ${host} on ${site} ` +
          `(HTTP ${response.status})${detailSuffix}`,
      );
    }

    if (!response.ok) {
      lastError = new Error(
        `Cluster registration returned HTTP ${response.status}`,
      );
      if (attempt < REGISTER_ATTEMPTS) {
        await new Promise((resolve) =>
          setTimeout(resolve, REGISTER_RETRY_DELAY_MS),
        );
      }
      continue;
    }

    const parsed = RegisterReplySchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!parsed.success) {
      throw new Error(
        "Cluster registration returned an invalid identity. " +
          "Expected a lowercase letter and a positive worker count.",
      );
    }

    if (!hasInstanceLetter) {
      process.env.INSTANCE_LETTER = parsed.data.letter;
    }
    if (!hasNumWorkers) {
      process.env.NUM_WORKERS = String(parsed.data.numWorkers);
    }
    return true;
  }

  throw new Error(
    `Could not register ${host} after ${REGISTER_ATTEMPTS} attempts: ` +
      lastError.message,
  );
}

/**
 * One check-in. Returns the state the API assigned, a refusal when the API
 * rejects this server's identity (409), or null when the answer is unusable
 * (the API predates the registry, a bot challenge, a network error). Callers
 * must treat null as "no change", never as "drain": the failure mode of an
 * unreachable API is the status quo.
 */
export async function sendCheckin(
  body: CheckinBody,
  fetchFn: typeof fetch = fetch,
): Promise<CheckinResult> {
  try {
    const res = await fetchFn(`${ServerEnv.jwtIssuer()}/cluster/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...ServerEnv.apiKeyHeaders(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CHECKIN_TIMEOUT_MS),
    });
    if (res.status === 409) {
      const detail = RefusalBodySchema.safeParse(
        await res.json().catch(() => null),
      );
      const { reason, host } = detail.success ? detail.data : {};
      return {
        refused: `${reason ?? "no reason given"}${host ? ` (host: ${host})` : ""}`,
      };
    }
    if (!res.ok) return null;
    const parsed = CheckinReplySchema.safeParse(await res.json());
    return parsed.success ? parsed.data.state : null;
  } catch {
    return null;
  }
}

/**
 * Turn a check-in reply into the lobby service's active flag. Active means
 * "open"; draining, fenced and refused all stop new games.
 */
export function applyCheckinState(
  result: CheckinResult,
  setActive: (active: boolean) => void,
): void {
  if (result === null) return;
  setActive(result === "open");
}
