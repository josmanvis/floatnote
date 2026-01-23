# Roadmap: Floatnote v1

## Overview

Floatnote has a working app with no automated quality gates or distribution pipeline. This milestone builds the testing and delivery chain: integration tests verify IPC contracts, E2E tests verify user-facing flows in a real Electron instance, CI/CD automates builds on every push and tag, and npm publishing makes `npx floatnote` the install path. Each phase depends on the previous -- tests must pass before CI is useful, CI must build before releases work, and releases must exist before npm publishing functions.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Integration Tests** - IPC and preload bridge contracts verified with real source code
- [x] **Phase 2: E2E Tests** - Core user flows verified in real Electron app via Playwright
- [x] **Phase 3: CI/CD Pipeline** - Automated testing, building, and releasing on GitHub Actions
- [x] **Phase 4: npm Publishing** - CLI-only package published to npm, downloads app from Releases

## Phase Details

### Phase 1: Integration Tests
**Goal**: IPC communication contracts between main, preload, and renderer are verified against real source code
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. Running `npm test` executes integration tests that import actual main.js handlers and verify save/load round-trips produce correct file I/O
  2. Integration tests verify window management IPC (set-pinned, set-window-size, set-background-mode) triggers correct BrowserWindow method calls
  3. Integration tests verify preload bridge exposes all APIs that renderer.js actually calls (save, load, export, clipboard, window controls)
  4. All integration tests pass without launching an Electron window (fast, CI-friendly)
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md -- IPC round-trip integration tests (save/load, export, window mgmt)
- [x] 01-02-PLAN.md -- Preload bridge API verification tests

### Phase 2: E2E Tests
**Goal**: Core user-facing flows work end-to-end in a real Electron app instance
**Depends on**: Phase 1
**Requirements**: TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08
**Success Criteria** (what must be TRUE):
  1. E2E test launches the real Electron app, draws a stroke on the canvas, and verifies the stroke persists visually
  2. E2E test creates a text overlay, edits its content, and verifies the text appears on screen
  3. E2E test creates multiple notes, navigates between them, and verifies each note retains its content
  4. E2E test saves data, restarts the app, and verifies all notes and drawings survive the restart
  5. E2E test pastes an image from clipboard and verifies it appears on the canvas
  6. E2E test changes a setting (opacity, brush size), restarts the app, and verifies the setting persists
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md -- Playwright + Electron setup and drawing flow test
- [x] 02-02-PLAN.md -- Text overlay, multi-note navigation, and clipboard tests
- [x] 02-03-PLAN.md -- Persistence tests (save/load across restart, settings survival)

### Phase 3: CI/CD Pipeline
**Goal**: Every push runs tests automatically, and version tags produce signed GitHub Releases with macOS artifacts
**Depends on**: Phase 2
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04, CICD-05, CICD-06
**Success Criteria** (what must be TRUE):
  1. Pushing a commit to main or opening a PR triggers a GitHub Actions run that executes all tests and reports pass/fail
  2. Running `npm version patch` and pushing the resulting tag triggers a build that produces both x64 and arm64 macOS artifacts (DMG + ZIP)
  3. The tag-triggered build creates a GitHub Release with all artifacts attached and auto-generated release notes from commits
  4. Builds succeed in CI without code signing (CSC_IDENTITY_AUTO_DISCOVERY=false)
  5. Version management is atomic: `npm version` creates the commit and tag, tag push triggers the release
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md -- Test workflow (push/PR triggers, ubuntu runner, npm test)
- [x] 03-02-PLAN.md -- Release workflow (tag trigger, macos runner, electron-builder, GitHub Release creation)

### Phase 4: npm Publishing
**Goal**: `npx floatnote` installs a minimal CLI package from npm that downloads and launches the app from GitHub Releases
**Depends on**: Phase 3
**Requirements**: NPM-01, NPM-02, NPM-03, NPM-04, NPM-05
**Success Criteria** (what must be TRUE):
  1. `npm pack --dry-run` shows only bin/ files in the tarball (no src/, no tests/, package size under 10KB)
  2. Running `npm publish` locally first runs tests via prepublishOnly and fails if tests fail
  3. A successful GitHub Release triggers npm publish automatically in the release workflow
  4. `npx floatnote` on a clean machine installs the CLI, downloads the app from the latest GitHub Release, and launches it
**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md -- Package.json configuration (files field, prepublishOnly, dry-run verification)
- [x] 04-02-PLAN.md -- Release workflow npm publish step and npm token configuration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Integration Tests | 2/2 | Complete | 2026-01-22 |
| 2. E2E Tests | 3/3 | Complete | 2026-01-23 |
| 3. CI/CD Pipeline | 2/2 | Complete | 2026-01-23 |
| 4. npm Publishing | 2/2 | Complete | 2026-01-23 |
