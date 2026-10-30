import { randomUUID } from "node:crypto";
import type { TokenPayload } from "@openfront/shared/ApiSchemas";
import { z } from "zod";
import { censorPlayer } from "./Censor";
import { ServerEnv } from "./ServerEnv";

const JoinVerifyVerdictSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("approved"),
    username: z.string(),
    clanTag: z.string().nullable().optional(),
  }),
  z.object({
    status: z.literal("rejected"),
    reason: z.string(),
    errorCodes: z.array(z.string()).optional(),
  }),
  z.object({
    status: z.literal("error"),
    reason: z.string(),
    username: z.string().optional(),
    clanTag: z.string().nullable().optional(),
  }),
]);

const TurnstileResponseSchema = z
  .object({
    success: z.boolean(),
    "error-codes": z.array(z.string()).optional(),
    hostname: z.string().optional(),
    action: z.string().optional(),
    cdata: z.string().optional(),
  })
  .passthrough();

export type JoinVerifyResponse =
  | { status: "approved"; username: string; clanTag: string | null }
  | { status: "rejected"; reason: string; errorCodes?: string[] }
  | {
      status: "error";
      reason: string;
      degraded: boolean;
      identity?: { username: string; clanTag: string | null };
    };

export type JoinVerifyPlan =
  | { action: "reject" }
  | { action: "skip" }
  | { action: "verify"; token: string | null };

export function isSteamAuthenticated(claims: TokenPayload | null): boolean {
  return claims?.provider === "steam";
}

export type ClientAuth = "account" | "anonymous";

export function clientAuth(claims: TokenPayload | null): ClientAuth {
  const provider = claims?.provider;
  return provider === undefined || provider === "guest"
    ? "anonymous"
    : "account";
}

export function planJoinVerify(args: {
  isReadmit: boolean;
  gameStarted: boolean;
  turnstileToken: string | null;
  identityUnchanged: boolean;
  steamAuthed: boolean;
}): JoinVerifyPlan {
  if (!args.isReadmit) {
    if (args.steamAuthed) {
      return { action: "verify", token: null };
    }

    if (!args.turnstileToken) {
      return { action: "reject" };
    }

    return { action: "verify", token: args.turnstileToken };
  }

  if (args.gameStarted || args.identityUnchanged) {
    return { action: "skip" };
  }

  return { action: "verify", token: null };
}

const inFlightByToken = new Map<string, Promise<JoinVerifyResponse>>();

function parseJoinVerifyResponse(data: unknown): JoinVerifyResponse {
  const parsed = JoinVerifyVerdictSchema.safeParse(data);

  if (!parsed.success) {
    return {
      status: "error",
      reason: `api-worker returned malformed response: ${parsed.error.message}`,
      degraded: false,
    };
  }

  if (parsed.data.status === "approved") {
    return {
      status: "approved",
      username: parsed.data.username,
      clanTag: parsed.data.clanTag ?? null,
    };
  }

  if (parsed.data.status === "error") {
    const { reason, username, clanTag } = parsed.data;

    return {
      status: "error",
      reason,
      degraded: true,
      ...(username !== undefined && {
        identity: { username, clanTag: clanTag ?? null },
      }),
    };
  }

  return parsed.data;
}

async function fetchJoinVerify(
  ip: string,
  token: string | null,
  username: string,
  clanTag: string | null,
): Promise<Response> {
  return fetch(`${ServerEnv.jwtIssuer()}/join_verify`, {
    method: "POST",
    signal: AbortSignal.timeout(5000),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ServerEnv.apiKey(),
    },
    body: JSON.stringify({ ip, token, username, clanTag }),
  });
}

