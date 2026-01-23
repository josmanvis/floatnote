const { test: base, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

// These tests manage their own Electron lifecycle (close + relaunch)
// so they CANNOT use the shared fixture from ./fixtures/electron-app.js

async function launchApp(tmpDir) {
  const app = await electron.launch({
    args: [path.join(__dirname, '../../src/main.js')],
    env: {
      ...process.env,
      ELECTRON_USER_DATA_DIR: tmpDir,
      NODE_ENV: 'test',
    },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('#draw-canvas');
  await page.waitForFunction(() => window.glassboardInstance != null);
  return { app, page };
}

async function waitForAutoSave(page) {
  // 1s debounce + 1s buffer for reliability
  await page.waitForTimeout(2000);
}

async function openSettings(page) {
  await page.evaluate(() => window.glassboardInstance.showSettings());
  await page.waitForSelector('#settings-panel.visible');
}

base.describe('Settings persistence across restart', () => {
  base('gesture settings persist across restart', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floatnote-settings-'));
    let app, page;

    try {
      // Session 1: Change gesture settings
      ({ app, page } = await launchApp(tmpDir));

      await openSettings(page);

      // Uncheck pinch-zoom and pan (they are checked by default)
      await page.evaluate(() => {
        const pinchZoom = document.getElementById('setting-pinch-zoom');
        pinchZoom.checked = false;
        pinchZoom.dispatchEvent(new Event('change', { bubbles: true }));

        const pan = document.getElementById('setting-pan');
        pan.checked = false;
        pan.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Wait for auto-save to write to disk
      await waitForAutoSave(page);

      // Close session 1
      await app.close();
      await new Promise(r => setTimeout(r, 500));

      // Session 2: Verify gesture settings persist
      ({ app, page } = await launchApp(tmpDir));
      await page.waitForTimeout(500); // Wait for loadSavedData

      await openSettings(page);

      // Verify pinch-zoom is unchecked
      const pinchZoomChecked = await page.evaluate(() =>
        document.getElementById('setting-pinch-zoom').checked
      );
      expect(pinchZoomChecked).toBe(false);

      // Verify pan is unchecked
      const panChecked = await page.evaluate(() =>
        document.getElementById('setting-pan').checked
      );
      expect(panChecked).toBe(false);

      // Verify rotate is still checked (was not changed)
      const rotateChecked = await page.evaluate(() =>
        document.getElementById('setting-rotate').checked
      );
      expect(rotateChecked).toBe(true);

      await app.close();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  base('appearance settings persist across restart', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floatnote-settings-'));
    let app, page;

    try {
      // Session 1: Change opacity slider
      ({ app, page } = await launchApp(tmpDir));

      await openSettings(page);

      // Set active opacity to 50 (default is 10)
      await page.evaluate(() => {
        const slider = document.getElementById('setting-active-opacity');
        slider.value = '50';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // Wait for auto-save to write to disk
      await waitForAutoSave(page);

      // Close session 1
      await app.close();
      await new Promise(r => setTimeout(r, 500));

      // Session 2: Verify opacity setting persists
      ({ app, page } = await launchApp(tmpDir));
      await page.waitForTimeout(500);

      // Verify slider value is restored (check DOM state after load)
      const sliderValue = await page.evaluate(() =>
        document.getElementById('setting-active-opacity').value
      );
      expect(sliderValue).toBe('50');

      // Also verify the data model has the correct value
      const settingValue = await page.evaluate(() =>
        window.glassboardInstance.settings.activeOpacity
      );
      expect(settingValue).toBe(50);

      await app.close();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  base('behavior settings persist across restart', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floatnote-settings-'));
    let app, page;

    try {
      // Session 1: Enable clean slate setting
      ({ app, page } = await launchApp(tmpDir));

      await openSettings(page);

      // Check "Always open with clean slate" (unchecked by default)
      await page.evaluate(() => {
        const cleanSlate = document.getElementById('setting-clean-slate');
        cleanSlate.checked = true;
        cleanSlate.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Wait for auto-save to write to disk
      await waitForAutoSave(page);

      // Close session 1
      await app.close();
      await new Promise(r => setTimeout(r, 500));

      // Session 2: Verify behavior setting persists
      ({ app, page } = await launchApp(tmpDir));
      await page.waitForTimeout(500);

      await openSettings(page);

      // Verify clean-slate checkbox is checked
      const cleanSlateChecked = await page.evaluate(() =>
        document.getElementById('setting-clean-slate').checked
      );
      expect(cleanSlateChecked).toBe(true);

      // Also verify the data model
      const settingValue = await page.evaluate(() =>
        window.glassboardInstance.settings.openWithCleanSlate
      );
      expect(settingValue).toBe(true);

      await app.close();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
