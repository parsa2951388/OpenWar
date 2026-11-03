# SDD ledger — plan: docs/superpowers/plans/2026-11-03-quality-7-plan.md

## Workspace and verification constraints

- Working branch: `open-war/quality-7`.
- Base branch: `open-war/independent-self-host`.
- Pull request: https://github.com/parsa2951388/OpenWar/pull/3
- Starting base SHA: `093505a9baed9c3e254ae649d7c86163b3f6824d`.
- The current execution environment has no working local repository checkout and network access from the container is unavailable. Source edits are made on the isolated GitHub feature branch.
- GitHub Actions lookup for the PR head has returned zero workflow runs and zero combined checks. No test/build command can be run locally from the connected tools in this session.

## Rulings

- Ruling: Use the GitHub feature branch as the isolated workspace rather than a local git worktree — the repository is accessible through GitHub MCP, but no local checkout or executable repository tool is available — cost if wrong: reduced local verification and slower diagnosis.
- Ruling: Do not merge or deploy while no fresh CI/test/build evidence is available — deployment could ship a TypeScript, runtime, or UI regression — cost if wrong: delays delivery until a runner is available.

## Task status

### Task 1 — shared desktop/mobile language picker
- Implemented: `NavUtilityIcons` contains the desktop language selector; `MobileNavBar` now renders it beside the Open War logo.
- Regression test added: `tests/client/NavUtilityIcons.language.test.ts` mounts the actual desktop and mobile navigation components and checks a visible language picker.
- Verification: NOT RUN. GitHub Actions returned zero runs/checks; there is no local test runner in this environment.

### Task 2 — wait for Lit navigation rendering
- Implemented: `Main.initialize()` awaits the mobile and desktop navigation `updateComplete`, then the utility cluster and language selector before querying version/locale nodes.
- Regression test updated: `tests/client/MainInitialize.test.ts` now asserts the language selector exists, translated play text is not empty, and the version-node warning is absent.
- Verification: NOT RUN. No fresh CI output is available.

### Task 3 — hide false untagged version
- Implemented: `taggedGameVersion()` now returns an empty label for non-version placeholders; tagged semantic versions remain unchanged.
- Regression test updated: `tests/client/GameVersion.test.ts`.
- Verification: NOT RUN. No fresh CI output is available.

### Task 4 — make upstream map-weight polling optional
- Implemented: `ServerEnv.mapWeightsApiEnabled()` defaults to true and only disables the integration for the explicit string `false`; `Master` skips only the map-weight poll when disabled and logs the fallback.
- Regression test added: `tests/MapWeightsPollingConfig.test.ts`.
- Documented: `docs/SELF_HOSTING.md` describes `MAP_WEIGHTS_API_ENABLED=false` and default-weight behavior.
- Source validation: `MapPlaylist` starts with an empty weight map and uses `DEFAULT_MAP_WEIGHT = 5` for absent API weights.
- Verification: NOT RUN. The Render environment variable has not been applied; the new code has not been deployed.

### Task 5 — release verification
- Pending: no merge, environment update, Render deployment, Pages hostname change, or two-client multiplayer test has been performed.
- Reason: no fresh CI or executable build/test evidence is available; do not modify the production service on an unverified candidate.

## Final review

- Final review: self-review (no subagent tool).
- Reviewed changed source paths and integration points via GitHub file reads and compare API.
- Outstanding verification gaps: full TypeScript build, complete Vitest suite, lint/format checks, Docker build, rendered browser QA on the candidate, Persian runtime toggle, and a two-independent-client WebSocket match.
- No quality score upgrade is claimed until the candidate is built, tested, deployed, and smoke-checked.
