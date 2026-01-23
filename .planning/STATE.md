# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** A persistent, transparent scratch space that's always one keyboard shortcut away
**Current focus:** Phase 3 - CI/CD Pipeline

## Current Position

Phase: 3 of 4 (CI/CD Pipeline)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-23 -- Completed 03-01-PLAN.md (GitHub Actions test workflow)

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~2.6 min
- Total execution time: ~21 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2 | ~4 min | ~2 min |
| 2 | 3 | ~14 min | ~4.7 min |
| 3 | 1 | ~0.5 min | ~0.5 min |
| 4 | 2 | ~2.5 min | ~1.25 min |

**Recent Trend:**
- Last 5 plans: 02-02 ✓, 02-03 ✓, 04-01 ✓, 04-02 ✓, 03-01 ✓
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Use Jest 29 (existing) for integration tests, Playwright+Electron for E2E
- [Roadmap]: Don't restructure existing tests -- add integration/E2E alongside
- [Roadmap]: Skip code signing in CI (CSC_IDENTITY_AUTO_DISCOVERY=false), defer to v2
- [Roadmap]: npm package ships only bin/ (~5KB CLI), app downloaded from GitHub Releases
- [04-01]: Explicit electron entry path replaces main field (main field caused src/ to leak into tarball)
- [04-02]: Trigger on release published events (not drafts), ubuntu-latest for bin-only package
- [02-01]: Skip close dialog in test mode for reliable E2E teardown
- [02-01]: Use page.evaluate() for toolbar actions (hover-dependent UI)
- [02-01]: Removed electron-playwright-helpers (unused after dialog fix)
- [02-02]: Use electronApp.evaluate for clipboard writes (main process context)
- [02-02]: Generate PNG programmatically for nativeImage (no external tools)
- [02-02]: Use waitForFunction for async data model assertions
- [02-03]: Restart tests manage own Electron lifecycle (no shared fixture)
- [02-03]: Use page.evaluate for text creation (canvas overlay blocks text-container clicks)
- [02-03]: Use dispatchEvent for settings changes to trigger save handlers

### Pending Todos

None yet.

### Blockers/Concerns

- E2E tests note: toolbar buttons require hover to be clickable; use page.evaluate() or force:true
- Clipboard test note: nativeImage.createFromBuffer requires properly encoded PNG (some base64 PNGs produce empty images)
- Persistence note: restoreTextItem duplicates textItems array entries on load (existing app behavior)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix opacity settings bg color from white to black | 2026-01-22 | d8a30dd | [001-the-opacity-settings-are-using-a-bg-colo](./quick/001-the-opacity-settings-are-using-a-bg-colo/) |

## Session Continuity

Last session: 2026-01-23
Stopped at: Completed 03-01-PLAN.md -- test CI workflow
Resume file: None
