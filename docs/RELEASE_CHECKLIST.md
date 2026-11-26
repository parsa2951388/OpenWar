# Open War release-readiness checklist

Use this checklist before merging a release candidate or promoting a commit to a public service. Record the exact commit SHA and attach evidence to the release pull request. A green CI run alone does not establish production readiness.

## 1. Source and CI

- [ ] Confirm the release candidate is based on the intended `main` commit.
- [ ] Review the complete diff, including generated files and lockfile changes.
- [ ] Confirm the required GitHub Actions checks pass on the exact head SHA: build, typecheck, all test shards, lint, formatting and generated-map verification.
- [ ] Confirm dependency advisories have been reviewed. Document remaining advisories and accepted risk; do not hide or suppress failures to make a release green.
- [ ] Verify no secrets, credentials, local data, proprietary assets or debug-only bypasses are included.
- [ ] Confirm license and upstream attribution notices are preserved.

## 2. Deployment configuration and security

- [ ] Review the actual service start command and runtime environment for the target deployment.
- [ ] Confirm production mode is explicit and development placeholders or public test credentials are absent.
- [ ] Confirm required API credentials, identity settings and anti-abuse configuration are set to real, non-placeholder values. Review values without copying them into logs, pull requests or this checklist.
- [ ] Confirm the process refuses to start when required production configuration is missing or unsafe.
- [ ] Confirm service identity, host name and deployed commit SHA are reported accurately.
- [ ] Confirm redirects cannot forward API keys or bearer credentials to an unexpected origin.
- [ ] Confirm logs contain useful error context without request tokens, API keys or personal data.
- [ ] Verify the public exposure and intended purpose of every Render service. Restrict development services or stop them if they are not intentionally public.

## 3. API, browser and transport contract

- [ ] Confirm the production host is registered and allowed by the upstream API. A successful public health endpoint does not prove host registration.
- [ ] Verify JWKS and cluster-registry requests against the intended production origin.
- [ ] Verify required API routes, including join verification and map weights, through the configured transport.
- [ ] Verify CORS preflight and origin allowlists.
- [ ] Verify invalid or missing API credentials are rejected.
- [ ] Verify WebSocket upgrade returns the expected successful upgrade response.
- [ ] Verify matchmaking check-ins, assignment, reconnect and cancellation behavior.
- [ ] Verify failures are surfaced to the client without exposing secrets.

## 4. Gameplay acceptance

Perform these checks against the exact deployed commit, not only a local build.

- [ ] Launch a new solo game and complete spawn.
- [ ] Verify the HUD, resource counters, build menu, buildings and selection controls.
- [ ] Verify aircraft construction, airport operation and commercial-aircraft routes.
- [ ] Verify fighter, stealth-fighter and ground-attacker controls, targeting and movement.
- [ ] Verify carrier-based aircraft, fuel/range, return-to-base and servicing behavior.
- [ ] Verify air combat, interception, evasion and ground-attack resolution.
- [ ] Confirm game snapshots and client/server state remain synchronized through the full match.

## 5. Multiplayer and device acceptance

- [ ] Join from two independent browser sessions and complete a match.
- [ ] Verify matchmaking, player identity, spawn, movement, building and combat between clients.
- [ ] Verify reconnect and disconnect behavior.
- [ ] Verify WebSocket stability under ordinary gameplay.
- [ ] Test a narrow mobile viewport on a physical phone.
- [ ] Test touch controls, map pan/zoom, menus, aircraft selection and build placement on the physical device.
- [ ] Record browser, device, commit SHA and test outcome.

## 6. Release and rollback

- [ ] Publish concise release notes describing shipped behavior and known limitations.
- [ ] Confirm the public site is serving the intended commit after deployment.
- [ ] Run the critical smoke tests again against the public service.
- [ ] Keep the previous known-good deployment available for rollback.
- [ ] Record the deployment timestamp, commit SHA, operator and result.
- [ ] If any critical security, multiplayer, or gameplay gate fails, stop promotion and restore the last known-good deployment.

## Evidence record

For each release candidate, include:

| Field | Value |
| --- | --- |
| Candidate commit SHA | |
| CI run URL | |
| Deployment/service | |
| Deployed commit SHA | |
| Test device and browser | |
| Multiplayer session result | |
| Known limitations | |
| Rollback reference | |

Mark a check as `Not run` when it has not been performed. Do not infer success from the absence of a reported failure.
