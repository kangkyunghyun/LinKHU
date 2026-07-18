[한국어](./README.md) | **English**

# <img align="left" src="src/icons/icon48.png"/>LinKHU

Jump to Kyung Hee University's most-used web services with a single click.

🏠 Homepage: https://kangkyunghyun.github.io/LinKHU/

<p>
  <a href="https://github.com/kangkyunghyun/LinKHU/releases/latest"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/kangkyunghyun/LinKHU?style=flat-square&logo=github&label=release"></a>
  <a href="./LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/kangkyunghyun/LinKHU?style=flat-square&logo=github"></a>
  <a href="https://github.com/kangkyunghyun/LinKHU/actions/workflows/validation.yml"><img alt="Validation Status" src="https://img.shields.io/github/actions/workflow/status/kangkyunghyun/LinKHU/validation.yml?branch=main&style=flat-square&logo=githubactions&label=validation"></a>
  <a href="https://chromewebstore.google.com/detail/ihidkmjkpfphgljieecfcikljaopcldp"><img alt="Chrome Web Store Users" src="https://img.shields.io/chrome-web-store/users/ihidkmjkpfphgljieecfcikljaopcldp?style=flat-square&logo=googlechrome&label=chrome%20users"></a>
  <a href="https://chromewebstore.google.com/detail/ihidkmjkpfphgljieecfcikljaopcldp"><img alt="Chrome Web Store Version" src="https://img.shields.io/chrome-web-store/v/ihidkmjkpfphgljieecfcikljaopcldp?style=flat-square&logo=googlechrome&label=chrome%20version"></a>
  <a href="https://chromewebstore.google.com/detail/ihidkmjkpfphgljieecfcikljaopcldp"><img alt="Chrome Web Store Rating" src="https://img.shields.io/chrome-web-store/rating/ihidkmjkpfphgljieecfcikljaopcldp?style=flat-square&logo=googlechrome&label=chrome%20rating"></a>
  <a href="https://addons.mozilla.org/firefox/addon/linkhu"><img alt="Firefox Add-ons Users" src="https://img.shields.io/amo/users/linkhu?style=flat-square&logo=firefoxbrowser&label=firefox%20users"></a>
  <a href="https://addons.mozilla.org/firefox/addon/linkhu"><img alt="Firefox Add-ons Version" src="https://img.shields.io/amo/v/linkhu?style=flat-square&logo=firefoxbrowser&label=firefox%20version"></a>
  <a href="https://addons.mozilla.org/firefox/addon/linkhu"><img alt="Firefox Add-ons Weekly Downloads" src="https://img.shields.io/amo/dw/linkhu?style=flat-square&logo=firefoxbrowser&label=firefox%20downloads"></a>
</p>

