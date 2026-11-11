# Render deployment configuration

The Render web service must not inherit local-development credentials or
security settings from an npm script. Start it with `npm run start:render`;
the launcher loads the service environment, validates it, and then imports the
server.

## Required settings

Configure these values in the Render service's **Environment** page. Do not
commit secret values to Git.

- **`GAME_ENV`**: Explicitly set to `staging` or `prod`. Render refuses
  implicit or accidental `dev` mode.
- **`DOMAIN`**: API audience domain. The server constructs the issuer as
  `https://api.<DOMAIN>`.
- **`API_KEY`**: Valid server-to-API key. Development placeholders are
  rejected.
- **`TURNSTILE_SITE_KEY`**: Site key matching the environment. Production
  rejects the public test key.
- **`NUM_WORKERS`**: Positive integer matching this instance's worker routing.
- **`INSTANCE_LETTER`**: One registered lowercase letter. Never reuse a
  retired letter.

Render supplies `RENDER_GIT_COMMIT`; the launcher uses it as `GIT_COMMIT`
when no explicit commit value is supplied. This keeps the UI and server version
identifiable instead of showing the generic `vx.xx.xx` placeholder.

`ADMIN_BOT_API_KEY` is optional. Leave it unset to disable the admin-bot
endpoint. Do not use the documented development placeholder as a credential.

## Development services

Local runs default to `GAME_ENV=dev` and the public Cloudflare Turnstile test
site key. A Render-hosted development service is refused unless
`ALLOW_INSECURE_RENDER_DEV=true` is explicitly configured. Use that exception
only for an isolated, non-production service.

## Before switching the live service

1. Confirm the API host represented by `DOMAIN` and the corresponding API key.
2. Register/confirm `INSTANCE_LETTER` and `NUM_WORKERS` for the deployment.
3. Set a live Turnstile site key for `GAME_ENV=prod`.
4. Verify the service can reach `https://api.<DOMAIN>` from the Render region.
5. Only then change the live service's start configuration and deploy.

The launcher intentionally does not change Render service settings, domains,
databases, or existing production variables.
