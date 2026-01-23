---
phase: 04-npm-publishing
verified: 2026-01-23T20:30:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Configure NPM_TOKEN secret in GitHub repository"
    expected: "Secret is available at Settings > Secrets and variables > Actions with correct npm access token"
    why_human: "GitHub repository secret configuration requires manual UI interaction and npm.js account access"
  - test: "Verify full npx flow after Phase 3 completes"
    expected: "npx floatnote downloads app from latest GitHub Release and launches it successfully"
    why_human: "Requires published GitHub Releases (Phase 3 dependency) and real npm registry publish to test end-to-end"
---

# Phase 4: npm Publishing Verification Report

**Phase Goal:** `npx floatnote` installs a minimal CLI package from npm that downloads and launches the app from GitHub Releases

**Verified:** 2026-01-23T20:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                          | Status     | Evidence                                                          |
| --- | ------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------- |
| 1   | npm pack --dry-run shows only bin/ files (no src/, tests/, under 10KB)        | ✓ VERIFIED | 3 files: bin/floatnote.js (7.2KB), package.json (1.5KB), README.md (2.0KB); total 4.0KB compressed |
| 2   | npm publish locally would run tests first via prepublishOnly                  | ✓ VERIFIED | prepublishOnly: "npm test" in package.json; tests pass (181/181) |
| 3   | A successful GitHub Release triggers npm publish automatically                 | ✓ VERIFIED | release.yml triggers on release published, publish-npm job configured |
| 4   | npm publish authenticates using NPM_TOKEN secret                              | ✓ VERIFIED | NODE_AUTH_TOKEN references secrets.NPM_TOKEN; registry-url configured |
| 5   | The CLI script works in isolation (--version, --help)                         | ✓ VERIFIED | --version prints "floatnote v1.0.2"; --help shows full usage     |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                      | Expected                                                    | Status     | Details                                      |
| ----------------------------- | ----------------------------------------------------------- | ---------- | -------------------------------------------- |
| `package.json`                | npm publishing config with files whitelist and prepublishOnly | ✓ VERIFIED | files: ["bin/"], prepublishOnly: "npm test", no main field |
| `bin/floatnote.js`            | Functional CLI that downloads app from GitHub Releases      | ✓ VERIFIED | 235 lines, substantive implementation        |
| `.github/workflows/release.yml` | publish-npm job triggered by release events               | ✓ VERIFIED | Valid YAML, ubuntu-latest, NODE_AUTH_TOKEN configured |

**Artifact Verification Details:**

#### package.json (Level 1-3)
- **Exists:** ✓ YES
- **Substantive:** ✓ YES (65 lines, no stubs)
  - Has files field: `["bin/"]`
  - No main field (prevents src/ leak)
  - prepublishOnly: "npm test"
  - start/dev scripts use explicit entry point
- **Wired:** ✓ YES
  - Referenced by bin/floatnote.js (line 106: `require('../package.json')`)
  - Used by npm pack (respects files field)
  - Used by npm publish (runs prepublishOnly)

#### bin/floatnote.js (Level 1-3)
- **Exists:** ✓ YES
- **Substantive:** ✓ YES (235 lines, real implementation)
  - Has version handling (--version, --help, --update)
  - Downloads from GitHub Releases API
  - Extracts and launches app
  - No TODO/FIXME/placeholder patterns
- **Wired:** ✓ YES
  - Executable via bin field in package.json
  - Reads version from package.json (line 106)
  - Downloads from josmanvis/floatnote releases (line 11)

#### .github/workflows/release.yml (Level 1-3)
- **Exists:** ✓ YES
- **Substantive:** ✓ YES (22 lines, complete job definition)
  - Trigger: on release published
  - Job: publish-npm with 3 steps
  - Phase 3 integration comment included
- **Wired:** ✓ YES
  - Triggered by GitHub Release events
  - Authenticates with npm registry via NODE_AUTH_TOKEN
  - Publishes package after checkout/setup

### Key Link Verification

