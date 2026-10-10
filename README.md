# ArtCraft Local WebAssembly Suite

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

A standalone, zero-configuration local server and unified dashboard for the **ArtCraft** creative application suite.

This utility automates checking, downloading, unpacking, and serving the latest official WebAssembly (`.wasm`) builds of Storytold's creative tools on your local machine—accessible directly through any modern web browser.

---

## Supported Applications

The launcher monitors and manages the following creative tools:

| # | Application | Category | Upstream Repository |
|---|---|---|---|
| **01** | **PhotoCraft** | Image Editor | [storytold/photocraft](https://github.com/storytold/photocraft) |
| **02** | **VectorCraft** | Vector Illustration | [storytold/vectorcraft](https://github.com/storytold/vectorcraft) |
| **03** | **FilmCraft** | Video Editor | [storytold/filmcraft](https://github.com/storytold/filmcraft) |
| **04** | **LightCraft** | Photo Library & RAW Developer | [storytold/lightcraft](https://github.com/storytold/lightcraft) |
| **05** | **PdfCraft** | PDF Workbench | [storytold/pdfcraft](https://github.com/storytold/pdfcraft) |
| **06** | **EffectCraft** | Motion Graphics & VFX | [storytold/effectcraft](https://github.com/storytold/effectcraft) |
| **07** | **DesignCraft** | Page Layout & Publishing | [storytold/designcraft](https://github.com/storytold/designcraft) |

---

## Key Highlights

- **Automated Lifecycle Management**: Checks GitHub REST APIs on startup. If a newer release exists, it downloads, extracts, and organizes the web package automatically.
- **Smart Local Caching**: Retains existing builds and skips redundant downloads when up to date. Works fully offline once assets are cached.
- **WASM & Threading Compliance**: Injects required response headers (`application/wasm`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Embedder-Policy: require-corp`) required by Rust-based WebAssembly runtimes utilizing `SharedArrayBuffer` and Web Workers.
- **Security Hardened**: Built-in path traversal safeguards (`path.resolve` containment checks) to prevent arbitrary file read vulnerabilities.
- **Clean Interface**: A dark-mode portal styled directly after the official [getartcraft.com/apps](https://getartcraft.com/apps) lineup with official brand icons.
- **Cross-Platform**: Runs natively on **Windows**, **macOS**, and **Linux** without containerization or virtualization overhead.

---

## Prerequisites

- [Node.js](https://nodejs.org/) **18.0.0** or later.
- A modern WebAssembly-compliant browser (Chrome, Firefox, Edge, Safari, Brave, or Zen).

---

## Installation & Usage

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/artcraft-local-suite.git
cd artcraft-local-suite
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch the Server
```bash
npm start
```

### 4. Access the Dashboard
Open your browser and navigate to:
```
http://localhost:3000
```
Click **Launch WebApp** on any application card to open and execute the program locally in your browser.

---

## Configuration

You can customize runtime behavior using environment variables:

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Number | `3000` | Port for the local HTTP server. |
| `HOST` | String | `0.0.0.0` | Interface to bind to (`0.0.0.0` or `127.0.0.1`). |
| `GITHUB_TOKEN` | String | *None* | Optional GitHub Personal Access Token to prevent API rate limits (recommended if restarting frequently). |

### Customizing Ports

**On Windows (PowerShell):**
```powershell
$env:PORT="8080"; npm start
```

**On Windows (CMD):**
```cmd
set PORT=8080 && npm start
```

**On macOS / Linux:**
```bash
PORT=8080 npm start
```

---

## Project Structure

```text
artcraft-local-suite/
├── apps/                 # Extracted application assets (managed automatically, git-ignored)
├── icons/                # Local cache of high-resolution brand icons (git-ignored)
├── package.json          # Package manifest and dependencies
├── server.js             # Core server, update manager, security layer & dashboard
├── .gitignore            # Git exclusion rules
└── README.md             # Project documentation
```

---

## Troubleshooting

### GitHub API Rate Limits
Unauthenticated requests to the GitHub API are limited to 60 requests per hour per IP. If you encounter rate limit warnings during initial synchronization, generate a free [GitHub Personal Access Token](https://github.com/settings/tokens) (no special scopes needed) and supply it:

```bash
GITHUB_TOKEN=your_token_here npm start
```

### Browser Multi-threading Issues
WebAssembly multi-threading requires cross-origin isolation. This server automatically injects COOP/COEP headers. Ensure you access apps via `http://localhost:<port>` or `http://127.0.0.1:<port>` rather than direct file system links (`file://`).

---

## Disclaimer

This is an independent open-source utility designed to run WebAssembly distributions locally. All product names, logos, and brands are property of their respective owners. Visit [getartcraft.com](https://getartcraft.com) for official project information and source repositories.

---

## License

This project is licensed under the [MIT License](LICENSE).