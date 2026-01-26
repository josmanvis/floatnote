# Project Research Summary

**Project:** Testing, CI/CD, and npm Publishing for Floatnote
**Domain:** Electron desktop app testing infrastructure and distribution automation
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

Floatnote requires testing infrastructure, CI/CD automation, and npm CLI publishing. This is a well-established domain with mature patterns: Jest for testing Electron apps with mock boundaries, GitHub Actions for CI/CD with macOS runners for builds, and npm publishing with careful file whitelisting for CLI-only distribution. The project's dual identity (Electron desktop app distributed via GitHub Releases + npm CLI launcher) requires careful coordination between build artifacts and npm package contents.

The recommended approach is a phased implementation: first restructure existing tests to exercise actual source code (not mocks), then add GitHub Actions CI for testing and build verification, followed by automated release workflows triggered by version tags, and finally npm publishing that ships only the CLI launcher. The critical insight from architecture research is that the monolithic 3100-line renderer must be tested through extraction of pure functions rather than attempting to test the full class in jsdom.

The primary risk is test quality: the current test suite verifies mock behavior rather than application logic, providing zero regression protection. This must be addressed first or all subsequent CI work builds on sand. Secondary risks include version synchronization between GitHub Releases and npm packages, code signing configuration in CI, and npm package bloat from including unnecessary Electron source files. All of these have well-documented solutions in the Electron ecosystem.

## Key Findings

### Recommended Stack

The testing and CI/CD stack is mature and stable. Jest 30 is the current standard for Electron testing, offering clean mocking boundaries for main/preload/renderer processes. GitHub Actions provides free macOS runners for public repos (required for electron-builder) and Ubuntu runners for tests (10x cheaper). The npm publishing workflow integrates cleanly with GitHub Releases using granular access tokens and provenance attestation.

**Core technologies:**
- **Jest 30** (upgrade from 29): Test runner with project-based configuration for main/preload/renderer contexts, better JSDOM support, stable API
- **jest-environment-jsdom 30**: Browser-like DOM for renderer tests without launching Electron
- **electron-builder 26** (upgrade from 25): Package macOS .dmg/.zip with improved compatibility for Electron 33+ and macOS Sonoma/Sequoia
- **GitHub Actions v4**: CI/CD orchestration with macos-latest for builds, ubuntu-latest for tests
- **npm granular tokens**: Scoped publish access with provenance support for supply chain trust

