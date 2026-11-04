import { UserMeResponseSchema } from "@openfront/shared/ApiSchemas";
import { base64urlToUuid, uuidToBase64url } from "@openfront/shared/Base64";
import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import { importPKCS8, jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { verifyClientToken } from "./jwt";
import { ServerEnv } from "./ServerEnv";

const GUEST_INPUT = z.object({ persistentId: z.string().uuid() });
const REFRESH_COOKIE = "__Host-openwar_refresh";
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const ACCESS_TTL_SECONDS = 15 * 60;

let signingKey: ReturnType<typeof importPKCS8> | null = null;

function privateSigningKey() {
  if (signingKey === null) {
    const pem = ServerEnv.jwtPrivateKey();
    if (!pem)
      throw new Error("JWT_PRIVATE_KEY is required for self-hosted auth");
    signingKey = importPKCS8(pem, "EdDSA");
  }
  return signingKey;
}

function cookieValue(req: Request, name: string): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

function setRefreshCookie(res: Response, token: string): void {
  res.setHeader(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${encodeURIComponent(token)}; Max-Age=${REFRESH_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}

function clearRefreshCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}

async function signGuestToken(persistentId: string): Promise<string> {
  return new SignJWT({ provider: "guest", token_use: "access" })
    .setProtectedHeader({
      alg: "EdDSA",
      typ: "JWT",
      kid: ServerEnv.jwtKeyId(),
    })
    .setIssuer(ServerEnv.jwtIssuer())
    .setAudience(ServerEnv.jwtAudience())
    .setSubject(uuidToBase64url(persistentId))
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(await privateSigningKey());
}

async function signRefreshToken(persistentId: string): Promise<string> {
  return new SignJWT({ provider: "guest", token_use: "refresh" })
    .setProtectedHeader({
      alg: "EdDSA",
      typ: "JWT",
      kid: ServerEnv.jwtKeyId(),
    })
    .setIssuer(ServerEnv.jwtIssuer())
    .setAudience(ServerEnv.jwtAudience())
    .setSubject(uuidToBase64url(persistentId))
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL_SECONDS}s`)
    .sign(await privateSigningKey());
}

async function sendGuestSession(
  res: Response,
  persistentId: string,
  account?: { email?: string; emailVerified?: boolean },
): Promise<void> {
  const [jwt, refreshToken] = await Promise.all([
    signGuestToken(persistentId),
    signRefreshToken(persistentId),
  ]);
  setRefreshCookie(res, refreshToken);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    jwt,
    expiresIn: ACCESS_TTL_SECONDS,
    ...(account?.email ? { email: account.email } : {}),
    ...(account ? { emailVerified: account.emailVerified === true } : {}),
  });
}

const ACCOUNT_EMAIL = z.string().trim().toLowerCase().email().max(254);
const ACCOUNT_REGISTER_INPUT = z.object({
  email: ACCOUNT_EMAIL,
  password: z.string().min(12).max(128),
});
const ACCOUNT_LOGIN_INPUT = z.object({
  email: ACCOUNT_EMAIL,
  password: z.string().min(1).max(128),
});

type AccountWorkerResult = {
  email?: string;
  persistentId?: string;
  emailVerified?: boolean;
  error?: string;
};

async function callAccountWorker(
  path: string,
  body?: Record<string, unknown>,
): Promise<globalThis.Response> {
  const baseUrl = ServerEnv.openWarAuthUrl();
  const secret = ServerEnv.openWarAuthSecret();
  if (!baseUrl || !secret)
    throw new Error("Open War account service is not configured");
  return fetch(baseUrl + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
}

function accountWorkerErrorStatus(
  error: string | undefined,
  status: number,
): number {
  if (status === 400) return 400;
  if (status === 409 || error === "email_in_use") return 409;
  if (status === 429 || error === "rate_limited") return 429;
  if (status === 401 || error === "invalid_credentials") return 401;
  return 503;
}

function bearerToken(req: Request): string | null {
  const value = req.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

/**
 * Adds a small, independent guest-auth API to the same origin as the game.
 * It deliberately does not pretend to provide OAuth, purchases, or accounts.
 */
export function registerSelfHostedApi(app: Express): void {
  if (!ServerEnv.selfHostedAuthEnabled()) return;

  app.get("/.well-known/jwks.json", async (_req, res) => {
    try {
      const key = await ServerEnv.jwkPublicKey();
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json({
        keys: [
          {
            ...key,
            alg: "EdDSA",
            use: "sig",
            kid: ServerEnv.jwtKeyId(),
          },
        ],
      });
    } catch (error) {
      res.status(503).json({ error: "signing_key_unavailable" });
    }
  });

  app.post("/auth/guest", async (req, res) => {
    const parsed = GUEST_INPUT.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_guest_identity" });
    }
    try {
      await sendGuestSession(res, parsed.data.persistentId);
    } catch (error) {
      console.error("Guest session issuance failed:", error);
      res.status(503).json({ error: "guest_auth_unavailable" });
    }
  });

  app.post("/auth/account/register", async (req, res) => {
    const token = bearerToken(req);
    if (!token)
      return res.status(401).json({ error: "guest_session_required" });

    const auth = await verifyClientToken(token);
    if (auth.type !== "success" || auth.claims?.provider !== "guest") {
      return res.status(401).json({ error: "guest_session_required" });
    }

    const parsed = ACCOUNT_REGISTER_INPUT.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_registration" });
    }

    try {
      const response = await callAccountWorker("/internal/register", {
        email: parsed.data.email,
        password: parsed.data.password,
        // Only the verified guest token can nominate the ID to attach.
        persistentId: auth.persistentId,
        ip: req.ip ?? req.socket.remoteAddress ?? "unknown",
      });
      const body = (await response
        .json()
        .catch(() => ({}))) as AccountWorkerResult;
      if (!response.ok) {
        const error = body.error ?? "account_registration_failed";
        return res
          .status(accountWorkerErrorStatus(error, response.status))
          .json({ error });
      }
      if (
        body.persistentId !== auth.persistentId ||
        typeof body.email !== "string"
      ) {
        return res
          .status(502)
          .json({ error: "account_service_invalid_response" });
      }
      await sendGuestSession(res, auth.persistentId, {
        email: body.email,
        emailVerified: body.emailVerified === true,
      });
    } catch (error) {
      console.warn(
        "Open War account registration unavailable",
        error instanceof Error ? error.name : "unknown",
      );
      if (!res.headersSent)
        res.status(503).json({ error: "account_service_unavailable" });
    }
  });

  app.post("/auth/account/login", async (req, res) => {
    const parsed = ACCOUNT_LOGIN_INPUT.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_credentials" });
    }

    try {
      const response = await callAccountWorker("/internal/login", {
        email: parsed.data.email,
        password: parsed.data.password,
        ip: req.ip ?? req.socket.remoteAddress ?? "unknown",
      });
      const body = (await response
        .json()
        .catch(() => ({}))) as AccountWorkerResult;
      if (!response.ok) {
        const error = body.error ?? "account_login_failed";
        return res
          .status(accountWorkerErrorStatus(error, response.status))
          .json({ error });
      }
      if (
        typeof body.persistentId !== "string" ||
        !z.string().uuid().safeParse(body.persistentId).success ||
        typeof body.email !== "string"
      ) {
        return res
          .status(502)
          .json({ error: "account_service_invalid_response" });
      }
      await sendGuestSession(res, body.persistentId, {
        email: body.email,
        emailVerified: body.emailVerified === true,
      });
    } catch (error) {
      console.warn(
        "Open War account login unavailable",
        error instanceof Error ? error.name : "unknown",
      );
      if (!res.headersSent)
        res.status(503).json({ error: "account_service_unavailable" });
    }
  });

  app.post("/auth/refresh", async (req, res) => {
    const token = cookieValue(req, REFRESH_COOKIE);
    if (!token) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "refresh_session_missing" });
    }
    try {
      const { payload } = await jwtVerify(
        token,
        await ServerEnv.jwkPublicKey(),
        {
          algorithms: ["EdDSA"],
          issuer: ServerEnv.jwtIssuer(),
          audience: ServerEnv.jwtAudience(),
        },
      );
      if (payload.token_use !== "refresh" || typeof payload.sub !== "string") {
        throw new Error("Invalid refresh token");
      }
      const persistentId = base64urlToUuid(payload.sub);
      if (!z.string().uuid().safeParse(persistentId).success) {
        throw new Error("Invalid refresh subject");
      }
      await sendGuestSession(res, persistentId);
    } catch {
      clearRefreshCookie(res);
      res.status(401).json({ error: "refresh_session_invalid" });
    }
  });

  const logout = (_req: Request, res: Response) => {
    clearRefreshCookie(res);
    res.setHeader("Cache-Control", "no-store");
    res.status(204).end();
  };
  app.post("/auth/logout", logout);
  app.post("/auth/revoke", logout);

  app.get("/users/@me", async (req, res) => {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "missing_token" });
    const auth = await verifyClientToken(token);
    if (auth.type !== "success" || auth.claims?.provider !== "guest") {
      return res.status(401).json({ error: "guest_session_required" });
    }

    // The account Worker only decorates a verified guest JWT with an email identity.
    // If the Worker is temporarily unavailable, keep guest gameplay working.
    let linkedEmail: string | undefined;
    if (ServerEnv.openWarAuthUrl() && ServerEnv.openWarAuthSecret()) {
      try {
        const identityResponse = await callAccountWorker(
          "/internal/identity?persistentId=" +
            encodeURIComponent(auth.persistentId),
        );
        if (identityResponse.ok) {
          const identity = (await identityResponse
            .json()
            .catch(() => ({}))) as AccountWorkerResult;
          if (typeof identity.email === "string") linkedEmail = identity.email;
        }
      } catch (error) {
        console.warn(
          "Open War account identity lookup unavailable",
          error instanceof Error ? error.name : "unknown",
        );
      }
    }

    // Game sessions always keep the existing guest-provider JWT contract.
    // A linked email is only an account identity decoration; game identity stays
    // the persistent player ID already signed into the token.
    const profile = UserMeResponseSchema.parse({
      user: linkedEmail ? { email: linkedEmail } : {},
      player: {
        publicId: auth.persistentId,
        adfree: false,
        canCreatePublicLobbies: false,
        achievements: { singleplayerMap: [], player: [] },
        friends: [],
        subscription: null,
      },
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(profile);
  });

  // This deployment has one fixed game server and no cross-server registry.
  // A 404 is intentional: the client keeps the server map injected in the
  // page shell and routes games to this origin.
  app.get("/cluster.json", (_req, res) => {
    res.status(404).json({ error: "single_server_deployment" });
  });
}
