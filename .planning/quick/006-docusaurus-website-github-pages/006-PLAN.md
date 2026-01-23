---
phase: quick
plan: 006
type: execute
wave: 1
depends_on: []
files_modified:
  - website/
  - .github/workflows/deploy-docs.yml
autonomous: true

must_haves:
  truths:
    - "Docusaurus site builds successfully with npm run build"
    - "Landing page shows hero with app description and download CTA"
    - "Download page links to latest GitHub Release artifacts (DMG x64/arm64, npm)"
    - "Docs section covers getting started, features, shortcuts, and settings"
    - "FAQ page answers common questions about the app"
    - "Site deploys to GitHub Pages via workflow on push to main"
    - "Dark theme is the default"
  artifacts:
    - path: "website/docusaurus.config.ts"
      provides: "Site configuration with dark theme default"
    - path: "website/src/pages/index.tsx"
      provides: "Landing page with hero and feature highlights"
    - path: "website/src/pages/download.tsx"
      provides: "Download page with release links"
    - path: "website/docs/getting-started.md"
      provides: "Getting started documentation"
    - path: "website/docs/features.md"
      provides: "Features overview"
    - path: "website/docs/shortcuts.md"
      provides: "Keyboard shortcuts reference"
    - path: "website/docs/faq.md"
      provides: "FAQ/Q&A page"
    - path: ".github/workflows/deploy-docs.yml"
      provides: "GitHub Pages deployment workflow"
  key_links:
    - from: "website/src/pages/download.tsx"
      to: "https://github.com/josmanvis/floatnote/releases/latest"
      via: "Direct links to GitHub Release assets"
    - from: ".github/workflows/deploy-docs.yml"
      to: "website/"
      via: "Builds and deploys Docusaurus site"
---

<objective>
Create a Docusaurus 3.x website in `website/` that advertises Floatnote, provides download links, documentation, and FAQ. Deploy to GitHub Pages via GitHub Actions.

Purpose: Give Floatnote a public-facing website for users to discover, download, and learn about the app.
Output: Complete Docusaurus site with landing page, download page, docs, FAQ, and deployment workflow.
</objective>

<context>
- Floatnote: Transparent always-on-top drawing/note-taking overlay for macOS (Electron)
- GitHub repo: https://github.com/josmanvis/floatnote
- Current version: 1.0.7
- Release artifacts: Floatnote-1.0.7-arm64.dmg, Floatnote-1.0.7.dmg (x64), plus .zip variants
- npm package: `floatnote` (CLI installer that downloads from GitHub Releases)
- GitHub Pages URL will be: https://josmanvis.github.io/floatnote/
- Key features: canvas drawing, text overlays, multi-note system, shapes (rectangle, circle, triangle, line, arrow), shape manipulation (select, resize, rotate, move), freeze view, gestures (pinch-to-zoom, pan, rotate), undo/redo, clipboard paste (text + images), file drop, export PNG, settings persistence, global keyboard shortcut toggle (Cmd+Shift+D)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold Docusaurus project with dark theme config</name>
  <files>
    website/package.json
    website/docusaurus.config.ts
    website/tsconfig.json
    website/sidebars.ts
    website/babel.config.js
    website/static/
  </files>
  <action>
    Initialize a Docusaurus 3.x site in the `website/` directory using the classic preset.

    1. Run `npx create-docusaurus@latest website classic --typescript` from the repo root (or manually scaffold if create-docusaurus prompts interactively -- in that case, create the files directly).

    2. Configure `docusaurus.config.ts`:
       - title: "Floatnote"
       - tagline: "A transparent always-on-top drawing and note-taking overlay for macOS"
       - url: "https://josmanvis.github.io"
       - baseUrl: "/floatnote/"
       - organizationName: "josmanvis"
       - projectName: "floatnote"
       - trailingSlash: false
       - themeConfig.colorMode: defaultMode "dark", disableSwitch false, respectPrefersColorScheme true
       - navbar: title "Floatnote", links to Docs, Download, FAQ, GitHub repo
       - footer: links section with Docs, Community (GitHub), More (Download)
       - Remove any default blog section (blog: false in presets)

    3. Configure `sidebars.ts` with a single "docs" sidebar:
       - Getting Started
       - Features
       - Keyboard Shortcuts
       - Settings

    4. Clean out default/template content (remove default docs, blog, src/pages/index.tsx placeholder content).

    5. Verify: `cd website && npm install && npm run build` completes without errors.
  </action>
  <verify>cd website && npm run build succeeds with no errors</verify>
  <done>Docusaurus project exists in website/ with dark theme default, correct baseUrl for GitHub Pages, clean config with no blog, and builds successfully.</done>
