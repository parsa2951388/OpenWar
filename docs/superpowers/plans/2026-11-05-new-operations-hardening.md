# New Operations hardening and usability plan

Date: 2026-11-05
Base: `48ba41dd822b216c075a9e7ae3c6707d070b39eb`
Target branch: `open-war/operations-missions-alpha`
Working branch: `open-war/new-operations-hardening`

## Goal

Harden the New/Operations alpha without modifying Classic production, correct the observed WebGL recovery loop, reduce per-connection server memory retention, and make the Operations command desk easier to navigate on desktop and mobile.

## Constraints and rulings

- Keep the WebGL hard gate for software-rendered or unsupported WebGL2; bypassing it can make the game effectively unplayable.
- Preserve current mission presets, difficulty, deterministic engine configuration, unlock rules, and local-only campaign records.
- Do not represent supply lines, fog of war, multiplayer operations, or cloud progression as shipped until those mechanics exist.
- Do not upgrade Render plans or create billable infrastructure.
- Keep deployment isolated to the New Alpha Render service; do not deploy to Classic or alter `main`.
- Ruling: fix the WebGL recovery loop by resetting the saved edition to Classic before the existing root navigation — the gate is correctly protecting the renderer; persistent Operations preference is what causes the return loop.
- Ruling: release the rate-limiter bucket when a socket closes, while keeping current per-client rate limits and message validation unchanged.

## Tasks

1. [ ] Add regression tests for WebGL recovery, rate-limiter bucket cleanup, and socket close cleanup. Run the focused tests and confirm they fail for the expected missing behavior.
2. [ ] Add mission filters (All, Ready, Cleared, Locked), an accessible campaign completion indicator, empty-filter feedback, and responsive 3/2/1-column mission grid. Add regression tests first.
3. [ ] Implement the shared edition storage key and reset-to-Classic recovery behavior in WebGLGate.
4. [ ] Implement rate-limiter bucket disposal and invoke it on normal and already-closed socket cleanup.
5. [ ] Add English and Persian strings for Operations filters/progress; preserve the existing honesty notes for in-development mechanics.
6. [ ] Run focused regression tests, all project tests, typecheck, lint, format check, and production build. Inspect the complete diff and CI results.
7. [ ] Create a PR from the working branch into the New Alpha source branch. Merge only after checks pass.
8. [ ] Trigger the manual Render deployment for `open-war-new-alpha`, verify the exact commit, deploy status, HTTP health, and public preview response.
9. [ ] Report verified fixes, tests, deployment URL, and remaining infrastructure/product limitations.

## Verification contract

A successful static build does not prove gameplay or multiplayer readiness. Report only checks actually run. No GPU-backed playthrough or second browser automation run is promised; the available browser test environment had software WebGL. Keep the WebGL safety gate and state this limitation explicitly.