**Key version decisions:**
- Upgrade Jest 29 → 30 for cleaner API and JSDOM v26 support (straightforward migration for this codebase)
- Upgrade electron-builder 25 → 26 for better macOS compatibility (non-breaking for basic DMG/zip builds)
- Node.js 18+ engine requirement (aligns with Jest 30, matches Electron 33's bundled Node 20)

### Expected Features

**Must have (table stakes):**
- **Unit tests for core logic** — Test drawing math, undo/redo, note management, not just data structures
- **Coverage thresholds** — Set realistic gates (60-70% statements) to prevent regression; current 0% thresholds are meaningless
- **Test isolation** — Tests must import and exercise actual source code with dependencies mocked, not test mocks calling mocks
- **CI on push/PR** — Run tests automatically to prevent broken merges
- **Automated GitHub Release** — Tag push triggers build and artifact upload
- **npm package file whitelist** — Only publish CLI (`bin/`) to npm, not entire Electron source tree
- **prepublishOnly script** — Run tests before npm publish to prevent broken releases

**Should have (quality improvements):**
- **Integration tests (IPC)** — Verify main ↔ renderer communication contracts
- **Snapshot tests** — Catch unintended data shape changes in serialization
- **Coverage reporting** — Upload to artifact or badge for visibility
- **Release notes generation** — Extract from commit messages between tags
- **npm provenance** — Supply chain trust via `--provenance` flag

**Defer (v2+):**
- **Code signing + notarization** — Requires $99/yr Apple Developer account, certificate management; users can right-click > Open for now
- **E2E tests with Playwright** — Overkill for transparent overlay app; manual testing sufficient for UI interactions
- **Visual regression testing** — Canvas output varies across platforms, massive maintenance burden
- **Auto-update (electron-updater)** — Requires signed builds and update server; CLI re-download workflow is adequate

### Architecture Approach

The architecture is a standard Electron testing pyramid: pure unit tests for extracted logic functions (no DOM), component tests for renderer logic units (with jsdom + canvas mocks), integration tests for IPC round-trips, and manual testing for full app interactions. The key insight is that the monolithic 3123-line Glassboard class cannot be unit tested directly—pure functions must be extracted into separate modules (geometry, history, note state management) and tested in isolation. CI/CD follows a two-pipeline pattern: test workflow on every push (Ubuntu runner, fast feedback), and release workflow on version tag (macOS runner, builds artifacts, publishes to GitHub + npm).

**Major components:**
1. **Jest test projects** — Separate configurations for main (electron mock), renderer (jsdom), preload (electron mock), and CLI (node), each with appropriate mocking boundaries
2. **CI pipeline (test)** — Runs on ubuntu-latest for every push/PR, executes `npm test`, uploads coverage report
3. **CI pipeline (release)** — Runs on macos-latest for version tags, builds with electron-builder, creates GitHub Release with DMG+ZIP, publishes CLI to npm
4. **npm package structure** — CLI-only launcher with `files: ["bin/"]` whitelist, zero production dependencies, downloads full app from GitHub Releases at runtime

### Critical Pitfalls

**From PITFALLS.md (top 5 by severity):**

1. **Tests verify mocks instead of source code** — Current test suite calls mock functions and asserts mocks were called (tautological), providing zero defect detection. Tests must `require()` actual source modules with dependencies mocked at boundaries. Extract pure functions from monolithic renderer for testable units.

2. **electron-builder CI builds fail on code signing** — Without certificates, macOS builds attempt signing and fail. Set `CSC_IDENTITY_AUTO_DISCOVERY=false` in CI environment for unsigned builds, or configure `CSC_LINK`/`CSC_KEY_PASSWORD` secrets for signed releases.

3. **Publishing Electron source tree to npm** — Without `files: ["bin/"]` in package.json, entire `src/` directory ships to npm, bloating package 10-100x. Current `.npmignore` excludes tests but NOT src. Verify with `npm pack --dry-run` before first publish.

4. **Version mismatch between npm and GitHub Release** — Two separate publish workflows (npm publish vs electron-builder release) drift without synchronization. Use single tag-triggered workflow: `npm version patch` creates tag, tag push triggers both GitHub Release and npm publish atomically.

5. **jsdom tests give false passes for Canvas code** — jsdom doesn't implement Canvas2D context; tests mock everything and pass but rendering bugs go undetected. Extract pure geometry/state logic for unit tests, accept low coverage on Canvas interaction code, add Playwright E2E later if needed.

## Implications for Roadmap

Based on research, the dependency graph requires this phase structure:

### Phase 1: Test Infrastructure and Refactoring
**Rationale:** Tests must work before CI is useful. Current tests provide zero regression protection because they test mocks, not source code. The monolithic renderer (3123 lines) resists unit testing—pure functions must be extracted first.

**Delivers:**
- Restructured tests that import actual source code (main.js, renderer.js, preload.js, CLI)
- Extracted testable modules from renderer (geometry.js, history.js, noteState.js)
- jest-canvas-mock or manual Canvas2D context mock for drawing tests
- Realistic coverage thresholds (40% statements to start, ratchet up later)
- Tests passing reliably on local machines

**Addresses (from FEATURES.md):**
- Unit tests for pure logic (table stakes)
- Coverage thresholds (table stakes)
- Test isolation/proper mocking (table stakes)

**Avoids (from PITFALLS.md):**
- Pitfall 1: Tests verify mocks not source
- Pitfall 5: jsdom false passes for Canvas code
- Pitfall 8: Monolithic renderer untestable

**Critical path:** This phase must complete before Phase 2. CI is pointless without real tests to run.

---

### Phase 2: CI Pipeline (Testing and Build Verification)
**Rationale:** Once tests work locally, add automated CI to prevent regressions. Use cheap Ubuntu runners for tests, reserve expensive macOS runners for electron-builder. Validate build succeeds before implementing publish automation.

**Delivers:**
- `.github/workflows/ci.yml` — runs on push/PR, ubuntu-latest, executes `npm test`
- `.github/workflows/build.yml` — runs on push to main, macos-latest, executes `npm run build` to verify electron-builder works
- Electron download caching (`~/.cache/electron`) for faster CI
- Coverage artifact upload or badge
- Build verification without publishing (electron-builder `--publish never`)

**Uses (from STACK.md):**
- GitHub Actions v4 (checkout, setup-node, upload-artifact)
- ubuntu-latest for tests (10x cheaper than macOS)
- macos-latest for electron-builder validation

**Implements (from ARCHITECTURE.md):**
- CI pipeline component 1: test on every push
- CI pipeline component 2: build verification (no publish yet)

**Avoids (from PITFALLS.md):**
- Pitfall 6: macOS runner cost (use Ubuntu for tests)
- Pitfall 7: Electron download failures (cache binaries)
- Pitfall 12: Fork PR secrets (test workflow needs no secrets)

**Critical path:** Depends on Phase 1 (tests must pass). Gates Phase 3 (release workflow).

---

### Phase 3: Release Automation (GitHub Release + Artifacts)
**Rationale:** Automated releases on version tags eliminate manual build/upload steps. The CLI downloads from GitHub Releases, so releases must exist before npm publishing works. Address code signing configuration and version synchronization before first release.

**Delivers:**
- `.github/workflows/release.yml` — triggered by version tag push (`v*.*.*`)
- electron-builder with `CSC_IDENTITY_AUTO_DISCOVERY=false` (unsigned builds for now)
- GitHub Release creation with DMG + ZIP assets attached
- Version bump workflow: `npm version patch/minor` creates tag, push triggers release
- Asset name pinning via `build.mac.artifactName` in package.json

**Uses (from STACK.md):**
- electron-builder 26 with macOS target
- softprops/action-gh-release@v2 for release creation
- macos-latest runner (required for electron-builder --mac)

**Implements (from ARCHITECTURE.md):**
- CI pipeline component 3: release on tag
- Artifact flow: tag → build → upload to Release

**Avoids (from PITFALLS.md):**
- Pitfall 2: Code signing failures in CI (disable auto-discovery)
- Pitfall 4: Version mismatch (single tag triggers both GitHub + npm)
- Pitfall 9: Asset name drift (pin artifactName)
- Pitfall 14: Accidental publish (only --publish on tag, never main)

**Critical path:** Depends on Phase 2 (build must work in CI). Gates Phase 4 (npm publish downloads from Releases).

---

### Phase 4: npm Publishing (CLI Distribution)
**Rationale:** Once GitHub Releases exist with ZIP assets, the npm CLI can download from them. This is the final step in the automation chain. Careful configuration prevents bloat (only ship CLI) and broken publishes (prepublishOnly guard).

**Delivers:**
- `files: ["bin/"]` in package.json (whitelist CLI only, exclude src/)
- `prepublishOnly: "npm test"` script (gate against broken publishes)
- npm publish step in release workflow (ubuntu-latest, uses NPM_TOKEN secret)
- Granular npm access token configured in GitHub Secrets
- Conditional publish: only if version not already published
- Optional: `--provenance` flag for supply chain trust

**Uses (from STACK.md):**
- npm granular access token (scoped to floatnote package)
- GitHub Actions setup-node with registry-url
- npm publish with provenance (optional but recommended)

**Implements (from ARCHITECTURE.md):**
- npm package structure: CLI-only launcher, zero dependencies
- Release workflow final step: publish after successful build

**Avoids (from PITFALLS.md):**
- Pitfall 3: Publishing source tree (files field whitelists bin/ only)
- Pitfall 10: Electron as dependency (validate zero prod deps)
- Pitfall 11: No prepublishOnly guard (add test gate)

**Critical path:** Depends on Phase 3 (GitHub Releases with ZIP assets must exist). This is the final phase.

---

### Phase Ordering Rationale

**Why this order:**
1. **Tests first** — CI is useless without working tests. The current test suite is fundamentally broken (tests mocks not source), so restructuring is P0.
2. **CI before release** — Test automation must be in place before building releases, or manual testing becomes a bottleneck.
3. **Release before npm** — The CLI downloads from GitHub Releases, so releases must exist and be stable before npm publishing works end-to-end.
4. **npm last** — npm publishing depends on everything else: tests passing (Phase 1), CI working (Phase 2), releases containing correct assets (Phase 3).

**Why this grouping:**
- Phase 1 is self-contained (no external dependencies, can be developed and tested locally)
- Phase 2 adds automation for what already works locally (tests)
- Phase 3 adds automation for what already works locally (electron-builder)
- Phase 4 ties everything together (npm publishes after successful build+release)

**How this avoids pitfalls:**
- Phase boundaries correspond to hard dependencies in ARCHITECTURE.md's build order diagram
- Each phase has explicit "Avoids" section tying to PITFALLS.md findings
- Test restructuring (Phase 1) addresses Pitfalls 1, 5, 8 before CI investment
- CI design (Phase 2) addresses Pitfalls 6, 7, 12 with runner strategy
- Release automation (Phase 3) addresses Pitfalls 2, 4, 9, 14 with version sync and signing config
- npm publishing (Phase 4) addresses Pitfalls 3, 10, 11 with file whitelisting and guards

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 2 (CI Pipeline)** — GitHub Actions for Node.js/Electron is thoroughly documented, workflow patterns are stable across projects
- **Phase 4 (npm Publishing)** — npm publish workflow is well-established, package.json fields are standardized

**Phases needing attention but not deep research:**
- **Phase 1 (Test Restructuring)** — Requires code reading and refactoring judgment, not external research. The research already identified what to test and how (extract pure functions).
- **Phase 3 (Release Automation)** — electron-builder configuration is project-specific. The research provided the config (`CSC_IDENTITY_AUTO_DISCOVERY=false`, `artifactName` pinning); implementation is straightforward.

**Future phases needing research (deferred):**
- **Code signing + notarization** — When distribution grows, Apple's tooling changes periodically and would need fresh research
- **E2E testing with Playwright** — If interaction testing is needed beyond manual QA, Playwright + Electron fixture patterns should be researched

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Jest 30, electron-builder 26, GitHub Actions v4 are current stable versions with extensive documentation; version upgrade paths are well-documented |
| Features | HIGH | Table stakes vs. differentiators are clear from Electron ecosystem norms; feature priorities align with project scope (testing + CI/CD + npm) |
| Architecture | HIGH | Standard Electron testing patterns (Jest projects, IPC mocking, pure function extraction) verified against project structure; CI/CD two-pipeline pattern is established |
| Pitfalls | HIGH | All pitfalls identified through direct project analysis (test files, package.json, .npmignore) and established Electron ecosystem anti-patterns |

**Overall confidence:** HIGH

Research was conducted against stable ecosystem patterns (Jest, electron-builder, GitHub Actions) and verified against the actual project structure. All recommendations are based on:
- Direct inspection of current codebase (package.json, jest.config.js, tests/, bin/floatnote.js, .npmignore)
- Official documentation for Jest 30, electron-builder, GitHub Actions, npm publishing
- Established Electron app distribution patterns (GitHub Releases + npm CLI launcher)

### Gaps to Address

**No significant gaps identified.** The research covered all critical areas with high confidence. Minor validation needed during implementation:

1. **Jest 30 upgrade impact** — The migration guide lists breaking changes (deprecated matcher aliases, case-sensitive mocks), but the project's test suite is simple enough that migration should be straightforward. Validate during Phase 1 test restructuring.

2. **electron-builder artifact names** — The CLI's asset name matching pattern should be tested against electron-builder 26's actual output after upgrade. Validate during Phase 3 by inspecting build artifacts.

3. **npm package size** — After configuring `files: ["bin/"]`, run `npm pack --dry-run` to verify the tarball is <100KB and contains only intended files. Validate during Phase 4 before first publish.

4. **macOS runner provisioning time** — GitHub Actions macos-latest runner availability and speed can vary. Monitor CI build times during Phase 2; if slow, consider caching strategies or build optimization.

## Sources

### Primary (HIGH confidence)
- **Project source code** — package.json, jest.config.js, src/main.js, src/renderer.js, tests/*, bin/floatnote.js, .npmignore (inspected directly)
- **Jest releases** — https://github.com/jestjs/jest/releases (verified Jest 30.2.0 current stable)
- **Jest 30 migration guide** — https://jestjs.io/docs/upgrading-to-jest30 (breaking changes documented)
- **electron-builder releases** — https://github.com/electron-userland/electron-builder/releases (verified 26.5.0 current stable)
- **Electron releases** — https://github.com/electron/electron/releases (verified 40.0.0 current, 33.0.0 project uses)
- **GitHub Actions docs** — actions/checkout@v4, actions/setup-node@v4, actions/upload-artifact@v4 (official docs)
- **Electron testing docs** — https://www.electronjs.org/docs/latest/tutorial/automated-testing (official recommendations)

### Secondary (HIGH confidence, established patterns)
- **Electron Forge CI** — https://github.com/electron/forge/.github/workflows/ci.yml (real-world Actions patterns from Electron team)
- **npm documentation** — package.json fields (files, publishConfig, engines), lifecycle scripts (prepublishOnly)
- **GitHub Actions workflow patterns** — Node.js setup, npm publish with registry-url and NODE_AUTH_TOKEN
- **softprops/action-gh-release** — https://github.com/softprops/action-gh-release (community standard for creating releases, GitHub's actions/create-release is archived)

### Tertiary (MEDIUM confidence, needs validation)
- **npm provenance** — `--provenance` flag and OIDC integration based on training data patterns; should verify npm CLI version requirements during implementation
- **Node.js LTS schedule** — Node 22 Maintenance LTS, Node 24 Active LTS (training data, verify at nodejs.org during Phase 2)

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
