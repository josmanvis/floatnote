# Milestones

## Completed

### v1.0 — Testing, CI/CD, Publishing, and Layers

**Timeline:** 2026-01-15 → 2026-01-23 (8 days)
**Phases:** 5 | **Plans:** 11 | **Quick Tasks:** 7
**Stats:** 93 commits, 137 files, ~44K lines added

**What was delivered:**
1. Integration tests verifying IPC contracts (main ↔ renderer)
2. E2E tests with Playwright verifying core user flows in real Electron
3. GitHub Actions CI/CD (test on push, build + release on tag)
4. npm publishing (`npx floatnote` installs CLI, downloads app from Releases)
5. Layer system (create/rename/delete, visibility, lock, reorder, persistence, undo/redo)
6. Shape drawing with toolbar dropdown
7. Interactive shapes (select, resize, rotate)
8. Docusaurus website for GitHub Pages
9. Menubar icon dark mode support

**Key Decisions:**
- Jest 29 for integration, Playwright+Electron for E2E
- Skip code signing in CI (deferred to v2)
- npm ships only bin/ (~5KB CLI), app from GitHub Releases
- Layer data model at note level with activeLayerId reference
- Cross-layer selection auto-switches active layer

**Archive:** `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`

---
*Last updated: 2026-01-24*