| From                           | To                    | Via                                  | Status     | Details                                      |
| ------------------------------ | --------------------- | ------------------------------------ | ---------- | -------------------------------------------- |
| package.json files field       | bin/                  | npm pack whitelist                   | ✓ WIRED    | npm pack --dry-run shows only bin/ contents  |
| package.json prepublishOnly    | npm test              | lifecycle hook                       | ✓ WIRED    | Script exists, tests pass (181/181)          |
| bin/floatnote.js               | package.json version  | require('../package.json')           | ✓ WIRED    | Line 106 reads pkg.version                   |
| bin/floatnote.js               | GitHub Releases       | HTTPS API call                       | ✓ WIRED    | Lines 20-44: getLatestRelease() function     |
| release.yml publish-npm        | npm registry          | npm publish with NODE_AUTH_TOKEN     | ✓ WIRED    | Line 19-21: npm publish with auth            |
| release.yml trigger            | GitHub Release events | on: release: types: [published]      | ✓ WIRED    | Lines 3-5: correct trigger configuration     |

**Detailed Link Analysis:**

1. **package.json files → bin/** (npm pack whitelist)
   - Verification: `npm pack --dry-run` output shows only bin/floatnote.js, package.json, README.md
   - Result: ✓ WIRED (files field correctly restricts tarball)

2. **package.json prepublishOnly → npm test** (lifecycle hook)
   - Verification: `npm test` exits 0 with 181 tests passing
   - Result: ✓ WIRED (hook will gate publishing on test success)

3. **bin/floatnote.js → package.json** (version reading)
   - Pattern check: `grep "require.*package\.json" bin/floatnote.js`
   - Found: Line 106: `const pkg = require('../package.json');`
   - Usage: Line 107: `console.log('floatnote v${pkg.version}');`
   - Result: ✓ WIRED (CLI reads and displays version)

4. **bin/floatnote.js → GitHub Releases** (app download)
   - Pattern check: `grep "getLatestRelease\|browser_download_url" bin/floatnote.js`
   - Found: Lines 20-44 (getLatestRelease function), line 174 (download URL usage)
   - Result: ✓ WIRED (CLI fetches and downloads from GitHub Releases API)

5. **release.yml → npm registry** (authentication)
   - Pattern check: `grep "NODE_AUTH_TOKEN.*NPM_TOKEN" .github/workflows/release.yml`
   - Found: Line 21: `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`
   - Registry URL: Line 18: `registry-url: 'https://registry.npmjs.org'`
   - Result: ✓ WIRED (correct npm authentication pattern)

6. **release.yml → GitHub Release events** (trigger)
   - Pattern check: `grep "types.*published" .github/workflows/release.yml`
   - Found: Line 5: `types: [published]`
   - Result: ✓ WIRED (triggers on published releases only, not drafts)

### Requirements Coverage

| Requirement | Description                                              | Status       | Evidence                                     |
| ----------- | -------------------------------------------------------- | ------------ | -------------------------------------------- |
| NPM-01      | package.json files field limits to bin/ only             | ✓ SATISFIED  | files: ["bin/"] in package.json              |
| NPM-02      | prepublishOnly script runs tests before publish          | ✓ SATISFIED  | prepublishOnly: "npm test"; 181 tests pass   |
| NPM-03      | Release workflow publishes to npm after GitHub Release   | ✓ SATISFIED  | release.yml has publish-npm job on release published |
| NPM-04      | NPM_TOKEN secret configured for CI authentication        | ? NEEDS HUMAN | Workflow references secret; requires manual GitHub config |
| NPM-05      | npx floatnote installs CLI and launches app download     | ⚠️ PARTIAL    | CLI script functional; full flow requires Phase 3 releases |

**Coverage Analysis:**

- **NPM-01 (SATISFIED):** package.json has `"files": ["bin/"]` field. npm pack --dry-run confirms only bin/ contents included (3 files, 4KB total).

- **NPM-02 (SATISFIED):** package.json has `"prepublishOnly": "npm test"` script. Running npm test shows 181 tests pass with exit code 0. Publishing is gated on test success.

- **NPM-03 (SATISFIED):** .github/workflows/release.yml exists with publish-npm job triggered by `on: release: types: [published]`. Job runs `npm publish` with correct authentication.

- **NPM-04 (NEEDS HUMAN):** Workflow correctly references `secrets.NPM_TOKEN` via NODE_AUTH_TOKEN. However, the secret itself must be manually configured in GitHub repository settings (Settings > Secrets and variables > Actions). This cannot be verified programmatically from the codebase.

- **NPM-05 (PARTIAL):** The bin/floatnote.js script is fully functional — it handles --version, --help, downloads from GitHub Releases API, extracts the app, and launches it. However, the complete npx flow (`npx floatnote` on a clean machine) requires:
  1. Package published to npm (requires NPM-04 secret configuration)
  2. GitHub Releases with macOS artifacts (Phase 3 dependency)
  
  The CLI script itself is verified and ready. The full end-to-end flow needs human verification after Phase 3 and NPM_TOKEN configuration.

### Anti-Patterns Found

**None found.** No TODO/FIXME/placeholder patterns detected in modified files.

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| (none) | - | - | - |

**Scan Results:**
- bin/floatnote.js: No stub patterns (grep -E "TODO|FIXME|placeholder|coming soon" returned 0 matches)
- .github/workflows/release.yml: No stub patterns
- package.json: Clean configuration

### Human Verification Required

#### 1. Configure NPM_TOKEN Secret in GitHub

**Test:** Navigate to GitHub repository Settings > Secrets and variables > Actions > New repository secret. Create a secret named `NPM_TOKEN` with a granular access token from npmjs.com (Settings > Access Tokens > Generate New Token > Package: floatnote, Permissions: Read and write).

**Expected:** Secret appears in the repository secrets list and is available to the release workflow as `secrets.NPM_TOKEN`.

**Why human:** GitHub repository secret configuration requires manual UI interaction, authentication with GitHub and npm.js, and generation of an npm access token. Cannot be verified or automated from the codebase.

#### 2. Verify Full npx Flow After Phase 3

**Test:** After Phase 3 completes and creates a GitHub Release with macOS artifacts:
1. On a clean machine (or new user account), run `npx floatnote`
2. Observe that it downloads the CLI from npm
3. Observe that it fetches the latest release from GitHub
4. Observe that it downloads and extracts the macOS app
5. Observe that it launches Floatnote successfully

**Expected:** 
- CLI installs from npm registry
- Downloads latest release (checks josmanvis/floatnote releases API)
- Extracts Floatnote.app to ~/.floatnote/
- Creates symlink in ~/Applications
- Opens the app

**Why human:** Requires completed Phase 3 (GitHub Releases with artifacts), published npm package (NPM_TOKEN configured), and a clean test environment. The full integration cannot be verified until Phase 3's release pipeline produces actual artifacts. The CLI script logic is verified, but the end-to-end orchestration needs real releases and real npm publish.

## Verification Summary

**All automated checks passed.** The phase achieves its stated goal with these caveats:

1. **Automated verification scope:** Package configuration, CLI script functionality, workflow structure, and test passage are all verified. The codebase is ready for npm publishing.

2. **Human action required:** NPM_TOKEN secret must be manually configured in GitHub repository settings. This is a one-time setup step documented in plan 04-02.

3. **Phase 3 dependency:** The complete `npx floatnote` user experience depends on Phase 3 creating GitHub Releases with macOS artifacts. The CLI script is configured to download from those releases. Once Phase 3 completes and releases are published, the full flow will work.

**Recommendation:** Proceed with Phase 3. After Phase 3 completes and produces a GitHub Release:
1. Configure NPM_TOKEN secret
2. Manually create a test GitHub Release to trigger the first npm publish
3. Verify `npx floatnote` works end-to-end on a clean machine
4. Mark Phase 4 as fully verified

---

_Verified: 2026-01-23T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
