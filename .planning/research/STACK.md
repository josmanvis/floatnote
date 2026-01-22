# Technology Stack

**Project:** Floatnote - Testing, CI/CD, and npm Publishing
**Researched:** 2026-01-22

## Current State

| Technology | Current Version | Latest Available | Action Needed |
|-----------|----------------|-----------------|---------------|
| Electron | ^33.0.0 | 40.0.0 | No upgrade needed for this milestone |
| Jest | ^29.7.0 | 30.2.0 | Upgrade recommended (see rationale) |
| jest-environment-jsdom | ^29.7.0 | 30.2.0 | Upgrade with Jest |
| electron-builder | ^25.0.0 | 26.5.0 | Upgrade recommended |
| Node.js (engines) | >=16.0.0 | 24.x LTS | Update engines field |

---

## Testing Stack

### Unit/Integration Testing

| Technology | Version | Purpose | Confidence |
|-----------|---------|---------|------------|
| Jest | ^30.2.0 | Test runner, assertions, mocking | HIGH |
| jest-environment-jsdom | ^30.2.0 | Browser-like DOM for renderer tests | HIGH |

**Why upgrade to Jest 30:**
- Jest 30 is stable (released mid-2024, now at 30.2.0). It is the current major version.
- Cleaner API: removes deprecated aliases (`toBeCalled` -> `toHaveBeenCalled`), case-sensitive mocks.
- JSDOM v26 support (better DOM compatibility).
- The project's tests are simple unit tests; migration is straightforward.
- Node 18+ requirement aligns with the project (Electron 33+ bundles Node 20+).

**Migration from Jest 29 to 30 (LOW effort for this project):**
1. Update `package.json` to `jest@^30.2.0` and `jest-environment-jsdom@^30.2.0`.
2. Search-replace deprecated matcher aliases (if any used): `toBeCalled` -> `toHaveBeenCalled`, `toBeCalledWith` -> `toHaveBeenCalledWith`, `toThrowError` -> `toThrow`.
3. Replace `jest.genMockFromModule` with `jest.createMockFromModule` (if used).
4. Update engines field to `>=18.0.0`.

