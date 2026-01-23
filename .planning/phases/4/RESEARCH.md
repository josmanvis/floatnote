# Phase 4: npm Publishing - Research

**Researched:** 2026-01-22
**Domain:** npm package publishing, CLI distribution, GitHub Actions CI/CD
**Confidence:** HIGH

## Summary

This phase configures the existing floatnote project for npm publishing as a bin-only CLI package. The CLI script (`bin/floatnote.js`, ~7KB) already exists and is fully functional -- it detects the platform, downloads the macOS app from GitHub Releases, extracts it, and launches it. The work required is purely configuration: adding the `files` field to package.json, adding a `prepublishOnly` script, and extending the Phase 3 release workflow with an npm publish step.

The npm `files` field will restrict the published tarball to only the `bin/` directory (plus always-included `package.json`, `README`, and `LICENSE`). The `prepublishOnly` lifecycle hook runs tests before any publish attempt. For CI authentication, the traditional NPM_TOKEN approach (stored as a GitHub Actions secret, passed as `NODE_AUTH_TOKEN` environment variable) is the right choice for this project's Node.js 20 target. npm Trusted Publishing (OIDC) requires npm CLI 11.5.1+ which ships with Node.js 23+, making it unsuitable for the current setup.

**Primary recommendation:** Add `"files": ["bin/"]` and `"prepublishOnly": "npm test"` to package.json, then add an `npm publish` step to the release workflow triggered by `release: types: [published]`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| npm CLI | 10.x (ships with Node 20) | Package publishing | Built-in, no extra dependencies |
| actions/setup-node | v4 | Node.js setup in CI with registry auth | Official GitHub action, handles .npmrc creation |
| actions/checkout | v4 | Repository checkout in CI | Standard for all workflows |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| npm pack --dry-run | (built-in) | Verify tarball contents pre-publish | Before every publish, in prepublishOnly or CI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| NPM_TOKEN (traditional) | Trusted Publishing (OIDC) | OIDC requires npm 11.5.1+ / Node 23+; not suitable for Node 20 target |
| Manual npm publish step | JS-DevTools/npm-publish action | Extra dependency; raw `npm publish` is simpler and more transparent |
| `release: types: [created]` | `release: types: [published]` | `published` excludes drafts, which is the correct behavior |

**Installation:**
No additional packages needed. All tooling is built into npm and GitHub Actions.

## Architecture Patterns

### Package.json Configuration for Bin-Only Publishing
```json
{
  "name": "floatnote",
  "version": "1.0.2",
  "bin": {
    "floatnote": "bin/floatnote.js"
  },
  "files": [
    "bin/"
  ],
  "scripts": {
    "prepublishOnly": "npm test"
  }
}
```

### Pattern 1: files Field for Size Control
**What:** The `files` array in package.json is a whitelist of files/directories to include in the published tarball. Only listed items plus always-included files (`package.json`, `README`, `LICENSE`, and files referenced by `bin`) end up in the package.
**When to use:** Always, for any package that has development files you don't want to ship.
**Key behavior:**
- `package.json` is ALWAYS included (cannot be excluded)
- Files referenced in `bin` are ALWAYS included
- `README` and `LICENSE` are ALWAYS included
- The file referenced by `main` is ALWAYS included (even if not in `files`)
- `.git`, `node_modules`, lock files are ALWAYS excluded

**Critical issue for this project:** The current `"main": "src/main.js"` will cause `src/main.js` to be included in the tarball even with `"files": ["bin/"]`. Since this is a CLI-only package that nobody will `require()`, the `main` field should be removed or pointed to the bin entry.

### Pattern 2: prepublishOnly Lifecycle Hook
**What:** A script that runs BEFORE the package is packed, ONLY on `npm publish`. It does NOT run on `npm install`.
**When to use:** To gate publishing on test passage.
**Lifecycle order:** `prepublishOnly` -> `prepack` -> `prepare` -> `postpack` -> `publish` -> `postpublish`
```json
{
  "scripts": {
    "prepublishOnly": "npm test"
  }
}
```

