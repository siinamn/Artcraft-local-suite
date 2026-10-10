/**
 * ArtCraft Local WebAssembly Launcher & Server
 * Automatically fetches the latest WASM releases from GitHub and serves
 * them on a unified local portal with essential WASM/COOP/COEP headers.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

// --- Paths & Environment Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const APPS_DIR = path.join(__dirname, 'apps');
const ICONS_DIR = path.join(__dirname, 'icons');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

/**
 * Metadata definition for ArtCraft application suite
 */
const APPS = [
  {
    id: '01',
    name: 'photocraft',
    title: 'PhotoCraft',
    category: 'Image editor',
    desc: 'The open-source image editor you already know how to use. Layers, masks, and real PSD workflows.',
    repo: 'storytold/photocraft',
  },
  {
    id: '02',
    name: 'vectorcraft',
    title: 'VectorCraft',
    category: 'Vector illustration',
    desc: 'Fast, open-source vector illustration and pen-tool design, reimagined in pure Rust.',
    repo: 'storytold/vectorcraft',
  },
  {
    id: '03',
    name: 'filmcraft',
    title: 'FilmCraft',
    category: 'Video editor',
    desc: 'Professional, timeline-based open-source video editing, rebuilt from scratch.',
    repo: 'storytold/filmcraft',
  },
  {
    id: '04',
    name: 'lightcraft',
    title: 'LightCraft',
    category: 'Photo library & raw developer',
    desc: 'An open-source photo catalog and raw developer that runs entirely on your local machine.',
    repo: 'storytold/lightcraft',
  },
  {
    id: '05',
    name: 'pdfcraft',
    title: 'PdfCraft',
    category: 'PDF workbench',
    desc: 'The open-source PDF workbench: read, organize, annotate, split and secure.',
    repo: 'storytold/pdfcraft',
  },
  {
    id: '06',
    name: 'effectcraft',
    title: 'EffectCraft',
    category: 'Motion graphics & VFX',
    desc: 'Open-source motion graphics, composition timeline and visual effects built in pure Rust.',
    repo: 'storytold/effectcraft',
  },
  {
    id: '07',
    name: 'designcraft',
    title: 'DesignCraft',
    category: 'Page layout & publishing',
    desc: 'Open-source page layout, multi-column publishing and typographical control.',
    repo: 'storytold/designcraft',
  },
];

/**
 * Supported MIME types with strict WebAssembly headers
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.data': 'application/octet-stream',
};

// --- Network & File Utility Functions ---

/**
 * Fetch JSON payload from GitHub REST API
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchJson(url) {
  const headers = {
    'User-Agent': 'ArtCraft-Web-Launcher',
    'Accept': 'application/vnd.github.v3+json',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Download remote binary asset to filesystem
 * @param {string} url
 * @param {string} destPath
 */
async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

/**
 * Cache brand icons locally for offline capability
 */
async function syncIcons() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  for (const app of APPS) {
    const iconPath = path.join(ICONS_DIR, `${app.name}.webp`);
    if (!fs.existsSync(iconPath)) {
      const iconUrl = `https://getartcraft.com/images/apps/${app.name}/icon.webp`;
      try {
        await downloadFile(iconUrl, iconPath);
        console.log(`[Icon] Cached official icon for ${app.title}.`);
      } catch (err) {
        console.warn(`[Icon] Could not fetch remote icon for ${app.name}: ${err.message}`);
      }
    }
  }
}

/**
 * Check releases and synchronize app bundle
 * @param {typeof APPS[0]} app
 */
async function syncApp(app) {
  const appFolder = path.join(APPS_DIR, app.name);
  const versionFile = path.join(appFolder, '.version');

  if (!fs.existsSync(appFolder)) {
    fs.mkdirSync(appFolder, { recursive: true });
  }

  const localVersion = fs.existsSync(versionFile)
    ? fs.readFileSync(versionFile, 'utf8').trim()
    : null;

  console.log(`[${app.name}] Checking for updates...`);

  let release;
  try {
    release = await fetchJson(`https://api.github.com/repos/${app.repo}/releases/latest`);
  } catch (err) {
    console.warn(`[${app.name}] Release check skipped (${err.message}). Using local cache.`);
    return;
  }

  const latestTag = release.tag_name;

  if (localVersion === latestTag && fs.existsSync(path.join(appFolder, 'index.html'))) {
    console.log(`[${app.name}] Up to date (${latestTag}).`);
    return;
  }

  // Find web assembly zip distribution
  const asset = release.assets?.find(a =>
    a.name.toLowerCase().includes('web') && a.name.toLowerCase().endsWith('.zip')
  ) || release.assets?.find(a => a.name.toLowerCase().endsWith('.zip'));

  if (!asset) {
    console.warn(`[${app.name}] No web archive found for release ${latestTag}.`);
    return;
  }

  console.log(`[${app.name}] Downloading ${latestTag} (${asset.name})...`);
  const tempZipPath = path.join(appFolder, 'temp_archive.zip');
  await downloadFile(asset.browser_download_url, tempZipPath);

  console.log(`[${app.name}] Unpacking assets...`);
  try {
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(appFolder, true);
    flattenFolderIfNeeded(appFolder);
    fs.writeFileSync(versionFile, latestTag, 'utf8');
    console.log(`[${app.name}] Successfully updated to ${latestTag}`);
  } catch (err) {
    console.error(`[${app.name}] Extraction failed:`, err);
  } finally {
    if (fs.existsSync(tempZipPath)) {
      try {
        fs.unlinkSync(tempZipPath);
      } catch {
        // Ignore temporary file cleanup errors
      }
    }
  }
}