[![Chrome Web Store](./docs/assets/store/chrome-web-store.png)](https://chromewebstore.google.com/detail/ihidkmjkpfphgljieecfcikljaopcldp)
[![Naver Whale Store](./docs/assets/store/whalestore-sm.png)](https://store.whale.naver.com/detail/njhgalaophlilmhapklabocladclmhoc)
[![Firefox Add-ons](./docs/assets/store/firefox-sm.png)](https://addons.mozilla.org/firefox/addon/linkhu)

## 🔗 Quick Access to Kyung Hee University Web Services

### 🏫 Supported Services

117 services are supported.

- 23 common services
- 26 colleges
- 68 departments/majors

See the full list in [Supported Services](./docs/supported-services.md).

### 🔎 Popup Search

Search shortcuts by service name, ID, or category from the search bar at the top of the popup.

- Press `/` to jump straight to the search bar.
- Services whose names match come first, and pressing `Enter` opens the top result in the current tab.
- When the search bar is empty, your saved shortcuts from the options page are shown.

### 💬 Feedback

Use the **Feedback** form at the bottom of the popup or the options page to send suggestions directly — no GitHub account required. Leave your email if you would like a reply.

## 👀 Preview

|                                  Main Screen                                  |                                Popup Screen                                |
| :--------------------------------------------------------------------------: | :-----------------------------------------------------------------------: |
|     <img src="docs/assets/screenshots/screenshot.png" alt="Main Screenshot" width="500"/>     | <img src="docs/assets/screenshots/screenshot-popup.png" alt="Popup Screenshot" width="270"/> |
|                                Options Screen                                 |                                                                           |
| <img src="docs/assets/screenshots/screenshot-options.png" alt="Options Screenshot" width="500"/> |                                                                           |

## 🚀 Installation

### Option 1: Chrome Web Store

1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/ihidkmjkpfphgljieecfcikljaopcldp).
2. Click "Add to Chrome".
3. Pin the extension to your browser toolbar for quick access.

### Option 2: Manual Installation

1. `git clone` this repository or download it as a ZIP and extract it.
2. Open `chrome://extensions` in your browser.
3. Enable "Developer mode" in the top-right corner.
4. Click "Load unpacked".
5. Select the `src` folder inside the downloaded directory.
6. Pin the extension to your browser toolbar for quick access.

## ⌨️ Keyboard Shortcuts

Open the LinKHU popup instantly with the default shortcut.

- Windows/Linux: `Ctrl + Shift + L`
- macOS: `Command + Shift + L`

If the default shortcut conflicts with your browser or another extension, reassign it from your browser's extension shortcut settings.

- Chrome: `chrome://extensions/shortcuts`
- Whale: `whale://extensions/shortcuts`
- Firefox: `about:addons` → gear menu → Manage Extension Shortcuts

While the popup is open, press number keys `1–9` to open a shortcut instantly.

## 🛠 Development & Packaging

```bash
npm test
npm run validate:data
npm run generate:landing-data
npm run package
npm run build
```

- `npm test`: tests core popup/options behavior, data validation, and reproducible packaging.
- `npm run validate:data`: validates the site data in `src/data.js`.
- `npm run generate:landing-data`: regenerates the landing page search data and service icons from `src/data.js`.
- `npm run package`: packages `src/` into `dist/linkhu-v{manifest.version}.zip`.
- `npm run build`: runs tests, data/landing sync validation, and packaging in one step.

## 📁 Project Structure

```text
LinKHU/
├── src/                    # Extension source
│   ├── manifest.json       #   Extension manifest (version)
│   ├── data.js             #   Supported service list (single source of truth)
│   ├── shared.js           #   Search/settings utils shared by popup & options
│   ├── popup.{html,js,css}    # Popup UI
│   ├── options.{html,js,css}  # Options page
│   ├── version.js          #   Update check
│   ├── feedback.js         #   Feedback submission
│   ├── images/             #   Service icons by category
│   └── icons/              #   Extension icons
├── docs/                   # GitHub Pages landing + operation docs
│   ├── index.html          #   Landing page
│   ├── landing.{js,css}    #   Landing search/feedback/styles
│   └── assets/             #   Landing data, service icons, screenshots
├── scripts/                # Data validation, packaging, store publishing
├── tests/                  # node --test based tests
├── release-notes/          # Release notes per version
└── .github/workflows/      # Validation, release, store publishing automation
```

## 🚢 Release

In a release-prep PR, bump `version` in `src/manifest.json`, write `release-notes/v{version}.md`, and merge to `main`. Pushing the matching version tag then creates a GitHub Release automatically.

```bash
git switch main
git pull --ff-only
VERSION=$(node -p "require('./src/manifest.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"
```

The release workflow attaches the ZIP packaged by `npm run build` and uses `release-notes/v{version}.md` as the release notes.

Store deployment follows the [Store Release Checklist](./docs/store-release-checklist.md).
Chrome Web Store publishing follows [Chrome Web Store Automation](./docs/chrome-web-store-automation.md).
Firefox Add-ons publishing follows [Firefox Add-ons Automation](./docs/firefox-addons-automation.md).
Whale Store publishing remains manual per [Whale Store Automation Research](./docs/whale-store-automation.md).
Store descriptions are maintained in [Store Listing](./docs/store-listing.md).
The feedback channel setup is documented in the [Feedback Setup Guide](./docs/feedback-setup.md).

## 🐛 Bug Reports & Contributing

Reports and contributions via Issues and Pull Requests are always welcome.

- Bug reports: use the Bug Report template.
- Service requests: fill in the Service Request template with the service name, URL, category, and icon info.
- Feature suggestions: use the Feature Request template with the background and expected behavior.
- Direct PRs: open a related issue first, and include verification results in the PR body.