</task>

<task type="auto">
  <name>Task 2: Create landing page and download page</name>
  <files>
    website/src/pages/index.tsx
    website/src/pages/download.tsx
    website/src/css/custom.css
    website/src/pages/index.module.css
    website/src/pages/download.module.css
  </files>
  <action>
    Create the landing page (`src/pages/index.tsx`):

    1. Hero section:
       - Large title: "Floatnote"
       - Subtitle: "A transparent always-on-top drawing and note-taking overlay for macOS"
       - Description paragraph: "Draw, annotate, and take notes on a floating canvas that stays above all your windows. Always one keyboard shortcut away."
       - Two CTA buttons: "Download" (links to /floatnote/download) and "Documentation" (links to /floatnote/docs/getting-started)
       - Use a dark gradient background (e.g., from #1a1a2e to #16213e)

    2. Features section (grid of 3 columns on desktop, 1 on mobile):
       - "Always On Top" - Stays above all windows, toggle with Cmd+Shift+D
       - "Drawing Tools" - Freehand drawing, shapes (rectangle, circle, triangle, line, arrow), colors, pen sizes
       - "Text & Notes" - Multi-note system with text overlays, clipboard paste support
       - "Gestures" - Pinch-to-zoom, pan, and rotate on trackpad
       - "Shape Manipulation" - Select, resize, rotate, and move shapes interactively
       - "Export & Share" - Export to PNG, file drop support, persistent storage

    3. Each feature card: icon (use simple SVG or emoji), title, short description. Cards should have a subtle dark card background (#1e1e2e or similar) with rounded corners.

    Create the download page (`src/pages/download.tsx`):

    1. Title: "Download Floatnote"
    2. macOS section with two download options:
       - Apple Silicon (arm64): link to `https://github.com/josmanvis/floatnote/releases/latest/download/Floatnote-1.0.7-arm64.dmg`
       - Intel (x64): link to `https://github.com/josmanvis/floatnote/releases/latest/download/Floatnote-1.0.7.dmg`
       - Note: "Or download the latest from [GitHub Releases](https://github.com/josmanvis/floatnote/releases/latest)"
    3. npm section:
       - Code block: `npm install -g floatnote && floatnote`
       - Explain: "The npm package provides a CLI that downloads and installs the latest release automatically."
    4. System requirements: macOS 10.15+, Node.js 16+ (for npm install only)

    Style both pages in `custom.css`:
    - Dark theme variables: --ifm-color-primary: #6c63ff (purple accent)
    - Hero gradient background
    - Feature cards with hover effect (subtle lift/glow)
    - Download buttons styled as large CTAs with platform icons
    - Responsive layout (mobile-first)
  </action>
  <verify>cd website && npm run build succeeds; open build/index.html shows landing page with hero and features; build/download/index.html shows download links</verify>
  <done>Landing page displays hero section with CTAs and 6 feature cards. Download page shows DMG links for both architectures plus npm instructions. Both pages use dark theme styling with purple accent color.</done>
</task>

<task type="auto">
  <name>Task 3: Create documentation pages</name>
  <files>
    website/docs/getting-started.md
    website/docs/features.md
    website/docs/shortcuts.md
    website/docs/settings.md
  </files>
  <action>
    Create documentation markdown files in `website/docs/`:

    1. `getting-started.md` (sidebar_position: 1):
       - Title: "Getting Started"
       - Installation section: DMG download (link to releases), npm install method
       - First launch: explains the transparent overlay appears, toggle with Cmd+Shift+D
       - Basic usage: draw with mouse/trackpad, add text with T key or double-click, switch notes

    2. `features.md` (sidebar_position: 2):
       - Title: "Features"
       - Drawing: freehand with configurable color/size, eraser mode
       - Shapes: rectangle, circle, triangle, line, arrow (from shape dropdown)
       - Shape manipulation: select mode to click shapes, resize via handles, rotate, move by dragging
       - Text overlays: double-click or T key to add, editable, movable
       - Multi-note system: create/switch/delete notes, each with own canvas
       - Gestures: pinch-to-zoom, two-finger pan, rotate gesture
       - Clipboard: paste text and images from clipboard
       - File drop: drag files onto the canvas
       - Freeze view: lock canvas position
       - Export: save as PNG

    3. `shortcuts.md` (sidebar_position: 3):
       - Title: "Keyboard Shortcuts"
       - Table format with Key and Action columns:
         - Cmd+Shift+D: Toggle Floatnote visibility
         - Cmd+Z: Undo
         - Cmd+Shift+Z: Redo
         - Cmd+N: New note
         - Cmd+W: Delete current note
         - Cmd+] / Cmd+[: Next/previous note
         - Cmd+E: Export as PNG
         - Cmd+Shift+C: Clear canvas
         - T: Add text
         - Escape: Deselect / exit mode
         - Delete/Backspace: Delete selected shape

    4. `settings.md` (sidebar_position: 4):
       - Title: "Settings"
       - Pen settings: color picker, size slider
       - Window sizes: SM (33%x50%), MD (33%x100%), LG (50%x100%)
       - Background modes: transparent, semi-transparent, opaque
       - Pin mode: keep window on top even when unfocused
       - Data storage: ~/.config/floatnote/floatnote-data.json
       - Export location: ~/Desktop (PNG export)
  </action>
  <verify>cd website && npm run build succeeds; docs appear in build/docs/ directory with proper sidebar navigation</verify>
  <done>Four documentation pages exist with comprehensive content covering installation, features, keyboard shortcuts, and settings. Sidebar navigation works correctly.</done>
</task>

<task type="auto">
  <name>Task 4: Create FAQ page</name>
  <files>
    website/docs/faq.md
  </files>
  <action>
    Create `website/docs/faq.md` (sidebar_position: 5):

    Title: "FAQ"

    Questions and answers:

    Q: "Is Floatnote free?"
    A: "Yes, Floatnote is completely free and open source under the MIT license."

    Q: "Does it work on Windows or Linux?"
    A: "Currently Floatnote is macOS only. It uses macOS-specific APIs for the transparent overlay functionality."

    Q: "Where is my data stored?"
    A: "Notes are stored in ~/.config/floatnote/floatnote-data.json. Your data stays local and is never sent anywhere."

    Q: "How do I update Floatnote?"
    A: "Download the latest DMG from the GitHub Releases page, or if installed via npm, run npm update -g floatnote."

    Q: "The app is not showing up when I press Cmd+Shift+D"
    A: "Make sure Floatnote is running (check the menu bar tray icon). You may need to grant accessibility permissions in System Preferences > Privacy & Security > Accessibility."

    Q: "Can I change the keyboard shortcut?"
    A: "The global shortcut (Cmd+Shift+D) is currently not configurable, but you can request this feature on GitHub Issues."

    Q: "How do I draw shapes?"
    A: "Click the shape dropdown in the toolbar (rectangle icon) and select your shape type. Then click and drag on the canvas to draw."

    Q: "How do I select and move shapes?"
    A: "Click the pointer/select tool in the toolbar, then click on a shape to select it. Drag to move, use handles to resize, or use the rotation handle to rotate."

    Q: "Can I use Floatnote for presentations?"
    A: "Yes! Floatnote's transparent overlay makes it perfect for annotating slides or any screen content during presentations."

    Q: "How do I export my drawings?"
    A: "Press Cmd+E or use the export button in the toolbar to save the current canvas as a PNG file to your Desktop."

    Format each Q&A using markdown with bold questions and paragraph answers, or use Docusaurus admonitions/details for collapsible FAQ items.
  </action>
  <verify>cd website && npm run build succeeds; FAQ page appears in docs sidebar and contains all Q&A pairs</verify>
  <done>FAQ page exists with 10 relevant questions and answers covering licensing, platform support, data storage, updates, troubleshooting, and feature usage.</done>
</task>

<task type="auto">
  <name>Task 5: Create GitHub Pages deployment workflow</name>
  <files>
    .github/workflows/deploy-docs.yml
  </files>
  <action>
    Create `.github/workflows/deploy-docs.yml`:

    ```yaml
    name: Deploy Docs to GitHub Pages

    on:
      push:
        branches: [main]
        paths:
          - 'website/**'
          - '.github/workflows/deploy-docs.yml'
      workflow_dispatch:

    permissions:
      contents: read
      pages: write
      id-token: write

    concurrency:
      group: "pages"
      cancel-in-progress: true

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: npm
              cache-dependency-path: website/package-lock.json
          - name: Install dependencies
            working-directory: website
            run: npm ci
          - name: Build website
            working-directory: website
            run: npm run build
          - name: Upload artifact
            uses: actions/upload-pages-artifact@v3
            with:
              path: website/build

      deploy:
        environment:
          name: github-pages
          url: ${{ steps.deployment.outputs.page_url }}
        runs-on: ubuntu-latest
        needs: build
        steps:
          - name: Deploy to GitHub Pages
            id: deployment
            uses: actions/deploy-pages@v4
    ```

    This workflow:
    - Triggers on push to main when website/ files change, or manual dispatch
    - Uses the official GitHub Pages actions (upload-pages-artifact + deploy-pages)
    - Builds Docusaurus in the website/ directory
    - Deploys the build output to GitHub Pages
    - Uses concurrency to cancel in-progress deployments

    NOTE: The user will need to enable GitHub Pages in the repo settings:
    Settings > Pages > Source: "GitHub Actions"
  </action>
  <verify>The workflow YAML is valid (no syntax errors). The workflow references correct paths (website/) and uses current action versions (v4/v3).</verify>
  <done>GitHub Actions workflow exists that builds the Docusaurus site and deploys to GitHub Pages on push to main. Triggers only on website/ changes. Uses official GitHub Pages deployment actions.</done>
</task>

</tasks>

<verification>
1. `cd website && npm run build` completes without errors
2. Built site has: index.html (landing), download/index.html, docs/ pages, docs/faq
3. Dark theme is default in docusaurus.config.ts
4. baseUrl is set to "/floatnote/" for GitHub Pages project site
5. deploy-docs.yml workflow is syntactically valid
6. No blog section in the built site
7. Sidebar shows: Getting Started, Features, Keyboard Shortcuts, Settings, FAQ
</verification>

<success_criteria>
- Docusaurus 3.x site builds cleanly in website/ directory
- Landing page has hero + 6 feature cards + download CTA
- Download page has DMG links (arm64 + x64) + npm instructions
- 4 docs pages with comprehensive content
- FAQ with 10 Q&A pairs
- GitHub Actions workflow deploys to GitHub Pages on main push
- Dark theme is default with purple accent (#6c63ff)
- Site correctly configured for /floatnote/ base path
</success_criteria>

<output>
After completion, verify site builds and commit all changes.
</output>
