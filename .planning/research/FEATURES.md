# Feature Landscape

**Domain:** Electron desktop app testing, CI/CD, and npm CLI publishing
**Researched:** 2026-01-22
**Overall confidence:** MEDIUM-HIGH (based on mature ecosystem patterns; WebSearch unavailable for latest tooling changes)

## Table Stakes

Features users/maintainers expect. Missing = project feels unprofessional or unshippable.

### Testing

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Unit tests for pure logic | Core quality gate; prevents regressions in drawing math, undo/redo, selection | Low | None | Current tests exist but test data structures, not actual logic |
| Coverage thresholds | Prevents coverage regression; current thresholds are 0% (meaningless) | Low | Unit tests | Set realistic thresholds (60-70% for statements) |
| Test isolation / proper mocking | Tests must exercise real code, not just mock assertions | Med | None | Current tests mostly test mocks calling mocks; need to import actual modules |
| Canvas/drawing logic tests | Core value prop - drawing, line interpolation, hit testing | Med | jsdom + canvas mock | Use `jest-canvas-mock` or manual Canvas2D mock |
| Undo/redo stack tests | Complex stateful logic prone to subtle bugs | Med | Unit tests | Test push/pop/redo-after-undo edge cases |
| Selection/clipboard tests | Multi-select, copy/paste, drag - user-critical flows | Med | Canvas mock | Test object grouping, multi-select rect, clipboard ops |
| Text overlay tests | Text creation, editing, positioning, deletion | Low-Med | jsdom | DOM-based, easier to test than canvas |
| CLI test coverage | npm-published CLI must work reliably | Low | fs/https mocks | Current tests exist but only test re-implemented logic |
| Pre-commit test gate | Tests must pass before code is committed | Low | Tests passing | Use simple `pre-commit` hook or lint-staged |

### CI/CD

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Run tests on push/PR | Prevents broken merges | Low | GitHub Actions | Standard `node` + `npm test` workflow |
| Build verification | Ensures electron-builder succeeds | Med | macOS runner | `macos-latest` runner needed for macOS builds |
| Automated GitHub Release | Tag-triggered release with built artifacts | Med | Build passing | electron-builder `--publish always` on tag push |
| Version bump workflow | Consistent versioning between package.json and git tags | Low | npm version | `npm version patch/minor` + push tag |

### npm Publishing

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| `prepublishOnly` script | Run tests before publish to prevent broken releases | Low | Tests passing | `"prepublishOnly": "npm test"` |
| `.npmignore` or `files` field | Only ship CLI-relevant files, not Electron source | Low | None | Use `files: ["bin/", "package.json"]` |
| Proper `bin` field | CLI must be invocable after `npm install -g` | Low | None | Already configured correctly |
| Minimum node engine | Prevent install on unsupported Node versions | Low | None | Already has `engines.node >= 16` |
| npm publish CI step | Automated publish on release/tag | Med | NPM_TOKEN secret | GitHub Action: `npm publish` on tag |

## Differentiators

Features that improve quality beyond table stakes. Nice-to-have for a solo/small project.

### Testing

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Integration tests (IPC round-trips) | Catch main<->renderer communication bugs | High | Custom test harness | Mock both sides of IPC channel, verify data flows |
| Snapshot tests for settings/data | Catch unintended data shape changes | Low | Jest snapshots | Useful for serialization format stability |
| Visual regression tests | Catch rendering bugs in canvas output | High | Playwright or canvas-to-PNG | Overkill for this project scope |
| E2E tests with Playwright/Electron | Full app launch + interaction tests | High | @playwright/test + electron | Real browser context; catches integration bugs but slow, flaky |
| Mutation testing | Verify test quality (not just coverage) | Med | Stryker | Reveals tests that pass regardless of code changes |
| Performance benchmarks | Track drawing/rendering speed regressions | Med | Custom harness | Useful if performance is a concern |

### CI/CD

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| macOS code signing | Trusted distribution, no Gatekeeper warnings | High | Apple Developer cert + notarytool | Requires $99/yr Apple Developer account, certificate management |
| Notarization | Apple malware scan approval | High | Code signing | Cannot notarize without signing first |
| Auto-update (electron-updater) | Seamless updates without CLI re-download | High | Code signing + publish | Requires signed builds + update server |
| Multi-arch builds (x64 + arm64) | Support both Intel and Apple Silicon natively | Med | electron-builder config | Universal binary or separate builds |
| Release notes generation | Changelog from commits | Low | conventional-commits or similar | `git log --oneline` between tags |
| PR status checks (required) | Block merge on failing tests | Low | CI passing | GitHub branch protection rule |
| Caching node_modules in CI | Faster CI runs | Low | actions/cache | Standard pattern for Node.js projects |

### npm Publishing

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Scoped package name | Namespace clarity (`@josmanvis/floatnote`) | Low | npm org | Prevents name conflicts |
| `postinstall` welcome message | Guide new users after `npm install -g` | Low | None | Print usage instructions |
| Provenance attestation | npm supply chain trust (SLSA) | Low-Med | GitHub Actions OIDC | `npm publish --provenance` |
| CLI self-update command | Update CLI without `npm update -g` | Med | npm registry check | Already partially implemented via `--update` for app |

## Anti-Features

