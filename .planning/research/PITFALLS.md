# Domain Pitfalls: Electron Testing, CI/CD, and npm Publishing

**Domain:** Electron desktop app testing infrastructure, CI/CD automation, npm CLI publishing
**Researched:** 2026-01-22
**Overall confidence:** HIGH (based on extensive Electron ecosystem experience and project analysis)

## Critical Pitfalls

Mistakes that cause rewrites, broken releases, or major production issues.

---

### Pitfall 1: Tests That Verify Mocks Instead of Application Logic

**What goes wrong:** Tests call mock functions and assert the mock was called with the expected arguments -- they test the test setup, not the actual application behavior. The current Floatnote test suite exhibits this heavily: `main.test.js` calls `mockBrowserWindow.loadFile('src/index.html')` then asserts `toHaveBeenCalledWith('src/index.html')`. This proves nothing about the application.

**Why it happens:** Electron's main process is difficult to test because it requires native APIs. Developers create mocks, then write tests against those mocks without ever requiring/importing the actual source code being tested.

**Consequences:**
- 100% test pass rate with zero defect detection
- False confidence in code correctness
- Refactors break production but tests still pass
- Coverage numbers are meaningless (if coverage is even collected from actual source)

**Prevention:**
- Tests must `require()` or `import()` the actual source module, with mocks injected for Electron dependencies
- Use `jest.mock('electron')` at the module level so that when `main.js` is required, it gets the mock -- but the test exercises the real logic in `main.js`
- For the monolithic renderer (3100+ lines), extract testable pure functions and test those directly
- Integration tests should verify IPC handler registration by requiring main.js and checking `ipcMain.handle` was called with the right channel names

**Detection (warning signs):**
- No `require('../src/main')` or `require('../src/renderer')` anywhere in test files
- Test files reimplement application logic inline (e.g., `formatBytes` duplicated in test)
- Coverage report shows 0% on actual source files despite tests passing

**Phase mapping:** Testing phase (first priority) -- restructure existing tests before adding new ones.

---

### Pitfall 2: electron-builder CI Builds Failing on macOS Code Signing

**What goes wrong:** `electron-builder --mac` attempts code signing by default on macOS CI runners. Without proper certificates and provisioning, builds fail with cryptic errors like "No identity found for signing" or "The application's Info.plist must contain a CFBundleIdentifier."

**Why it happens:** electron-builder's macOS behavior differs drastically between local development (where Keychain has certificates) and CI (where it does not). The `--publish always` script in `package.json` will attempt to sign and notarize.

**Consequences:**
- CI pipeline blocks all PRs
- Developers disable signing entirely, shipping unsigned apps
- Notarization failures discovered only at release time
- macOS Gatekeeper blocks unsigned apps for end users

**Prevention:**
- For CI without code signing: set `CSC_IDENTITY_AUTO_DISCOVERY=false` in CI environment
- For CI with code signing: use `CSC_LINK` (base64 .p12) and `CSC_KEY_PASSWORD` secrets in GitHub Actions
- Separate `build` (no sign, for testing) from `release` (sign + notarize) workflows
- Use `--publish never` for PR check builds, `--publish always` only on tagged releases
- Test the build step in CI early -- do not wait until you need to publish to discover signing issues

**Detection (warning signs):**
- `npm run build` works locally but fails in CI
- Build errors mentioning "identity", "codesign", or "notarize"
- CI workflow uses `--publish always` on every push

**Phase mapping:** CI/CD phase -- configure build matrix before attempting publish automation.

---

### Pitfall 3: Publishing Electron's Entire Source Tree to npm

**What goes wrong:** Running `npm publish` without a `files` field in `package.json` publishes everything not in `.npmignore`. For an Electron app, this means shipping `src/main.js`, `src/renderer.js`, `src/index.html`, `src/styles.css`, electron-builder config, and all development files to npm. The npm package balloons to 10-50MB+ unnecessarily. Users installing the CLI get Electron source they cannot use.

**Why it happens:** The project has a dual identity: it is both an Electron desktop app (distributed via GitHub Releases as .dmg/.zip) AND an npm CLI tool (the `bin/floatnote.js` launcher). These two distribution paths have fundamentally different file needs.

**Consequences:**
- npm package is 10-100x larger than needed (CLI only needs `bin/` and `package.json`)
- Users see confusing source files in `node_modules/floatnote/`
- Security exposure: shipping unnecessary source code
- Slow `npm install` times