async function verifyJoinRequest(
  ip: string,
  turnstileToken: string | null,
  username: string,
  clanTag: string | null,
): Promise<JoinVerifyResponse> {
  try {
    const response = await fetchJoinVerify(
      ip,
      turnstileToken,
      username,
      clanTag,
    );

    if (!response.ok) {
      return {
        status: "error",
        reason: `api-worker returned ${response.status}`,
        degraded: false,
      };
    }

    return parseJoinVerifyResponse(await response.json());
  } catch (error) {
    return {
      status: "error",
      reason: `api-worker unavailable: ${error}`,
      degraded: false,
    };
  }
}

/**
 * Standalone verification:
 * - A first-time join must pass Cloudflare Turnstile.
 * - Re-admits with no token only receive local name screening.
 * - A failed or unavailable Turnstile service rejects the join.
 * - OpenFront's join_verify API is never contacted.
 */
async function verifyStandaloneJoin(
  ip: string,
  turnstileToken: string | null,
  username: string,
  clanTag: string | null,
): Promise<JoinVerifyResponse> {
  const screenedIdentity = censorPlayer(username, clanTag);

  // A null token is allowed only for a re-admit whose original session
  // has already passed the first-join Turnstile check.
  if (turnstileToken === null || turnstileToken.length === 0) {
    return {
      status: "approved",
      username: screenedIdentity.username,
      clanTag: screenedIdentity.clanTag,
    };
  }

  let secret: string;

  try {
    secret = ServerEnv.turnstileSecretKey();
  } catch {
    return {
      status: "rejected",
      reason: "Turnstile server secret is not configured",
      errorCodes: ["turnstile-secret-missing"],
    };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", turnstileToken);
  body.set("idempotency_key", randomUUID());

  if (ip && ip !== "unknown") {
    body.set("remoteip", ip);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      return {
        status: "rejected",
        reason: "Turnstile verification service returned an HTTP error",
        errorCodes: [`http-${response.status}`],
      };
    }

    const responseBody: unknown = await response.json();
    const parsed = TurnstileResponseSchema.safeParse(responseBody);

    if (!parsed.success) {
      return {
        status: "rejected",
        reason: "Turnstile returned an invalid response",
        errorCodes: ["invalid-turnstile-response"],
      };
    }

    if (!parsed.data.success) {
      return {
        status: "rejected",
        reason: "Turnstile verification failed",
        errorCodes: parsed.data["error-codes"] ?? ["verification-failed"],
      };
    }

    return {
      status: "approved",
      username: screenedIdentity.username,
      clanTag: screenedIdentity.clanTag,
    };
  } catch {
    // Fail closed: do not admit a first-time player when the anti-bot
    // verification service cannot be reached.
    return {
      status: "rejected",
      reason: "Turnstile verification service is unavailable",
      errorCodes: ["turnstile-unavailable"],
    };
  }
}

/**
 * Verifies a join using the appropriate authentication backend.
 *
 * Standalone mode uses Cloudflare directly and local name screening.
 * Normal OpenFront mode keeps its existing API verification behavior.
 */
export async function verifyJoin(
  ip: string,
  turnstileToken: string | null,
  username: string,
  clanTag: string | null,
  persistentId?: string,
): Promise<JoinVerifyResponse> {
  const verifier = ServerEnv.standaloneMode()
    ? verifyStandaloneJoin
    : verifyJoinRequest;

  if (turnstileToken !== null && turnstileToken.length > 0) {
    const key = `${turnstileToken}\0${persistentId ?? ""}\0${username}\0${clanTag ?? ""}`;

    const inFlight = inFlightByToken.get(key);

    if (inFlight) {
      return inFlight;
    }

    const promise = verifier(
      ip,
      turnstileToken,
      username,
      clanTag,
    ).finally(() => {
      inFlightByToken.delete(key);
    });

    inFlightByToken.set(key, promise);

    return promise;
  }

  return verifier(ip, turnstileToken, username, clanTag);
}

export function _inFlightTokenCount(): number {
  return inFlightByToken.size;
}

export function _clearInFlightTokens(): void {
  inFlightByToken.clear();
  }