**Why NOT Vitest:**
- The project is vanilla JS (no Vite, no ESM build pipeline). Vitest excels in Vite-based projects.
- Jest 30 is the established standard for Electron testing (Electron's own test suites use it).
- No benefit to switching: the project already has Jest infrastructure, mocks, and 6 test files.
- Vitest would add unnecessary complexity for zero gain here.

**Why NOT Playwright/WebdriverIO for unit tests:**
- Electron's official docs recommend Playwright/WebdriverIO for E2E testing, but this project needs unit/integration tests for renderer logic (canvas drawing, note management, settings).
- E2E testing launches a real Electron app -- overkill for testing the `Glassboard` class logic.
- Jest with jsdom is the right layer: test the renderer code in isolation without spawning Electron processes.
- If full E2E is needed later, Playwright with `_electron.launch()` is the path, but it is out of scope for this milestone.

### Coverage Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| coverageProvider | `v8` | Native V8 coverage; faster than Babel instrumentation. Default in Jest 30. |
| coverageThreshold (global) | statements: 60, branches: 50, functions: 60, lines: 60 | Achievable initial target for existing codebase. Raise over time. |
| coverageReporters | `['text', 'lcov', 'html']` | text for CI output, lcov for coverage services, html for local review |

### What NOT to Use for Testing

| Tool | Why Not |
|------|---------|
| Spectron | Deprecated since 2022. Do not use. |
| Vitest | No Vite in this project. Adds complexity without benefit. |
| Mocha/Chai | Jest already established. No reason to switch. |
| Playwright (for unit tests) | Wrong abstraction level. Use Jest for logic testing. |
| @testing-library/dom | The renderer uses raw canvas/DOM manipulation, not component rendering. Testing-library patterns don't fit. |

---

## CI/CD Stack (GitHub Actions)

### Core Actions

| Action | Version | Purpose | Confidence |
|--------|---------|---------|------------|
| actions/checkout | v4 | Clone repository | HIGH |
| actions/setup-node | v4 | Install Node.js with npm cache | HIGH |
| actions/upload-artifact | v4 | Upload build artifacts | HIGH |
| softprops/action-gh-release | v2 | Create GitHub Release with assets | HIGH |

**Why these versions:**
- v4 is the current stable line for all official GitHub Actions (v6 shown in Electron Forge CI pins specific SHAs, but those are internal pre-releases; v4 is the documented public API).
- `softprops/action-gh-release@v2` is the community standard for creating releases. GitHub's own `actions/create-release` is archived.

### Workflow Pattern: Build on Tag Push

**Trigger:** Push of version tag (`v*.*.*`)

**Why tag-based releases:**
- Standard pattern for Electron apps: tag triggers build, build uploads to GitHub Release.
- Matches the CLI's download mechanism (fetches from `releases/latest`).
- Separates CI (every push) from CD (only on version tags).

### Recommended Workflow Structure

Two workflows:

#### 1. `ci.yml` - Continuous Integration (every push/PR)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
```

**Why `macos-latest`:**
- Floatnote is macOS-only. Testing on macOS ensures jsdom behaves identically to the target platform.
- `macos-latest` currently resolves to macOS 14 (Sonoma) on GitHub Actions.
- No need for matrix builds (no Windows/Linux targets).

**Why Node 22:**
- Node 22 is Maintenance LTS (supported until April 2027). Node 24 is Active LTS.
- Electron 33 bundles Node 20.18. Node 22 is close enough for test compatibility.
- The CLI (`bin/floatnote.js`) runs on user machines; Node 22 LTS is widely installed.
- Can also test on Node 20 for broader compatibility if desired.

#### 2. `release.yml` - Build and Release (on version tag)

```yaml
name: Release
on:
  push:
    tags: ['v*.*.*']

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npx electron-builder --mac --publish never
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            dist/*.dmg
            dist/*.zip
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Why `--publish never` + separate upload step:**
- Decouples electron-builder from GitHub auth. The `softprops/action-gh-release` action handles release creation with better control over release notes, drafts, and pre-releases.
- electron-builder's built-in `--publish always` requires `GH_TOKEN` env var and creates releases with less flexibility.
- Separate steps are easier to debug when builds fail.

**Why NOT `samuelmeuli/action-electron-builder`:**
- Archived (October 2024). No longer maintained.
- Last release was v1.6.0 from 2020. Incompatible with current electron-builder 26.x.
- Rolling your own workflow with `npm ci && npx electron-builder` is more maintainable.

### macOS Code Signing (Optional, for later)

| Secret | Purpose | When Needed |
|--------|---------|-------------|
| `APPLE_ID` | Apple Developer account email | For notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | For notarization |
| `CSC_LINK` | Base64-encoded .p12 certificate | For code signing |
| `CSC_KEY_PASSWORD` | Certificate password | For code signing |

**Recommendation:** Skip code signing initially. Unsigned DMGs work for personal use and open-source distribution. Add signing when distributing to non-technical users.

---

## npm Publish Stack

### Configuration

| Setting | Value | Rationale | Confidence |
|---------|-------|-----------|------------|
| `publishConfig.access` | `public` | Explicit public access (required for scoped packages, good practice for all) | HIGH |
| `files` field | `["bin/", "package.json", "README.md"]` | Only publish the CLI, not the Electron app source | HIGH |
| `engines.node` | `>=18.0.0` | Node 18+ for modern features. Matches Jest 30 requirement. | HIGH |
| npm provenance | `--provenance` flag | Proves package was built in CI, not locally | MEDIUM |

### package.json Additions for npm Publishing

```json
{
  "files": [
    "bin/"
  ],
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Why `files` field is critical:**
- Without it, npm publishes EVERYTHING (src/, tests/, electron source).
- The CLI (`bin/floatnote.js`) is the only thing npm users need.
- Keep the npm package tiny (<10KB) -- it just downloads the app from GitHub Releases.

### Workflow Pattern: Publish on Release

```yaml
  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for provenance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Why provenance:**
- `--provenance` attaches a signed build provenance attestation to the package.
- Proves the package was built from this specific commit in this repository.
- Requires `id-token: write` permission and a supported CI (GitHub Actions qualifies).
- npm shows a green checkmark on packages with provenance -- builds user trust.

**Why `ubuntu-latest` for npm publish:**
- Publishing is platform-independent (just uploading the package tarball).
- Ubuntu runners are faster to provision and cheaper than macOS runners.
- The build job (macOS) already validated tests pass.

### npm Token Setup

1. Create a Granular Access Token at npmjs.com (Settings > Access Tokens > Generate New Token > Granular Access Token).
2. Scope it to the `floatnote` package only with "Read and write" permission.
3. Add as repository secret `NPM_TOKEN` in GitHub Settings > Secrets > Actions.

**Why Granular (not Classic) token:**
- Granular tokens are scoped to specific packages -- if leaked, damage is limited.
- Classic tokens grant full account access. Never use them in CI.
- Granular tokens support IP allowlisting and expiration.

### What NOT to Do for npm Publishing

| Anti-Pattern | Why Not | Do Instead |
|-------------|---------|------------|
| Publish from local machine | No provenance, no reproducibility, human error risk | Always publish from CI |
| Use npm automation token | Deprecated in favor of granular tokens | Use granular access token |
| Include `devDependencies` in published package | Bloats install for CLI users | Use `files` field to whitelist |
| Publish without tests passing | Broken CLI reaches users | `needs: build` dependency ensures tests pass first |
| Manual version bumps then publish | Easy to forget, version drift | Tag triggers both build AND publish |

---

## electron-builder Configuration

### Recommended Upgrade

| Package | From | To | Rationale | Confidence |
|---------|------|-----|-----------|------------|
| electron-builder | ^25.0.0 | ^26.5.0 | Current stable. Fixes DMG issues, better macOS plist support. | HIGH |

**Why upgrade:**
- 26.x is the current stable line (26.5.0 released Jan 2025).
- Better compatibility with Electron 33+ and macOS Sonoma/Sequoia.
- Improved DMG badge-icon support and Windows signing.
- The jump from 25 to 26 is non-breaking for basic macOS DMG/zip builds.

### Build Configuration (already correct in package.json)

The existing `build` config in `package.json` is well-structured:
- `appId`: set
- `productName`: set
- `mac.category`: set
- `mac.target`: `["dmg", "zip"]` (zip needed for CLI auto-update)
- `publish.provider`: `"github"` (matches CLI's download mechanism)

No changes needed to the electron-builder config itself.

---

## Version Management Strategy

### Recommended Flow

```
1. Develop on main branch
2. When ready to release:
   a. Update version in package.json: npm version patch/minor/major
   b. This creates a commit AND a git tag (v1.0.3)
   c. Push with tags: git push --follow-tags
   d. Tag push triggers release.yml:
      - Runs tests
      - Builds DMG/zip with electron-builder
      - Creates GitHub Release with assets
      - Publishes CLI to npm
```

**Why `npm version` command:**
- Atomic: updates package.json, creates commit, creates tag in one step.
- Prevents version mismatch between package.json and git tag.
- Standard npm ecosystem pattern.

---

## Complete Dependency Changes

### Add to devDependencies

```bash
npm install -D jest@^30.2.0 jest-environment-jsdom@^30.2.0 electron-builder@^26.5.0
```

### No New Dependencies Needed

The stack intentionally adds zero new libraries:
- Jest 30 replaces Jest 29 (upgrade, not addition)
- electron-builder 26 replaces 25 (upgrade, not addition)
- GitHub Actions are configured via YAML, not installed packages
- npm publish uses npm CLI (already available)

---

## Sources

| Source | URL | What It Provided | Confidence |
|--------|-----|-------------------|------------|
| Electron releases | https://github.com/electron/electron/releases | Current Electron version (40.0.0) | HIGH |
| electron-builder releases | https://github.com/electron-userland/electron-builder/releases | Current eb version (26.5.0) | HIGH |
| Jest releases | https://github.com/jestjs/jest/releases | Current Jest version (30.2.0) | HIGH |
| Jest 30 migration | https://jestjs.io/docs/upgrading-to-jest30 | Breaking changes list | HIGH |
| Jest configuration | https://jestjs.io/docs/configuration | Coverage and project config | HIGH |
| Node.js releases | https://nodejs.org/en/about/previous-releases | LTS schedule (22 maintenance, 24 active) | HIGH |
| Electron testing docs | https://www.electronjs.org/docs/latest/tutorial/automated-testing | Official testing recommendations | HIGH |
| Electron Forge CI | https://github.com/electron/forge/.github/workflows/ci.yml | Real-world Actions patterns | HIGH |
| actions/setup-node | https://github.com/actions/setup-node | npm auth and registry config | HIGH |
| action-electron-builder | https://github.com/samuelmeuli/action-electron-builder | Archived status (Oct 2024) | HIGH |
| npm provenance | Training data + OIDC docs pattern | `--provenance` flag behavior | MEDIUM |
| npm granular tokens | Training data | Token scoping best practice | MEDIUM |