**Prevention:**
- Use the `files` field in `package.json` to explicitly whitelist: `["bin/"]`
- Alternative: ensure `.npmignore` excludes `src/`, `tests/`, `assets/`, electron config
- The current `.npmignore` excludes `tests/` but NOT `src/` -- this must be fixed
- Run `npm pack --dry-run` in CI to verify package contents before publishing
- Add a CI step that checks tarball size (fail if > 100KB for a CLI-only package)

**Detection (warning signs):**
- `npm pack --dry-run` shows `src/` files
- Published package size reported by npm is > 1MB
- `.npmignore` does not exclude `src/`, `assets/`, or Electron-specific files

**Phase mapping:** npm publishing phase -- configure `files` field before first publish.

---

### Pitfall 4: Version Mismatch Between npm Package and GitHub Release

**What goes wrong:** The npm CLI package version (`package.json` version) drifts from the GitHub Release tag version. The CLI tool downloads from "latest" GitHub Release, but users may have installed an older npm package. Or worse: the `package.json` version is bumped without creating a corresponding GitHub Release, so the CLI points to a stale binary.

**Why it happens:** Two separate publish workflows (npm publish vs GitHub Release via electron-builder) that are not synchronized. Manual version bumping is error-prone.

**Consequences:**
- `floatnote --version` shows npm package version, but downloaded app is a different version
- Users run `floatnote --update` but get an older binary than expected
- Confusion about which version is "current"
- The CLI always downloads "latest" release regardless of its own version

**Prevention:**
- Single source of truth: `package.json` version drives both npm publish and GitHub Release tag
- CI workflow: on version tag push, build Electron app, create GitHub Release, AND npm publish -- atomically
- Use `npm version patch/minor/major` which creates a git tag, then CI reacts to the tag
- Validate in CI: GitHub Release tag must match `package.json` version before npm publish proceeds

**Detection (warning signs):**
- `package.json` version and latest GitHub Release tag differ
- CI has separate triggers for npm publish vs GitHub Release
- Manual version bumping without automation

**Phase mapping:** CI/CD phase (release automation) -- this must be solved before first production publish.

---

### Pitfall 5: jsdom Tests Giving False Passes for Canvas/DOM-Heavy Renderer Code

**What goes wrong:** The renderer uses `<canvas>` extensively for drawing, gesture recognition, and image handling. jsdom does not implement Canvas2D context, `getBoundingClientRect()` returns zeros, and events like `pointerdown`/`pointermove` behave differently. Tests pass in jsdom but the feature is broken in real Electron.

**Why it happens:** jsdom simulates DOM structure but not rendering. Canvas operations (`getContext('2d')`, `drawImage`, `toDataURL`) return null or throw unless explicitly mocked. Developers mock everything, tests pass, but real rendering bugs go undetected.

**Consequences:**
- Drawing operations appear tested but are not actually verified
- Gesture/touch handling tests miss real browser event behavior
- CSS-dependent logic (opacity, visibility, z-index) cannot be tested in jsdom
- Massive monolithic renderer (3123 lines) becomes "tested" on paper but fragile in practice

**Prevention:**
- Separate renderer into testable pure logic (geometry calculations, state management, data transformations) vs. DOM/Canvas interaction code
- Test pure logic with unit tests (no jsdom needed)
- For Canvas/DOM integration: use Playwright or Electron's built-in testing with `@playwright/test` + `electron` fixture for true E2E
- Do NOT mock Canvas context in unit tests -- if a function needs Canvas, it is an integration test
- Accept that some renderer code (animation loops, paint operations) is best tested via E2E/visual regression

**Detection (warning signs):**
- Tests mock `getContext('2d')` and then assert on the mock
- `canvas` npm package added as dev dependency to make jsdom tests pass (band-aid)
- Renderer test coverage is high but bugs keep appearing in drawing features

**Phase mapping:** Testing phase -- extract pure functions first, then add E2E for interaction testing later.

---

## Moderate Pitfalls

Mistakes that cause delays, flaky CI, or accumulated technical debt.

---

### Pitfall 6: GitHub Actions macOS Runner Cost and Availability

**What goes wrong:** macOS runners on GitHub Actions cost 10x the Linux runner minutes. Free tier provides 2000 minutes/month for Linux but only 200 minutes/month for macOS. Electron builds on macOS take 5-15 minutes each. A busy PR workflow exhausts free minutes in days.

