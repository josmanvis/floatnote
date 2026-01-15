# floatnote-2: Test CLI entry point (bin/floatnote.js)

**Status:** open
**Priority:** high
**Labels:** testing, cli
**Depends:** floatnote-1

## Description
100% test coverage for the CLI entry point that downloads and launches the app.

## Functions to Test
- `getLatestRelease()` - GitHub API call
- `downloadFile()` - File download with redirects
- `formatBytes()` - Byte formatting utility
- `main()` - CLI argument handling

## Test Cases
- [ ] --version flag shows version
- [ ] --help flag shows help text
- [ ] --uninstall removes app directory
- [ ] --update forces download
- [ ] Handles missing releases gracefully
- [ ] Handles download failures
- [ ] Handles redirect responses (301, 302)
- [ ] Creates app directory if missing
- [ ] Launches app after download
- [ ] Skips download if version matches

## Mocks Required
- https module (GitHub API, downloads)
- fs module (file operations)
- child_process (spawn for app launch)
