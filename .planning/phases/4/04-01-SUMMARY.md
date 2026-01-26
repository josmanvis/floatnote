# Phase 4 Plan 1: npm Publishing Configuration Summary

**One-liner:** Bin-only npm tarball (4KB) with files whitelist and prepublishOnly test gate

## Outcome

All success criteria met. The package.json is configured so `npm pack` produces a 4KB tarball containing only the CLI launcher script (`bin/floatnote.js`), `package.json`, and `README.md`. The `prepublishOnly` hook ensures tests must pass before any publish attempt. The CLI script works correctly in isolation: `--version` prints the package version and `--help` prints usage information.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Configure package.json for bin-only publishing | d4ccf19 | Remove main field, add files whitelist, add prepublishOnly hook, update start/dev scripts |
| 2 | Verify tests pass and CLI script works end-to-end | (verification only) | 181 tests pass, tarball verified, CLI --version and --help work |

## Changes Made

### package.json
- Removed `"main": "src/main.js"` field (prevents src/ from leaking into tarball)
- Added `"files": ["bin/"]` (restricts npm tarball to bin/ directory only)
- Added `"prepublishOnly": "npm test"` (gates publishing on 181 tests passing)
- Changed `"start"` from `"electron ."` to `"electron src/main.js"` (explicit entry point)
- Changed `"dev"` from `"electron . --enable-logging"` to `"electron src/main.js --enable-logging"`

## Verification Results

| Check | Result |
|-------|--------|
| npm pack --dry-run files | bin/floatnote.js, package.json, README.md (3 files only) |
| Package size | 4.0 KB compressed (10.8 KB unpacked) |
| npm test exit code | 0 (181 tests pass) |
| node bin/floatnote.js --version | "floatnote v1.0.2" |
| node bin/floatnote.js --help | Full usage output with options and shortcuts |
| No src/ leak | Confirmed -- no src/, tests/, or node_modules/ in tarball |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Explicit electron entry path over main field | Removing main prevents npm including src/main.js; passing path directly to electron is equivalent |
| 4KB package size achieved | Well under the 10KB target; only CLI script + metadata |

## Duration

~1 minute

## Next Steps

- Phase 4, Plan 2: Publish to npm registry (requires npm authentication)