**Why it happens:** Electron macOS builds genuinely need macOS (for code signing, notarization, and `.app` bundle creation). Teams put the full build in the PR check workflow without considering cost.

**Prevention:**
- Run tests on Linux runners (Jest tests do not need macOS) -- the electron mock handles platform differences
- Only run `electron-builder --mac` on tag pushes or release branches, not on every PR
- Use workflow conditions: `if: startsWith(github.ref, 'refs/tags/')` for the build job
- Cache `node_modules` and electron download (`~/.cache/electron`) to reduce build time
- Consider self-hosted runners for frequent builds

**Detection (warning signs):**
- GitHub Actions billing shows high macOS minutes usage
- PR checks take 10+ minutes
- Builds run electron-builder on every push to any branch

**Phase mapping:** CI/CD phase -- design workflow with separate test (Linux) and build (macOS, tag-only) jobs.

---

### Pitfall 7: electron Download Failures in CI

**What goes wrong:** `npm install` in CI downloads the Electron binary (~80-180MB depending on platform). This download can fail due to rate limiting, network timeouts, or GitHub mirror issues. CI builds randomly fail with "Unable to find Electron" or ECONNRESET errors.

**Why it happens:** Electron binaries are hosted on GitHub Releases. CI environments may have restricted network access, and parallel jobs can hit rate limits. The download happens during `npm install` via the `electron` postinstall script.

**Prevention:**
- Cache the Electron binary in CI: cache `~/.cache/electron` (Linux/macOS) or `~/AppData/Local/electron/Cache` (Windows)
- Set `ELECTRON_MIRROR` environment variable to a reliable mirror if GitHub is unreliable
- Pin Electron version precisely (no `^`) to ensure cache hits: `"electron": "33.0.0"` not `"electron": "^33.0.0"`
- Add retry logic to the npm install step: `npm install || npm install || npm install`
- Consider `electron-builder install-app-deps` for production installs that skip Electron download

**Detection (warning signs):**
- Intermittent CI failures with network-related errors during install
- CI runs taking 3-5 extra minutes on cache miss
- `npm install` step shows "Downloading electron-v33" every run

**Phase mapping:** CI/CD phase -- configure caching in the very first CI workflow iteration.

---

### Pitfall 8: Monolithic Renderer Resists Unit Testing

**What goes wrong:** The 3123-line `renderer.js` is a single `Glassboard` class with deep method interdependencies. Testing one method requires instantiating the entire class, which requires DOM, Canvas, window.glassboard API, event listeners, and global state. Tests become effectively integration tests masquerading as unit tests.

**Why it happens:** Organic growth of the renderer without separation of concerns. The class manages canvas, text overlays, multi-note system, gestures, undo/redo, settings, and more -- all in one file.

**Prevention:**
- Do NOT attempt to unit-test the Glassboard class directly -- it is too coupled
- Instead: extract pure utility functions into separate modules (`geometry.js`, `history.js`, `noteState.js`)
- Test extracted modules in isolation with zero DOM dependency
- Test Glassboard integration through E2E (Playwright + Electron)
- Refactoring can be incremental: extract one module at a time, add tests for it, repeat

**Detection (warning signs):**
- Test setup for renderer requires 50+ lines of DOM/mock configuration
- Adding a test for one feature breaks tests for another due to shared state
- Developers skip writing renderer tests because setup is too complex

**Phase mapping:** Testing phase -- plan extraction as the primary testing strategy for the renderer.

---

### Pitfall 9: GitHub Release Asset Name Assumptions in CLI

**What goes wrong:** The CLI tool (`bin/floatnote.js`) searches for release assets using pattern matching: `a.name.includes('mac') && a.name.endsWith('.zip')`. electron-builder's output filename format changes between versions and configurations. A minor electron-builder update can change asset names, breaking the CLI's download logic silently.

**Why it happens:** electron-builder uses patterns like `${productName}-${version}-${arch}.zip` but the exact format depends on `build` config, target platform, and builder version. The CLI hardcodes multiple fallback patterns.

**Prevention:**
- Pin the electron-builder output filename via `build.mac.artifactName` in `package.json`: e.g., `"artifactName": "Floatnote-${version}-mac.zip"`
- Test asset name matching in CI: after building, verify the expected asset name exists
- Add an integration test for the CLI that verifies it can parse a mock GitHub Release API response with the actual asset names electron-builder produces
- Consider using a fixed asset name like `Floatnote-mac.zip` that never includes version (version is in the release tag)

