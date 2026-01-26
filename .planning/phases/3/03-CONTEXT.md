# Phase 3: CI/CD Pipeline - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated testing on push/PR and automated building + releasing on version tags. Every push runs tests, version tags produce macOS artifacts (x64 + arm64, DMG + ZIP), and GitHub Releases are created with auto-generated notes. No code signing (deferred to v2).

Phase 4 already created `.github/workflows/release.yml` with the `publish-npm` job triggered by `release: types: [published]`. Phase 3 adds test and build/release jobs to integrate with this existing workflow.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation decisions are at Claude's discretion, guided by the success criteria:

1. **Test CI scope** — Which tests to run (Jest, Playwright E2E, or both), what runner OS to use, how to handle display requirements for E2E
2. **Workflow structure** — Whether to use one workflow file or multiple, how to integrate with the existing release.yml from Phase 4
3. **Release artifact details** — Artifact naming, whether to build separate arch binaries or universal, DMG and/or ZIP packaging
4. **Release notes format** — GitHub's auto-generated notes or custom template
5. **Tag pattern** — What version tag pattern triggers the release build
6. **Runner selection** — Ubuntu for tests vs macOS for builds, cost/speed tradeoffs

Use standard GitHub Actions patterns and the project's existing electron-builder configuration.

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. Follow GitHub Actions best practices and electron-builder conventions.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 03-cicd-pipeline*
*Context gathered: 2026-01-23*
