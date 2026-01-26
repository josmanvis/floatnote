<div align="center">

<!-- Social Preview: .github/social-preview.png -->

```
   _____ _             _   _   _       _       
  |  ___| | ___   __ _| |_| \ | | ___ | |_ ___ 
  | |_  | |/ _ \ / _` | __|  \| |/ _ \| __/ _ \
  |  _| | | (_) | (_| | |_| |\  | (_) | ||  __/
  |_|   |_|\___/ \__,_|\__|_| \_|\___/ \__\___|
```

# 🎨 **Draw on everything. Hide from nothing.**

### *The screen annotation tool for people who are tired of screenshot → markup → save → share → repeat*

[![npm version](https://img.shields.io/npm/v/floatnote?style=for-the-badge&color=ff6b6b&logo=npm)](https://www.npmjs.com/package/floatnote)
[![npm downloads](https://img.shields.io/npm/dm/floatnote?style=for-the-badge&color=4ecdc4&logo=npm)](https://www.npmjs.com/package/floatnote)
[![GitHub stars](https://img.shields.io/github/stars/josmanvis/floatnote?style=for-the-badge&color=ffd93d&logo=github)](https://github.com/josmanvis/floatnote)
[![License](https://img.shields.io/npm/l/floatnote?style=for-the-badge&color=6c5ce7)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-10.13+-000000?style=for-the-badge&logo=apple)](https://www.apple.com/macos/)

<br />

**[📖 Docs](https://josmanvis.github.io/floatnote/)** • **[⬇️ Download](https://josmanvis.github.io/floatnote/download/)** • **[🌐 Website](https://floatnote.crativo.xyz/)** • **[❓ FAQ](https://josmanvis.github.io/floatnote/docs/faq/)**

<br />

</div>

---

<div align="center">

## 💀 Annotation tools are broken.

| The Old Way 👎 | The Floatnote Way 👍 |
|:-------------:|:-------------------:|
| Screenshot → Open Preview → Markup → Save → Share | Just... draw on it. Live. |
| Install 200MB bloatware | `npx floatnote` |
| "Can everyone see my cursor?" | ***GIANT NEON CIRCLE*** |
| Pause presentation → annotate → unpause | Keep presenting while you draw |

</div>

---

## ⚡ One command. Zero friction.

```bash
npx floatnote
```

That's it. You're drawing on your screen in 3 seconds. 

- ❌ No install wizard  
- ❌ No account signup  
- ❌ No 47-step onboarding  
- ✅ Just works™

---

## 🎬 Use Cases (a.k.a. "times you wish you had this")

| Scenario | Without Floatnote | With Floatnote |
|----------|------------------|----------------|
| **Zoom call** | "Move your mouse to the— no, the OTHER button" | 🔴 *circles it aggressively* |
| **Code review** | "On line 47, the thing next to the... you know" | ✏️ *draws arrow, writes "THIS"* |
| **Teaching** | Shares screen, alt-tabs to markup tool, loses place | 🎯 *draws directly on live content* |
| **Design feedback** | Screenshots > Figma > comments > screenshots > repeat | 💬 *scribbles "make it pop" directly on screen* |
| **Bug reports** | "It's broken" | 📸 *annotated screenshot in 2 seconds* |

---

## ✨ Features That Actually Matter

<table>
<tr>
<td width="50%">

### 🪟 True Transparency
Draw on top of ANY app without blocking interaction. Click through your annotations to the apps below.

### 📌 Always On Top  
Your notes never get buried under 47 Chrome tabs.

### 🎨 Pro Drawing Tools
Pens, highlighters, shapes, arrows, text. Multiple colors and stroke widths.

### 🗂 Multi-Note Support
Flip between different canvases. Organize your chaos.

</td>
<td width="50%">

### 🤏 Gesture Support
Pinch to zoom. Pan to navigate. Two-finger rotate. It's 2026.

### 📋 Smart Paste
`⌘V` an image from clipboard → it's on your canvas.

### 💾 Auto-Save
Close the app. Open it tomorrow. Everything's still there.

### ⚡ Blazingly Fast
Because we didn't write it in Electron— wait, we did. It's still fast though.

</td>
</tr>
</table>

---

## ⌨️ Keyboard Shortcuts

*Memorize these. Your productivity will thank you.*

| Action | Shortcut | Notes |
|--------|----------|-------|
| **Toggle Floatnote** | `⌘⇧G` | Global hotkey (works from anywhere) |
| **Quick Toggle** | `⌥Space` or `` ^` `` | Alternative toggles |
| **Settings** | `⌘,` | Customize everything |
| **Previous/Next Note** | `[` / `]` | Navigate your notes |
| **Undo/Redo** | `⌘Z` / `⌘⇧Z` | Unlimited history |
| **Select Mode** | `V` | Move/resize elements |
| **Draw Mode** | `B` | Freehand drawing |
| **Text Mode** | `T` | Add text annotations |
| **Delete** | `D` | Nuke selected elements |
| **Zoom** | `⌘+` / `⌘-` / `⌘0` | Zoom in/out/reset |

---

## 📦 Installation

### 💨 The Fast Way (Recommended)

```bash
npx floatnote
```

Downloads, installs, and launches. Done.

### 🍺 Homebrew Gang

```bash
brew tap josmanvis/floatnote
brew install --cask floatnote
```

### 📥 Download Binary

Grab the `.dmg` from [Releases](https://github.com/josmanvis/floatnote/releases) if you're allergic to terminals.

---

## 🛠 CLI Options

```bash
floatnote [options]

Options:
  -v, --version    Print version and exit
  -h, --help       Print this help message
  --update         Force update to latest version
  --uninstall      Remove Floatnote from your system
```

---

## 🔧 For Developers

```bash
# Clone the repo
git clone https://github.com/josmanvis/floatnote.git
cd floatnote

# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

---

## 📋 Requirements

| Requirement | Version |
|-------------|---------|
| **macOS** | 10.13+ (High Sierra or later) |
| **Node.js** | 16+ (for `npx` method only) |

---

## 🤔 FAQ

<details>
<summary><b>Q: Why macOS only?</b></summary>

Because I use a Mac. PRs for Windows/Linux welcome!
</details>

<details>
<summary><b>Q: Is this free?</b></summary>

Yes. Forever. MIT licensed.
</details>

<details>
<summary><b>Q: Does it phone home?</b></summary>

No analytics. No telemetry. No tracking. Your annotations stay on your machine.
</details>

<details>
<summary><b>Q: Why "Floatnote"?</b></summary>

It floats. You take notes. Naming things is hard.
</details>

---

<div align="center">

## 🤝 Contributing

Found a bug? Want a feature? PRs are wide open.

Check the [issues](https://github.com/josmanvis/floatnote/issues) or just start hacking.

---

## ⭐ Star History

*If Floatnote saved your screen share, drop a star.*

[![Star History Chart](https://api.star-history.com/svg?repos=josmanvis/floatnote&type=Date)](https://star-history.com/#josmanvis/floatnote&Date)

---

### Made with ☕ and questionable life choices

**[⭐ Star this repo](https://github.com/josmanvis/floatnote)** — it makes my day

---

MIT License © [Jose Viscasillas](https://crativo.xyz)

</div>