### Pattern 3: Release-Triggered npm Publish in CI
**What:** GitHub Actions workflow step that publishes to npm when a GitHub Release is published.
**When to use:** After the release workflow creates the GitHub Release with artifacts.
**Example:**
```yaml
# Source: https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages
on:
  release:
    types: [published]

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Pattern 4: npx Execution Flow
**What:** When a user runs `npx floatnote`, npm downloads the package to a temporary cache, adds the bin to PATH, and executes it. The bin script then downloads the actual app from GitHub Releases.
**Flow:**
1. `npx floatnote` -> npm downloads `floatnote` package (~7KB)
2. npm executes `bin/floatnote.js`
3. Script calls GitHub API for latest release
4. Script downloads the macOS ZIP from release assets
5. Script extracts to `~/.floatnote/`
6. Script launches via `open Floatnote.app`

**Key behavior:** After npx execution, the temp package is cleaned up. The downloaded app persists at `~/.floatnote/`. Subsequent `npx floatnote` calls check for updates before launching.

### Anti-Patterns to Avoid
- **Including `main` pointing to Electron source:** A `main` field pointing to `src/main.js` causes npm to always include it in the tarball, defeating the purpose of `files: ["bin/"]`. Remove or redirect `main` for the CLI package.
- **Using `release: types: [created]`:** This fires for draft releases too. Use `types: [published]` to only publish on non-draft releases.
- **Skipping `registry-url` in setup-node:** Without `registry-url: 'https://registry.npmjs.org'`, the `.npmrc` file won't be created with auth credentials, and `npm publish` will fail silently or with a confusing error.
- **Publishing from the build/release job directly:** Keep npm publish as a separate job or workflow step that only depends on a successful release. The npm publish step does NOT need macOS -- it can run on ubuntu-latest since it only publishes the bin/ directory.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Registry authentication in CI | Custom .npmrc file creation | `actions/setup-node` with `registry-url` | Handles auth token injection, .npmrc creation, proper scoping |
| Version bumping | Manual package.json edits | `npm version patch/minor/major` | Creates commit + tag atomically (handled by Phase 3) |
| Package content verification | Custom file listing scripts | `npm pack --dry-run` | Shows exact tarball contents with sizes |
| CLI download/extract logic | New download implementation | Existing `bin/floatnote.js` | Already handles redirects, progress, extraction, version caching |

**Key insight:** The CLI script is already built and working. This phase is purely about npm configuration and CI pipeline extension. No new code is needed for the CLI itself.

## Common Pitfalls

### Pitfall 1: main Field Leaking Source Code into Tarball
**What goes wrong:** With `"main": "src/main.js"`, npm always includes `src/main.js` in the published tarball regardless of the `files` field.
**Why it happens:** npm treats the `main` entry point as always-included (like package.json and README).
**How to avoid:** Remove the `main` field entirely from package.json, OR change it to point to the bin script. For a CLI-only package, `main` is unnecessary.
**Warning signs:** `npm pack --dry-run` shows files outside `bin/` in the tarball.

### Pitfall 2: NPM_TOKEN Secret Not Available in Release Workflow
**What goes wrong:** `npm publish` fails with 401/403 because the secret is not accessible.
**Why it happens:** GitHub secrets are not automatically available to workflows triggered by releases created by other workflows (if using GITHUB_TOKEN).
**How to avoid:** Ensure `NPM_TOKEN` is a repository secret (Settings -> Secrets -> Actions), not an environment secret. If the release is created by a workflow using PAT, the subsequent workflow will have access to all repo secrets.
**Warning signs:** `npm ERR! code E401` or `npm ERR! code E403` in CI logs.

### Pitfall 3: Package Already Published at This Version
**What goes wrong:** `npm publish` fails because the version already exists on the registry.
**Why it happens:** The publish step ran twice (manual + CI), or the workflow re-ran.
**How to avoid:** The version in package.json should be bumped by Phase 3's `npm version` step before the tag is pushed. Each tag triggers exactly one release, which triggers exactly one publish. If re-running, the publish step will fail harmlessly.
**Warning signs:** `npm ERR! code E403` with "You cannot publish over the previously published versions".

### Pitfall 4: npx Prompts for Confirmation (npm v7+)
**What goes wrong:** When users run `npx floatnote` for the first time, npm asks "Need to install the following packages: floatnote. Ok to proceed? (y)".
**Why it happens:** npm v7+ added a security prompt for packages not locally installed.
**How to avoid:** This is expected behavior and cannot be suppressed without `--yes` flag. Document it in README. Users can also run `npm install -g floatnote` to avoid the prompt.
**Warning signs:** Users report the command "hangs" (actually waiting for input in non-interactive shells).

### Pitfall 5: require('../package.json') in bin Script
**What goes wrong:** The `--version` flag fails if package.json is not accessible relative to the bin script.
**Why it happens:** Line 106 of `bin/floatnote.js` does `require('../package.json')` for the version number.
**How to avoid:** This actually works correctly because: (1) package.json is always included in published packages, and (2) Node.js resolves symlinks to their real path, so `__dirname` points to the actual file location inside `node_modules/floatnote/bin/`, making `../package.json` resolve to `node_modules/floatnote/package.json`.
**Warning signs:** None -- this pattern is safe. But if someone refactors the directory structure, they need to maintain this relationship.

### Pitfall 6: electron and devDependencies Pulled During npx Install
**What goes wrong:** `npx floatnote` takes forever because it tries to install electron.
**Why it happens:** If `electron` were in `dependencies` instead of `devDependencies`, npx would install it.
**How to avoid:** All Electron-related packages MUST remain in `devDependencies`. The published CLI package has ZERO runtime dependencies -- it uses only Node.js built-in modules (`https`, `child_process`, `fs`, `path`).
**Warning signs:** `npm pack --dry-run` shows a large package size; `npx` takes more than a few seconds.

## Code Examples

Verified patterns from official sources:

### Complete package.json Changes
```json
{
  "name": "floatnote",
  "version": "1.0.2",
  "description": "Transparent always-on-top drawing and note-taking overlay for macOS",
  "bin": {
    "floatnote": "bin/floatnote.js"
  },
  "files": [
    "bin/"
  ],
  "scripts": {
    "start": "electron .",
    "dev": "electron . --enable-logging",
    "build": "electron-builder --mac --publish never",
    "release": "electron-builder --mac --publish always",
    "test": "jest",
    "test:e2e": "npx playwright test",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepublishOnly": "npm test"
  }
}
```

**Key changes from current:**
1. Added `"files": ["bin/"]` -- restricts published package to bin/ only
2. Added `"prepublishOnly": "npm test"` -- gates publish on test passage
3. Removed `"main": "src/main.js"` -- prevents src/main.js from leaking into tarball

### npm Publish Step in GitHub Actions
```yaml
# Source: https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages
# This can be added as a job in the existing release workflow
publish-npm:
  needs: release  # Wait for the release job from Phase 3 to complete
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        registry-url: 'https://registry.npmjs.org'
    - run: npm publish
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Verification Commands
```bash
# Before publishing: verify tarball contents
npm pack --dry-run
# Expected output: only bin/floatnote.js, package.json, README.md, LICENSE
# Expected package size: under 10KB

# Test the full flow locally
npm pack
# Creates floatnote-1.0.2.tgz
# Can install in another directory to test:
# cd /tmp && npm install /path/to/floatnote-1.0.2.tgz
```

