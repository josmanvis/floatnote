const { test: base, _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

exports.test = base.extend({
  electronApp: async ({}, use) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floatnote-test-'));

    const app = await electron.launch({
      args: [path.join(__dirname, '../../../src/main.js')],
      env: {
        ...process.env,
        ELECTRON_USER_DATA_DIR: tmpDir,
        NODE_ENV: 'test',
      },
    });

    await use(app);

    await app.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await page.waitForSelector('#draw-canvas');
    // Wait for Glassboard instance to be initialized
    await page.waitForFunction(() => window.glassboardInstance != null);
    await use(page);
  },
});

exports.expect = require('@playwright/test').expect;