Features to explicitly NOT build for this scope. Common over-engineering traps.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| E2E tests with real Electron launch | Slow, flaky, requires display server in CI, overkill for transparent overlay app | Unit test logic in isolation; trust Electron APIs work |
| Visual regression testing | Canvas output varies across platforms; enormous maintenance burden | Test drawing logic (point arrays, hit testing), not pixel output |
| Cross-platform CI (Windows, Linux) | App is macOS-only; no value in testing platforms you don't ship | Single macOS runner |
| Code signing in CI for every PR | Expensive (runner minutes), slow, only needed for releases | Only sign on tag/release builds |
| Semantic release automation | Over-engineered for solo project; simple `npm version` + tag suffices | Manual version bump + tag push triggers release |
| Docker-based CI | Electron needs native display; Docker adds complexity with no benefit | Native macOS runner |
| Full Playwright E2E suite | Requires maintaining test fixtures, display server, long CI times | Focus on unit testing extracted logic |
| Coverage 90%+ threshold | Forcing coverage on hard-to-test DOM/canvas code leads to meaningless tests | 60-70% threshold on logic modules; skip generated/config |
| Monorepo tooling (Turborepo, Nx) | Single package, single build target; no monorepo complexity | Keep flat structure |
| Automated dependency updates (Renovate/Dependabot) | Electron major version bumps break things; needs manual review | Periodic manual updates |
| npm workspace setup | CLI and Electron app are already in same package correctly | Keep single package.json |

## Feature Dependencies

```
Unit tests (logic extraction)
  --> Coverage thresholds
  --> Pre-commit hooks
  --> CI test step

CI test step
  --> Build verification (macOS runner)
  --> Automated release (tag trigger)
  --> npm publish step

npm publish step
  --> .npmignore / files field
  --> prepublishOnly script
  --> NPM_TOKEN secret in GitHub

Automated release
  --> Version bump workflow
  --> electron-builder publish

Code signing (DEFERRED)
  --> Notarization (DEFERRED)
  --> Auto-update (DEFERRED)
```

## Recommended Priority for This Milestone

### Phase 1: Test Core Logic
1. Extract testable logic from `renderer.js` (pure functions for drawing math, undo/redo, selection hit-testing)
2. Write real unit tests that import and exercise actual code (not mock-only tests)
3. Add `jest-canvas-mock` for canvas context testing
4. Set meaningful coverage thresholds (60% statements, 50% branches)

### Phase 2: CI Pipeline
1. GitHub Actions workflow: test on push/PR (ubuntu for tests, macos for build)
2. Build verification step (electron-builder --mac on macos runner)
3. Tag-triggered release with artifact upload
4. Cache node_modules for speed

### Phase 3: npm Publish
1. Add `files` field to package.json (only ship `bin/` and `package.json`)
2. Add `prepublishOnly: "npm test"` script
3. GitHub Action step: publish to npm on GitHub Release
4. Test the install-from-npm flow

### Defer to Future Milestone
- Code signing + notarization (requires Apple Developer account, $$)
- Auto-update via electron-updater
- E2E / integration tests
- Multi-arch builds (can add to electron-builder config later)
- Provenance attestation (nice but not blocking)

## Key Observations About Current Tests

The existing tests have a significant quality gap: they primarily test mock objects and re-implemented logic rather than importing and exercising the actual source code. For example:

- `notes.test.js`: Creates local arrays and tests array operations, never imports `renderer.js`
- `settings.test.js`: Tests object property assignment, never validates actual settings behavior
- `main.test.js`: Calls mock functions and asserts the mocks were called (tautological)
- `floatnote.test.js`: Re-implements `formatBytes` locally rather than testing the real function

**The core issue**: The `Glassboard` class in `renderer.js` is a 2000+ line monolith. Testing it requires either:
1. **Extracting pure logic** into importable modules (recommended)
2. **Instantiating the full class** in jsdom with canvas mocks (fragile)

Option 1 (extraction) is the table-stakes approach: pull out pure functions (coordinate math, hit testing, undo stack management, data serialization) into separate modules that can be trivially unit tested.

## Confidence Notes

| Area | Confidence | Reason |
|------|------------|--------|
| Testing patterns | HIGH | Jest, jsdom, canvas mocking are mature patterns with stable APIs |
| CI/CD for Electron | HIGH | GitHub Actions + electron-builder is the standard pipeline, well-documented |
| npm publishing | HIGH | Stable ecosystem; `files`, `prepublishOnly`, NPM_TOKEN patterns unchanged for years |
| Code signing/notarization | MEDIUM | Apple's tooling changes periodically; would need research when implementing |
| E2E testing tools | MEDIUM | Playwright+Electron support exists but maturity and DX vary across versions |

## Sources

- Electron Builder documentation (electron.build) - publishing configuration, CI patterns
- Jest documentation (jestjs.io) - projects, coverage, canvas mocking
- GitHub Actions documentation - Node.js workflow, macOS runners, npm publish
- npm documentation - package.json fields, publishing, provenance
- Project source code analysis (this repository)

Note: WebSearch was unavailable during this research. Recommendations are based on established ecosystem patterns that are stable across the 2024-2026 timeframe. Code signing specifics should be re-researched when that phase is undertaken.
