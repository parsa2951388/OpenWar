# Open War on ArvanCloud Edge

This deployment package publishes an Open War entrypoint through ArvanCloud
Edge Computing while preserving the existing production game services.

## Deployment architecture

- **ArvanCloud Edge Compute:** public web entrypoint, request routing,
  same-origin redirect handling, edge-side diagnostics, and immutable-asset
  cache directives.
- **Existing Open War origin:** https://open-war-online.onrender.com.
  The origin continues to serve the game shell and assets.
- **Existing game services:** authentication, matchmaking, game APIs,
  WebSocket/game sessions, and the existing Cloudflare gateway remain on
  their current production infrastructure.

This is an Edge-fronted deployment, **not** a migration of the Node.js game
server or authoritative multiplayer simulation into the Edge runtime. The
existing server is intentionally preserved to avoid breaking active gameplay.
Before submitting the Edge URL to the competition, confirm with the organizer
that an Edge Compute entrypoint with an external game origin satisfies the
competition's technical rules.

## What the Edge worker does

- Proxies requests to the fixed Open War origin. It cannot be used as an
  arbitrary open proxy.
- Exposes GET /__edge/health for deployment checks.
- Preserves request methods, query strings, and request bodies.
- Rewrites redirects that point back to the Render origin so navigation stays
  on the Arvan-issued hostname.
- Adds x-openwar-edge: arvancloud to normal responses.
- Applies a one-year immutable cache policy only to /assets/* and /_assets/*.
  It does not cache HTML, authentication, APIs, match traffic, or other
  dynamic responses.

WebSocket forwarding depends on the Edge runtime's upgrade support and must
be verified against a real game session. The current Open War HTML may point
the player to the existing game host directly; do not assume that WebSocket
traffic is routed through Edge until the browser network panel confirms it.

## Requirements

- An ArvanCloud account with Edge Computing enabled.
- A Machine User access key with Workspace Owner access.
- Node.js 18+ and npm for the r1ec CLI.
- The current production origin must remain reachable from Arvan's Edge
  network.

Never commit the Machine User key or other credentials to GitHub.

## Deploy from Windows PowerShell

From the repository root:

\`\`\`powershell
npm install --global r1ec
r1ec login -m "<ARVAN_MACHINE_KEY>"
r1ec deploy open-war-competition -f deploy/arvan-edge/worker.js
\`\`\`

Arvan assigns a default arvanedge.ir subdomain to a new Edge application.
Use the URL shown by the Arvan panel/CLI as the candidate competition URL.

## Deploy through GitHub Actions

1. Open the repository Settings → Secrets and variables → Actions.
2. Add a repository secret named ARVAN_MACHINE_KEY.
3. Open Actions → **Deploy Open War to Arvan Edge**.
4. Select **Run workflow** and keep the application name
   open-war-competition unless a different name is required.

The workflow is manual only; pushing code does not deploy to Arvan.

## Verify the deployment

Run:

\`\`\`powershell
node deploy/arvan-edge/smoke-test.mjs https://YOUR-APP.YOUR-NAMESPACE.arvanedge.ir
\`\`\`

The check verifies the local Edge health endpoint, the Open War HTML shell,
and one fingerprinted JavaScript/CSS asset when present.

Then manually verify all of the following in a browser:

1. The home screen loads without missing JS/CSS/assets.
2. Login and Google OAuth complete.
3. The server list loads.
4. A match can be created and joined by a second player.
5. WebSocket connections remain stable after refresh/reconnect.
6. The game works on a phone-sized viewport.
7. No API/CORS/Turnstile errors appear in the browser console.

If the Arvan hostname is not accepted by the current Cloudflare API gateway's
CORS allowlist or the Turnstile widget's hostname allowlist, add the exact
Arvan-issued hostname to the corresponding configuration before retesting.
Do not change OAuth redirect URIs unless the callback URL itself is changed.

## Rollback

The Render deployment remains untouched. If Edge deployment or testing fails,
use the existing Render URL:

https://open-war-online.onrender.com/

Do not remove or disable the Render service as part of this competition
deployment.