/**
 * Handle archives containing an extra root folder
 * @param {string} appFolder
 */
function flattenFolderIfNeeded(appFolder) {
  if (fs.existsSync(path.join(appFolder, 'index.html'))) return;

  const entries = fs.readdirSync(appFolder).filter(f => f !== '.version' && f !== 'temp_archive.zip');
  if (entries.length === 1) {
    const subPath = path.join(appFolder, entries[0]);
    if (fs.statSync(subPath).isDirectory() && fs.existsSync(path.join(subPath, 'index.html'))) {
      const subEntries = fs.readdirSync(subPath);
      for (const item of subEntries) {
        fs.renameSync(path.join(subPath, item), path.join(appFolder, item));
      }
      fs.rmdirSync(subPath);
    }
  }
}

// --- Dashboard Renderer ---

/**
 * Generate portal HTML interface
 * @returns {string}
 */
function renderDashboard() {
  const cardsHtml = APPS.map(app => {
    const appFolder = path.join(APPS_DIR, app.name);
    const versionFile = path.join(appFolder, '.version');
    const isReady = fs.existsSync(path.join(appFolder, 'index.html'));
    const version = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : 'Local';

    return `
      <article class="card">
        <div class="card-header">
          <div class="card-index">${app.id}</div>
          <span class="card-category">${app.category}</span>
        </div>

        <div class="app-identity">
          <img 
            alt="${app.title} Icon" 
            width="56" 
            height="56" 
            loading="eager" 
            decoding="async" 
            class="app-icon-img" 
            src="/icons/${app.name}.webp"
            onerror="this.src='https://getartcraft.com/images/apps/${app.name}/icon.webp'"
          />
          <div>
            <h2 class="app-title">${app.title}</h2>
            <div class="status-wrap">
              <span class="status-pill ${isReady ? 'online' : 'offline'}">
                <span class="dot"></span>
                ${isReady ? version : 'Offline'}
              </span>
              <span class="wasm-pill">WebAssembly</span>
            </div>
          </div>
        </div>

        <p class="app-desc">${app.desc}</p>

        <div class="card-actions">
          <a class="btn-launch ${isReady ? '' : 'disabled'}" href="${isReady ? `/apps/${app.name}/` : '#'}" target="_blank" rel="noopener">
            <span>Launch WebApp</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
          </a>
          <a class="btn-github" href="https://github.com/${app.repo}" target="_blank" rel="noopener" title="GitHub Repository">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
        </div>
      </article>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ArtCraft Local Suite</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090a0d;
      --card-bg: #111318;
      --card-border: #1d212b;
      --text-main: #f0f3f6;
      --text-muted: #848b98;
      --font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(ellipse 80% 40% at 50% -10%, rgba(120, 119, 198, 0.12), transparent),
        radial-gradient(circle at 10% 20%, rgba(0, 168, 255, 0.04), transparent 40%);
      color: var(--text-main);
      font-family: var(--font);
      min-height: 100vh;
      padding: 50px 30px;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 55px;
    }

    .tagline {
      font-family: var(--mono);
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9999ff;
      margin-bottom: 12px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .tagline::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #9999ff;
    }

    h1 {
      font-size: 2.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin-bottom: 16px;
      background: linear-gradient(180deg, #ffffff 30%, #a4adb9 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .lead {
      color: var(--text-muted);
      font-size: 1.05rem;
      max-width: 660px;
      line-height: 1.6;
    }

    .section-title-wrap {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 14px;
      margin-bottom: 30px;
    }

    .section-index {
      font-family: var(--mono);
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 22px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .card-index {
      font-family: var(--mono);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .card-category {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .app-identity {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .app-icon-img {
      width: 56px;
      height: 56px;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.28));
    }

    .app-title {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }

    .status-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-family: var(--mono);
      padding: 2px 8px;
      border-radius: 20px;
      background: #181d26;
      color: #9aa2b1;
      border: 1px solid #252c38;
    }

    .status-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-pill.online .dot {
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .status-pill.offline .dot {
      background: #ef4444;
    }

    .wasm-pill {
      font-size: 0.68rem;
      font-family: var(--mono);
      background: rgba(255, 255, 255, 0.05);
      color: #798394;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .app-desc {
      color: var(--text-muted);
      font-size: 0.88rem;
      line-height: 1.5;
      margin-bottom: 24px;
      flex-grow: 1;
    }

    .card-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn-launch {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #f0f3f6;
      color: #0b0d11;
      font-weight: 600;
      font-size: 0.88rem;
      text-decoration: none;
      padding: 10px 16px;
      border-radius: 10px;
    }

    .btn-launch:hover {
      background: #ffffff;
    }

    .btn-launch.disabled {
      background: #1f242d;
      color: #555d6d;
      pointer-events: none;
    }

    .btn-github {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      border: 1px solid var(--card-border);
      background: #141720;
      color: var(--text-muted);
      text-decoration: none;
    }

    .btn-github:hover {
      color: #ffffff;
      border-color: #3b4356;
    }

    footer {
      margin-top: 70px;
      border-top: 1px solid var(--card-border);
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      color: #606877;
      font-size: 0.82rem;
    }

    footer a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="tagline">01 / Crafting Apps Local Suite</div>
      <h1>Seven apps. One craft.</h1>
      <p class="lead">Native, clean-room creative apps written in pure Rust. Running locally via WebAssembly inside your modern web browser with zero telemetry.</p>
    </header>

    <div class="section-title-wrap">
      <div class="section-title">The lineup</div>
      <div class="section-index">02 / Pick a craft to launch</div>
    </div>

    <div class="grid">
      ${cardsHtml}
    </div>

    <footer>
      <div>ArtCraft Suite • Running locally on WSL</div>
      <div>Official Site: <a href="https://getartcraft.com/apps" target="_blank" rel="noopener">getartcraft.com/apps</a></div>
    </footer>
  </div>
</body>
</html>`;
}

// --- HTTP Request Handler ---

/**
 * Main HTTP Server Request Router with Path Traversal Protection
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
function handleRequest(req, res) {
  let reqUrl = decodeURI(req.url.split('?')[0]);

  // Root Dashboard Route
  if (reqUrl === '/' || reqUrl === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderDashboard());
    return;
  }

  // Cached Brand Icons Route
  if (reqUrl.startsWith('/icons/')) {
    const iconName = path.basename(reqUrl);
    const iconPath = path.resolve(ICONS_DIR, iconName);

    // Path traversal check
    if (!iconPath.startsWith(ICONS_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    if (fs.existsSync(iconPath)) {
      res.writeHead(200, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
      });
      const stream = fs.createReadStream(iconPath);
      stream.on('error', () => res.end());
      stream.pipe(res);
      return;
    }
  }

  // Trailing slash redirect for base app urls (e.g., /apps/photocraft -> /apps/photocraft/)
  if (reqUrl.startsWith('/apps/')) {
    const parts = reqUrl.split('/');
    if (parts.length === 3 && parts[2] !== '') {
      res.writeHead(301, { Location: `${reqUrl}/` });
      res.end();
      return;
    }
  }

  // Static Assets for WASM Applications
  if (reqUrl.startsWith('/apps/')) {
    const relativePath = reqUrl.replace(/^\/apps\//, '');
    let filePath = path.resolve(APPS_DIR, relativePath);

    // Strict Path Traversal Protection
    if (!filePath.startsWith(APPS_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Mandatory Security Headers for SharedArrayBuffer & WebAssembly Workers
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cache-Control': 'no-cache',
      });

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end();
      });
      stream.pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
}

// --- Application Entry Point ---

async function main() {
  if (!fs.existsSync(APPS_DIR)) {
    fs.mkdirSync(APPS_DIR, { recursive: true });
  }

  console.log('--- Synchronizing Assets ---');
  await syncIcons();

  console.log('\n--- Checking ArtCraft Web Releases ---');
  for (const app of APPS) {
    try {
      await syncApp(app);
    } catch (err) {
      console.error(`[${app.name}] Sync error:`, err.message);
    }
  }

  console.log('\n--- Starting HTTP Server ---');
  const server = http.createServer(handleRequest);

  server.listen(PORT, HOST, () => {
    console.log(`\n✔ Server is active.`);
    console.log(`➤ Dashboard URL: http://localhost:${PORT}`);
    console.log(`➤ Press Ctrl+C to stop.`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\nShutting down server...');
    server.close(() => {
      console.log('Server stopped cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});