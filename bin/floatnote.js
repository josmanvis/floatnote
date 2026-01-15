#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { createWriteStream, mkdirSync, existsSync, rmSync, unlinkSync, readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');

const APP_NAME = 'Floatnote';
const GITHUB_REPO = 'josmanvis/floatnote';
const APP_DIR = path.join(process.env.HOME, '.floatnote');
const APP_PATH = path.join(APP_DIR, `${APP_NAME}.app`);
const VERSION_FILE = path.join(APP_DIR, 'version');

function log(message) {
  console.log(`[floatnote] ${message}`);
}

async function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: { 'User-Agent': 'floatnote-cli' }
    };

    https.get(options, (res) => {
      if (res.statusCode === 404) {
        reject(new Error('No releases found. Please wait for the first release to be published.'));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse release data'));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl) => {
      const parsedUrl = new URL(requestUrl);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: { 'User-Agent': 'floatnote-cli' }
      };

      https.get(options, (res) => {
        // Handle redirects
        if (res.statusCode === 302 || res.statusCode === 301) {
          makeRequest(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Download failed with status ${res.statusCode}`));
          return;
        }

        const totalSize = parseInt(res.headers['content-length'], 10);
        let downloadedSize = 0;

        const file = createWriteStream(dest);
        res.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (onProgress && totalSize) {
            const percent = Math.round((downloadedSize / totalSize) * 100);
            onProgress(percent, downloadedSize, totalSize);
          }
        });
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
        file.on('error', (err) => {
          unlinkSync(dest);
          reject(err);
        });
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function main() {
  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--version') || args.includes('-v')) {
    const pkg = require('../package.json');
    console.log(`floatnote v${pkg.version}`);
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Floatnote - Transparent drawing overlay for macOS

Usage: floatnote [options]

Options:
  -v, --version    Show version number
  -h, --help       Show this help message
  --update         Force update to latest version
  --uninstall      Remove Floatnote from your system

Keyboard shortcuts (when app is running):
  Cmd+Shift+G      Toggle Floatnote
  Alt+Space        Quick toggle
  Ctrl+\`           Quick toggle
  Cmd+,            Settings
  [ / ]            Navigate notes
`);
    return;
  }

  if (args.includes('--uninstall')) {
    if (existsSync(APP_DIR)) {
      rmSync(APP_DIR, { recursive: true });
      log('Floatnote has been uninstalled.');
    } else {
      log('Floatnote is not installed.');
    }
    return;
  }

  // Create app directory
  if (!existsSync(APP_DIR)) {
    mkdirSync(APP_DIR, { recursive: true });
  }

  const forceUpdate = args.includes('--update');
  let currentVersion = existsSync(VERSION_FILE) ? readFileSync(VERSION_FILE, 'utf8').trim() : null;

  // Check for updates
  try {
    log('Checking for updates...');
    const release = await getLatestRelease();

    if (forceUpdate || !currentVersion || currentVersion !== release.tag_name || !existsSync(APP_PATH)) {
      log(`Downloading Floatnote ${release.tag_name}...`);

      // Find the zip asset for macOS
      const zipAsset = release.assets.find(a =>
        a.name.includes('mac') && a.name.endsWith('.zip') ||
        a.name === `${APP_NAME}-${release.tag_name.replace('v', '')}-mac.zip` ||
        a.name === `${APP_NAME}.zip` ||
        a.name.endsWith('.zip')
      );

      if (!zipAsset) {
        throw new Error('No macOS build found in the latest release.');
      }

      const zipPath = path.join(APP_DIR, 'floatnote.zip');

      // Download with progress
      let lastPercent = 0;
      await downloadFile(zipAsset.browser_download_url, zipPath, (percent, downloaded, total) => {
        if (percent !== lastPercent && percent % 10 === 0) {
          log(`Progress: ${percent}% (${formatBytes(downloaded)} / ${formatBytes(total)})`);
          lastPercent = percent;
        }
      });

      // Extract
      log('Extracting...');
      if (existsSync(APP_PATH)) {
        rmSync(APP_PATH, { recursive: true });
      }
      execSync(`unzip -q -o "${zipPath}" -d "${APP_DIR}"`, { stdio: 'pipe' });
      unlinkSync(zipPath);

      // Save version
      writeFileSync(VERSION_FILE, release.tag_name);
      log(`Floatnote ${release.tag_name} installed successfully!`);
    } else {
      log(`Floatnote ${currentVersion} is up to date.`);
    }
  } catch (err) {
    if (!existsSync(APP_PATH)) {
      console.error(`Error: ${err.message}`);
      console.error('Make sure the GitHub repository has published releases.');
      process.exit(1);
    }
    // If app exists, we can still launch it
    log(`Could not check for updates: ${err.message}`);
  }

  // Launch the app
  if (existsSync(APP_PATH)) {
    log('Launching Floatnote...');
    spawn('open', [APP_PATH], { detached: true, stdio: 'ignore' }).unref();
  } else {
    console.error('Error: Floatnote app not found. Please try running with --update flag.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