**Detection (warning signs):**
- CLI downloads fail after electron-builder upgrade
- Asset name pattern in CLI does not match electron-builder's output
- The broad fallback (`a.name.endsWith('.zip')`) accidentally matches non-macOS assets

**Phase mapping:** CI/CD phase -- lock down artifact naming as part of build configuration.

---

### Pitfall 10: npm Publish Includes electron as Dependency

**What goes wrong:** If `electron` is listed in `dependencies` (not `devDependencies`), running `npm install -g floatnote` downloads 80-180MB of Electron binaries. Users only need the CLI launcher script, not Electron itself.

**Why it happens:** Confusion about the dual nature of the project. The package.json currently has `electron` in `devDependencies` (correct), but future refactoring might accidentally move it.

**Prevention:**
- Verify `electron` and `electron-builder` are ONLY in `devDependencies` -- never `dependencies`
- The published npm package should have zero production dependencies (the CLI uses only Node.js built-ins: `https`, `fs`, `path`, `child_process`)
- Add a CI check: `npm pack && tar -tzf *.tgz | grep -v node_modules` should show no bundled dependencies
- Consider adding `"dependencies": {}` explicitly to package.json to make intent clear
- Add an `npm publish --dry-run` step that verifies dependency count is zero

**Detection (warning signs):**
- `npm install -g floatnote` takes more than a few seconds
- Package size on npmjs.com shows > 100KB
- `dependencies` field in package.json has any entries

**Phase mapping:** npm publishing phase -- validate before first publish.

---

### Pitfall 11: Missing `prepublishOnly` Guard for Accidental Publishes

**What goes wrong:** A developer or CI job runs `npm publish` from an unclean state, publishing broken code, uncommitted changes, or without running tests first. There is no safety net.

**Why it happens:** npm publish is a destructive, irreversible operation (npm does not allow republishing the same version). Without lifecycle scripts, any `npm publish` succeeds regardless of project state.

**Prevention:**
- Add `"prepublishOnly": "npm test && npm run build"` to package.json scripts
- For CLI-only publish (no build needed): `"prepublishOnly": "npm test"`
- Use `npm publish --access public` explicitly (forces acknowledgment)
- Gate npm publish behind CI only -- add `"private": false` but never publish manually
- Use GitHub Actions npm publish with `NPM_TOKEN` secret, triggered only on version tags

**Detection (warning signs):**
- No `prepublishOnly` script in package.json
- Developers have `npm publish` access outside of CI
- Published versions with no corresponding git tag

**Phase mapping:** npm publishing phase -- add lifecycle scripts before configuring CI publish.

---

### Pitfall 12: GitHub Actions Secrets Not Available in Fork PRs

**What goes wrong:** External contributors fork the repo and submit PRs. GitHub Actions does not expose repository secrets to workflows triggered by fork PRs (security measure). If CI requires `GH_TOKEN`, `NPM_TOKEN`, or `CSC_LINK` to pass, all fork PRs fail CI.

**Why it happens:** GitHub's security model prevents secret exfiltration from fork PRs. This is correct behavior, but if the CI workflow does not account for it, the experience is broken.

**Prevention:**
- Split CI into "test" (no secrets needed) and "build/release" (secrets needed) workflows
- Test workflow: runs on `pull_request` event, only runs `npm test`
- Build workflow: runs on `push` to main or tags only, uses secrets for signing/publishing
- Use `if: github.event.pull_request.head.repo.full_name == github.repository` guards if secrets are needed in PR checks
- Never require secrets for the test-only workflow

**Detection (warning signs):**
- Fork PRs always fail CI
- CI workflow references secrets in jobs triggered by `pull_request`
- Single workflow handles both testing and publishing

**Phase mapping:** CI/CD phase -- design workflow separation from the start.

---

## Minor Pitfalls

Mistakes that cause developer friction but are easily fixable.

---

### Pitfall 13: Jest Coverage Thresholds Set to Zero

**What goes wrong:** The current jest.config.js has all coverage thresholds at 0%. This means coverage is collected but never enforced. As tests are added, there is no ratchet to prevent regression.

**Prevention:**
- Set initial thresholds to current actual coverage after fixing tests
- Ratchet up thresholds as coverage improves (never down)
- Use per-project thresholds (renderer will have lower coverage than CLI due to DOM coupling)

**Phase mapping:** Testing phase -- set meaningful thresholds after test restructuring.

---

### Pitfall 14: electron-builder `publish: always` in package.json