### NPM_TOKEN Creation Steps
```
1. Go to https://www.npmjs.com/settings/tokens
2. Click "Generate New Token" -> "Granular Access Token"
3. Token name: "floatnote-github-actions"
4. Expiration: No expiration (or set a reminder to rotate)
5. Packages: "Only select packages" -> "floatnote"
6. Permissions: "Read and write"
7. Copy the token

8. Go to GitHub repo Settings -> Secrets and variables -> Actions
9. Click "New repository secret"
10. Name: NPM_TOKEN
11. Value: paste the token
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Long-lived automation tokens | Granular access tokens | npm 2022+ | Scoped permissions per package |
| `prepublish` (ran on install too) | `prepublishOnly` (publish only) | npm 5+ | No more accidental builds on install |
| Global automation tokens | Trusted Publishing (OIDC) | npm 11.5.1 (2025) | No secrets needed, but requires Node 23+ |
| `release: types: [created]` | `release: types: [published]` | Always preferred | Excludes draft releases |

**Deprecated/outdated:**
- `prepublish` script: Still runs on `npm install` in some cases. Use `prepublishOnly` instead.
- Classic automation tokens (full write access to all packages): Use granular tokens scoped to specific packages.
- npm Trusted Publishing: Available but requires npm 11.5.1+ (Node 23+). Defer to v2 (NPM-06 requirement already tracks provenance).

## Open Questions

Things that couldn't be fully resolved:

1. **Should `main` be removed entirely or redirected?**
   - What we know: Removing `main` is safe for CLI-only packages. Nobody will `require('floatnote')`.
   - What's unclear: Will Electron's `electron .` launcher break if `main` is removed? It uses `main` to find the entry point.
   - Recommendation: Keep `main` in the full package.json but ensure it's excluded from the published tarball via `files`. Actually, `main` field value is always included regardless of `files`. The solution is to either: (a) accept the ~20KB overhead of including src/main.js, or (b) remove the `main` field and use Electron's alternate entry point configuration. The simplest approach: **remove `main` and add `"main": "src/main.js"` to the `"build"` section** or use electron's `--entry` flag. OR simpler: just accept that src/main.js will be included (20KB overhead is acceptable for a ~30KB total package). **Recommended: Remove `main` field and let Electron use the default entry point behavior (it reads from package.json `main` at runtime, but electron-builder handles this during build).**

2. **Will removing `main` break `electron .`?**
   - What we know: `electron .` reads `main` from `package.json` to find the entry point.
   - What's unclear: Whether electron-builder's build process hard-codes the entry point or reads it dynamically.
   - Recommendation: Test `electron .` after removing `main` field. If it breaks, keep `main` and accept the extra 20KB in the npm tarball (still well under the 10KB target for bin/ alone, making total package ~30KB which is fine).

3. **Workflow trigger: separate workflow vs. job in release workflow?**
   - What we know: Phase 3 will create a release workflow. npm publish needs to run after release succeeds.
   - What's unclear: Whether to add a job to Phase 3's workflow or create a separate workflow.
   - Recommendation: Add as a `publish-npm` job with `needs: [release-job-name]` in the same release workflow. Simpler than cross-workflow triggers and avoids the GITHUB_TOKEN limitation for triggering subsequent workflows.

## Sources

### Primary (HIGH confidence)
- npm official docs: package.json `files` field - https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
- npm official docs: lifecycle scripts (prepublishOnly) - https://docs.npmjs.com/cli/v10/using-npm/scripts#life-cycle-scripts
- GitHub official docs: Publishing Node.js packages - https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages
- npm official docs: Trusted Publishing - https://docs.npmjs.com/trusted-publishers/

### Secondary (MEDIUM confidence)
- GitHub community discussions: release event types (created vs published) - https://www.codegenes.net/blog/github-action-different-between-release-created-and-published/
- Multiple GitHub Actions npm publish examples confirming the pattern
- npm pack --dry-run documentation and usage patterns

### Tertiary (LOW confidence)
- Node.js symlink resolution behavior for bin scripts (confirmed via Node.js issue tracker but complex topic)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official npm and GitHub docs confirm all patterns
- Architecture: HIGH - package.json `files` and `prepublishOnly` are well-documented, stable features
- Pitfalls: HIGH - main field inclusion is documented; CLI already works correctly
- CI Publishing: HIGH - GitHub's official docs provide exact workflow

**Research date:** 2026-01-22
**Valid until:** 90 days (npm publishing patterns are very stable; no fast-moving dependencies)
