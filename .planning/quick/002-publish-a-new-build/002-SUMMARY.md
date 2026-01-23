# Quick Task 002: Publish a New Build — Summary

## What was done

1. **Committed unstaged changes** — New freeze toggle feature (locks pan/zoom/rotation with F key or toolbar button) and drag handle color fix (debug red/green → transparent/subtle)
2. **Fixed auth** — Switched git credential helper to `gh` and refreshed OAuth token with `workflow` scope to allow pushing workflow files
3. **Pushed 40 commits** to origin/main (all Phase 1–4 work plus freeze feature)
4. **Bumped version** — 1.0.2 → 1.0.3 via `npm version patch`
5. **Pushed tag** — `v1.0.3` pushed to trigger the release workflow

## Release pipeline triggered

The `v1.0.3` tag triggers `.github/workflows/release.yml`:
- Build: macOS x64 + arm64 (DMG + ZIP)
- Release: GitHub Release with artifacts + auto-generated notes
- Publish: npm package via `NPM_TOKEN` secret

## Commits

- `0cf7288` — feat: add freeze toggle to lock pan/zoom/rotation
- `bbe24d9` — v1.0.3 (npm version bump)