**What goes wrong:** The `release` script uses `--publish always`, which creates a GitHub Release draft on every run. If this accidentally runs in CI without proper guards, it creates garbage releases or overwrites legitimate ones.

**Prevention:**
- Use `--publish never` for all local/PR builds
- Only use `--publish always` in the release CI workflow, gated by tag push
- Consider `--publish onTagOrDraft` for more conservative behavior
- Remove `"release"` script from package.json entirely -- let CI handle release semantics

**Phase mapping:** CI/CD phase -- release workflow design.

---

### Pitfall 15: Hardcoded Paths in Tests Assume Unix

**What goes wrong:** Tests use hardcoded paths like `/mock/userData` which work on macOS/Linux but fail on Windows. While Floatnote is macOS-only, CI runners and contributors may use different platforms for running tests.

**Prevention:**
- Use `path.join()` for all path construction in tests
- Use `os.tmpdir()` or `os.homedir()` instead of hardcoded `/mock/` paths
- Tests should run on Linux CI (cheaper) even though the app targets macOS

**Phase mapping:** Testing phase -- address when restructuring test infrastructure.

---

### Pitfall 16: No Lockfile in npm Package

**What goes wrong:** The `.npmignore` excludes `package-lock.json`. This is actually correct for a CLI package (end users do not need it). However, if `package-lock.json` is also not committed to git, CI installs different dependency versions on each run.

**Prevention:**
- Commit `package-lock.json` to git (for reproducible CI installs)
- Exclude from npm package via `.npmignore` or `files` field (already done)
- Use `npm ci` instead of `npm install` in CI for deterministic installs

**Phase mapping:** CI/CD phase -- use `npm ci` in workflows.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Test Restructuring | Tests verify mocks not source (Pitfall 1) | Require actual source modules in tests, inject mocks via jest.mock() |
| Test Restructuring | Monolithic renderer untestable (Pitfall 8) | Extract pure functions before testing; accept low renderer unit test coverage |
| Test Restructuring | jsdom Canvas limitations (Pitfall 5) | Do not fight jsdom for Canvas code; plan E2E for interaction testing |
| CI/CD Setup | macOS runner costs (Pitfall 6) | Run tests on Linux; macOS only for electron-builder on tags |
| CI/CD Setup | Electron download failures (Pitfall 7) | Cache ~/.cache/electron; pin electron version precisely |
| CI/CD Setup | Fork PR secrets (Pitfall 12) | Separate test and release workflows |
| CI/CD Release | Code signing in CI (Pitfall 2) | CSC_IDENTITY_AUTO_DISCOVERY=false for non-release builds |
| CI/CD Release | Version mismatch (Pitfall 4) | Single tag-triggered workflow for both GitHub Release and npm publish |
| CI/CD Release | Accidental publish (Pitfall 14) | Never --publish always outside tag-triggered CI |
| npm Publishing | Source tree in package (Pitfall 3) | Use files field: ["bin/"]; verify with npm pack --dry-run |
| npm Publishing | Electron as dependency (Pitfall 10) | Verify zero production dependencies before publish |
| npm Publishing | No prepublishOnly guard (Pitfall 11) | Add prepublishOnly script running tests |
| npm Publishing | Asset name drift (Pitfall 9) | Pin artifactName in electron-builder config |

## Project-Specific Risk Assessment

Given Floatnote's current state, the highest-risk pitfalls are:

1. **Pitfall 1 (mock-only tests)** -- The existing test suite provides zero regression protection. This must be fixed first or all subsequent CI work builds on sand.

2. **Pitfall 3 (npm package bloat)** -- The current `.npmignore` does NOT exclude `src/`. First npm publish will ship the entire Electron app source.

3. **Pitfall 4 (version sync)** -- With separate GitHub Release and npm publish paths, version drift is almost guaranteed without automation.

4. **Pitfall 2 (code signing in CI)** -- The `release` script will fail immediately in CI without certificate secrets. This will block the first release attempt.

## Sources

- Direct analysis of project source code (`package.json`, `jest.config.js`, `bin/floatnote.js`, test files)
- Electron documentation: code signing and notarization requirements
- electron-builder documentation: publish providers, artifact naming
- GitHub Actions documentation: secret handling, macOS runner billing
- npm documentation: package publishing, lifecycle scripts, `files` field behavior
- Jest documentation: project configuration, coverage thresholds
- Confidence: HIGH for all pitfalls based on direct project analysis and established Electron ecosystem patterns
