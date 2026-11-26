## Problem

What user-visible behavior, defect, or maintenance problem does this change address?

## Change

Describe the implementation or documentation change and the reason for the chosen approach.

## Validation

List the exact commands and manual checks run. Mark anything not run as `Not run` and explain why.

- [ ] `npm run typecheck` (for code changes)
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] Relevant tests, including regression coverage
- [ ] `npm run build-prod` (for build/client/server changes)
- [ ] Generated maps checked with `npm run gen-maps` when map sources change

## Impact and release notes

- Affected game modes, client/server packages or APIs:
- Desktop/mobile impact:
- Authentication, security, data or payment impact:
- Deployment/configuration requirements:
- Live acceptance still outstanding:

## Screenshots

For UI changes, attach before/after screenshots at desktop and narrow mobile widths where practical. For non-visual changes, write `Not applicable`.

## Checklist

- [ ] This pull request addresses one coherent change.
- [ ] I have reviewed the full diff and removed unrelated changes.
- [ ] User-facing text follows the existing translation system.
- [ ] No secrets, credentials, user data, proprietary game data or unlicensed assets are included.
- [ ] Upstream attribution and applicable license notices are preserved.
- [ ] CI and manual test results are described accurately.
- [ ] I have not claimed a production deployment or multiplayer verification that I did not perform.

A reviewer may assign a project milestone before merging; the repository's milestone check must pass.
