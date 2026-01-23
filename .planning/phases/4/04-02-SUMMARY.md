---
phase: 04-npm-publishing
plan: 02
subsystem: ci-cd
tags: [github-actions, npm, publishing, workflow]
dependency-graph:
  requires: [04-01]
  provides: [release-workflow, npm-publish-automation]
  affects: [03-electron-build]
tech-stack:
  added: []
  patterns: [github-actions-workflow, npm-publish-on-release]
key-files:
  created: [.github/workflows/release.yml]
  modified: []
decisions:
  - id: trigger-on-published
    choice: "on: release: types: [published]"
    why: "Fires only on published releases (not drafts), covers both manual and automated releases"
  - id: ubuntu-for-publish
    choice: "ubuntu-latest runner"
    why: "bin-only npm package has no native dependencies, no macOS needed"
  - id: phase3-comment
    choice: "YAML comment documenting Phase 3 integration point"
    why: "Phase 3 will add build/release jobs and publish-npm will get needs: [release]"
metrics:
  duration: ~1.5 min
  completed: 2026-01-23
---

# Phase 4 Plan 2: Release Workflow with publish-npm Job Summary

**GitHub Actions workflow that publishes to npm on release events, structured for Phase 3 extension.**

## What Was Done

### Task 1: Create release workflow with publish-npm job
- Created `.github/workflows/` directory (did not exist)
- Created `release.yml` with:
  - Trigger: `on: release: types: [published]`
  - Job `publish-npm` on ubuntu-latest
  - Steps: checkout, setup-node (v20 + registry-url), npm publish
  - Auth: NODE_AUTH_TOKEN from secrets.NPM_TOKEN
  - Phase 3 integration comment above the job

### Task 2: Validate workflow structure and cross-check with package.json
- Verified all YAML indentation is correct (whitespace-sensitive)
- Confirmed no actual `needs:` key exists (only in comment)
- Cross-checked with package.json: `files: ["bin/"]` and `prepublishOnly: "npm test"` already configured by plan 04-01
- Confirmed the workflow will: run tests (prepublishOnly), then publish only bin/ (files field)

## Decisions Made

1. **Trigger: published releases only** -- `types: [published]` ensures drafts don't trigger npm publish, and covers both manual UI releases and releases created by Phase 3's automated workflow.

2. **Ubuntu runner** -- Since floatnote's npm package is bin-only (a CLI shell script), no macOS runner or native compilation is needed for publishing.

3. **Phase 3 comment** -- A YAML comment above publish-npm documents that Phase 3 will add build/release jobs and publish-npm should then get `needs: [release]`.

## Deviations from Plan

None -- plan executed exactly as written.

## Commit Log

| Task | Commit | Message |
|------|--------|---------|
| 1 | beb7307 | feat(04-02): create release workflow with publish-npm job |
| 2 | (validation only, no changes) | -- |

## Next Phase Readiness

- Phase 3 (Electron Build) can now add build and release jobs to `.github/workflows/release.yml`
- When Phase 3 adds a `release` job, update publish-npm to add `needs: [release]`
- NPM_TOKEN secret must be configured in GitHub repo settings before first release
