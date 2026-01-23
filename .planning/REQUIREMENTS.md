# Requirements: Floatnote

**Defined:** 2026-01-22
**Core Value:** A persistent, transparent scratch space that's always one keyboard shortcut away

## v1 Requirements

Requirements for this milestone: test core flows, automate builds, publish to npm.

### Testing

- [ ] **TEST-01**: Integration tests verify IPC round-trips between main and renderer (save/load data, export, window management)
- [ ] **TEST-02**: Integration tests verify preload bridge correctly exposes APIs to renderer
- [ ] **TEST-03**: E2E tests launch real Electron app and verify drawing flow works
- [ ] **TEST-04**: E2E tests verify text overlay creation and editing
- [ ] **TEST-05**: E2E tests verify multi-note navigation (create, switch, delete)
- [ ] **TEST-06**: E2E tests verify save/load persistence across app restart
- [ ] **TEST-07**: E2E tests verify clipboard paste (image and text)
- [ ] **TEST-08**: E2E tests verify settings persistence

### CI/CD

- [ ] **CICD-01**: GitHub Actions workflow runs tests on every push to main and on PRs
- [ ] **CICD-02**: GitHub Actions workflow builds macOS app (DMG + ZIP) on version tag push
- [ ] **CICD-03**: Build produces both x64 and arm64 (Apple Silicon) artifacts
- [ ] **CICD-04**: Tag push creates GitHub Release with built artifacts attached
- [ ] **CICD-05**: Release notes auto-generated from commits since last tag
- [ ] **CICD-06**: Version management uses `npm version` for atomic version + tag creation

### npm Publishing

- [x] **NPM-01**: package.json `files` field limits published package to `bin/` only
- [x] **NPM-02**: `prepublishOnly` script runs tests before publish
- [x] **NPM-03**: Release workflow publishes to npm after successful GitHub Release
- [x] **NPM-04**: NPM_TOKEN secret configured for CI authentication
- [x] **NPM-05**: `npx floatnote` successfully installs CLI and launches app download

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Testing

- **TEST-09**: Restructure existing unit tests to import actual source modules
- **TEST-10**: Extract pure functions from renderer.js for isolated unit testing
- **TEST-11**: Coverage thresholds enforced (60% statements, 50% branches)
- **TEST-12**: Snapshot tests for data format stability
- **TEST-13**: Visual regression tests for canvas output

### CI/CD

- **CICD-07**: macOS code signing with Apple Developer certificate
- **CICD-08**: Notarization via Apple notarytool
- **CICD-09**: Auto-update via electron-updater
- **CICD-10**: Branch protection rules requiring CI pass

### npm Publishing

- **NPM-06**: Provenance attestation (`--provenance` flag)
- **NPM-07**: Scoped package name (@josmanvis/floatnote)
- **NPM-08**: CLI self-update command

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cross-platform CI (Windows/Linux) | App is macOS-only |
| Docker-based CI | Electron needs native macOS for builds |
| Semantic release automation | Over-engineered for solo project |
| Visual regression testing | Canvas output varies; maintenance burden |
| 90%+ coverage thresholds | Hard-to-test DOM/canvas code leads to meaningless tests |
| Monorepo tooling | Single package, single build target |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 1 | Pending |
| TEST-02 | Phase 1 | Pending |
| TEST-03 | Phase 2 | Pending |
| TEST-04 | Phase 2 | Pending |
| TEST-05 | Phase 2 | Pending |
| TEST-06 | Phase 2 | Pending |
| TEST-07 | Phase 2 | Pending |
| TEST-08 | Phase 2 | Pending |
| CICD-01 | Phase 3 | Pending |
| CICD-02 | Phase 3 | Pending |
| CICD-03 | Phase 3 | Pending |
| CICD-04 | Phase 3 | Pending |
| CICD-05 | Phase 3 | Pending |
| CICD-06 | Phase 3 | Pending |
| NPM-01 | Phase 4 | Complete |
| NPM-02 | Phase 4 | Complete |
| NPM-03 | Phase 4 | Complete |
| NPM-04 | Phase 4 | Complete |
| NPM-05 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after initial definition*
