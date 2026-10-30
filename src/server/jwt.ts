
import { randomUUID } from "node:crypto";
import {
  TokenPayload,
  TokenPayloadSchema,
  UserMeResponse,
  UserMeResponseSchema,
} from "@openfront/shared/ApiSchemas";
import { base64urlToUuid, uuidToBase64url } from "@openfront/shared/Base64";
import { CloseCode, CloseReason } from "@openfront/shared/CloseCodes";
import { GameEnv } from "@openfront/shared/configuration/Env";
import { PersistentIdSchema } from "@openfront/shared/WireSchemas";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { ServerEnv } from "./ServerEnv";

const GUEST_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

type TokenVerificationResult =
  | {
      type: "success";
      persistentId: string;
      claims: TokenPayload | null;
    }
  | { type: "error"; message: string };

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

/**
 * Creates a signed, long-lived guest token for an OpenWar standalone server.
 *
 * The server generates the persistent identity. The client must never choose
 * another player's persistent ID or submit a plain UUID as authorization.
 *
 * The returned JWT is a bearer credential and must be stored and transmitted
 * securely by the client.
 */
export async function createGuestToken(): Promise<{
  token: string;
  persistentId: string;
  expiresIn: number;
}> {
  if (!ServerEnv.standaloneMode()) {
    throw new Error(
      "Guest token issuance is available only in OpenWar standalone mode",
    );
  }

  const persistentId = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + GUEST_TOKEN_TTL_SECONDS;

  const token = await new SignJWT({
    provider: "guest",
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuer(ServerEnv.guestJwtIssuer())
    .setAudience(ServerEnv.jwtAudience())
    .setSubject(uuidToBase64url(persistentId))
    .setJti(randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(ServerEnv.guestJwtSecret());

  return {
    token,
    persistentId,
    expiresIn: GUEST_TOKEN_TTL_SECONDS,
  };
}

/**
 * Verifies an OpenWar guest token.
 *
 * Guest tokens are accepted only when standalone mode is explicitly enabled.
 * The signature, algorithm, issuer, audience, expiration and payload shape
 * are all checked before the persistent identity is trusted.
 */
async function verifyGuestToken(
  token: string,
): Promise<TokenVerificationResult> {
  try {
    const { payload } = await jwtVerify(
      token,
      ServerEnv.guestJwtSecret(),
      {
        algorithms: ["HS256"],
        issuer: ServerEnv.guestJwtIssuer(),
        audience: ServerEnv.jwtAudience(),
      },
    );

    const result = TokenPayloadSchema.safeParse(payload);

    if (!result.success) {
      return {
        type: "error",
        message: z.prettifyError(result.error),
      };
    }

    const claims = result.data;

    if (claims.provider !== "guest") {
      return {
        type: "error",
        message: "Token is not an OpenWar guest token",
      };
    }

    // Guest sessions have no OpenFront account profile. Returning null claims
    // makes the existing Worker join path treat this player as anonymous.
    return {
      type: "success",
      persistentId: claims.sub,
      claims: null,
    };
  } catch (error) {
    return {
      type: "error",
      message: errorMessage(error),
    };
  }
}

/**
 * Verifies a play token.
 *
 * Standalone mode accepts only OpenWar-issued guest JWTs. It never downloads
 * OpenFront's JWKS and never falls back to accepting a plain persistent ID.
 *
 * Non-standalone mode preserves the existing development and OpenFront API
 * authentication paths.
 */
export async function verifyClientToken(
  token: string,
): Promise<TokenVerificationResult> {
  if (ServerEnv.standaloneMode()) {
    return verifyGuestToken(token);
  }

  if (PersistentIdSchema.safeParse(token).success) {
    if (ServerEnv.env() === GameEnv.Dev) {
      return {
        type: "success",
        persistentId: token,
        claims: null,
      };
    }

    return {
      type: "error",
      message: "persistent ID not allowed in production",
    };
  }

  try {
    const issuer = ServerEnv.jwtIssuer();
    const audience = ServerEnv.jwtAudience();
    const key = await ServerEnv.jwkPublicKey();

    const { payload } = await jwtVerify(token, key, {
      algorithms: ["EdDSA"],
      issuer,
      audience,
    });

    const result = TokenPayloadSchema.safeParse(payload);

    if (!result.success) {
      return {
        type: "error",
        message: z.prettifyError(result.error),
      };
    }

    const claims = result.data;

    return {
      type: "success",
      persistentId: claims.sub,
      claims,
    };
  } catch (error) {
    return {
      type: "error",
      message: errorMessage(error),
    };
  }
}

// status is the API's HTTP status; unset for network and parse failures.
export type UserMeError = {
  type: "error";
  status?: number;
  message: string;
};

export async function getUserMe(
  token: string,
): Promise<
  { type: "success"; response: UserMeResponse } | UserMeError
> {
  // Guest tokens intentionally have no account profile. The Worker join
  // handler should not call this function for a guest session.
  if (ServerEnv.standaloneMode()) {
    return {
      type: "error",
      message: "Account profiles are unavailable in standalone mode",
    };
  }

  try {
    const response = await fetch(
      ServerEnv.jwtIssuer() + "/users/@me",
      {
        headers: {
          authorization: `Bearer ${token}`,
          "x-api-key": ServerEnv.apiKey(),
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (response.status !== 200) {
      return {
        type: "error",
        status: response.status,
        message: `Failed to fetch user me: ${response.statusText}`,
      };
    }

    const body: unknown = await response.json();
    const result = UserMeResponseSchema.safeParse(body);

    if (!result.success) {
      return {
        type: "error",
        message: `Invalid response: ${z.prettifyError(result.error)}`,
      };
    }

    return {
      type: "success",
      response: result.data,
    };
  } catch (error) {
    return {
      type: "error",
      message: `Failed to fetch user me: ${errorMessage(error)}`,
    };
  }
}

// How a join closes when /users/@me fails. A 401/403 is the API's rejection
// of the session itself: retrying with the same token cannot succeed.
export function userMeFailureClose(error: UserMeError): {
  code: CloseCode;
  reason: CloseReason;
} {
  if (error.status === 401 || error.status === 403) {
    return {
      code: CloseCode.Unauthorized,
      reason: CloseReason.InvalidToken,
    };
  }

  return {
    code: CloseCode.InternalError,
    reason: CloseReason.AccountLookupFailed,
  };
}
