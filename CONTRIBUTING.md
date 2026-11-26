# Contributing to Open War

Thank you for considering a contribution to Open War.

Open War is an independent community fork of OpenFrontIO. Contributions to this repository should improve Open War while preserving the upstream project's notices, license obligations and provenance. Open War is not the upstream OpenFront project; upstream-only contribution rules and approval labels do not apply here.

## Before you start

- Read the root [README](README.md) for the current implementation and release status.
- Keep each change focused and explain the user or maintenance problem it solves.
- Check the existing code and tests before introducing a new abstraction or dependency.
- Do not assume that a feature present in source is already deployed or verified in multiplayer.

This repository currently has GitHub Issues and Discussions disabled. You can submit a focused pull request directly; do not follow instructions that ask you to create or wait for an upstream `approved` issue.

## Project boundaries

- Open War-owned client, server, engine integration, tests and documentation may be changed when the change is appropriate for this fork.
- Preserve upstream OpenFront copyright and attribution notices.
- Do not copy assets from `/proprietary` or external hosting unless their license explicitly grants that use.
- Do not commit credentials, access tokens, private keys, database dumps, production logs containing personal data, game packages or other proprietary content.
- Do not add DRM circumvention, key extraction, decryption or protection-bypass functionality.
- Do not change production secrets, live service settings or deployment targets as an incidental part of a code pull request.

## Development environment

The repository uses the Node 24 and npm 12 release lines. The current package manifest specifies Node `24.15.x` and npm `12.1.x`.

Check the versions:

```bash
node --version
npm --version
```

Clone and install:

```bash
git clone https://github.com/parsa2951388/OpenWar.git
cd OpenWar
npm run inst
```

Use `npm run inst` for the repository's pinned `npm ci --ignore-scripts` installation process. Do not replace it with an unreviewed install command.

Start the local development environment:

```bash
npm run dev
```

The development server uses development configuration. It is for local development only and must not be exposed as a production service.

## Branch and change workflow

Create a descriptive branch for one focused change:

```bash
git switch -c feature/short-description
# or
git switch -c fix/short-description
# or
git switch -c docs/short-description
```

Follow the existing patterns in the touched package. Avoid unrelated formatting or generated-file churn.

For map-source changes, regenerate derived map files with:

```bash
npm run gen-maps
```

Do not hand-edit generated map output.

## Validation

Run the checks relevant to your change. Before requesting review, run at least:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build-prod
```

For a small documentation-only change, state that it is documentation-only and check links, commands and referenced paths manually. For code changes, include regression tests for changed behavior. The CI workflow also runs build/typecheck, three test shards, lint, formatting and generated-map consistency checks.

For UI changes:
- Include before/after screenshots where practical.
- Check both desktop and a narrow mobile viewport.
- Route all user-facing strings through the existing translation system and add the required English string entries.
- Describe any controls that still need real-device or multiplayer testing.

For networking, authentication, matchmaking, payments, deployment or security changes:
- State the trust boundary and the configuration assumptions.
- Never include secret values in code, logs, screenshots or the pull request description.
- Distinguish unit/CI results from live acceptance tests.
- Do not claim a production fix until it has been verified against the deployed commit and the intended service.

## Opening a pull request

Open a pull request against `main` and include:

1. **Problem:** the behavior or maintenance issue being addressed.
2. **Change:** what changed and why this approach was chosen.
3. **Validation:** the exact commands run and whether each passed.
4. **Impact:** affected game modes, platforms, APIs, configuration and deployment behavior.
5. **Follow-up:** any acceptance test or configuration step that remains outstanding.

Keep the pull request limited to one coherent change. Link related work when relevant. A reviewer may assign a project milestone before merging; the repository's milestone check must pass.

AI-assisted work is acceptable only when the author has reviewed the result, understands the implementation and can explain its behavior and limitations.

## Licensing

By contributing, you agree that your contribution will be distributed under the repository's applicable license. The source code is licensed under the GNU Affero General Public License v3.0. Assets may have separate terms; check the relevant notices before adding or modifying them.

See [LICENSE](LICENSE), [LICENSE-ASSETS](LICENSE-ASSETS) and [LICENSING.md](LICENSING.md). Preserve upstream copyright, license and attribution notices.
