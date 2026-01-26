const { test, expect } = require('./fixtures/electron-app');

test.describe('Clipboard paste', () => {
  test('paste image from clipboard', async ({ electronApp, page }) => {
    // Create a 10x10 red image and write to clipboard via Electron main process
    const imageWritten = await electronApp.evaluate(async ({ clipboard, nativeImage }) => {
      // Valid 10x10 red PNG generated with proper IHDR/IDAT/IEND chunks
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fTcuYAAAAAElFTkSuQmCC';
      const imgBuffer = Buffer.from(pngBase64, 'base64');
      const nImg = nativeImage.createFromBuffer(imgBuffer);
      if (nImg.isEmpty()) return false;
      clipboard.writeImage(nImg);
      // Verify it was written
      const check = clipboard.readImage();
      return !check.isEmpty();
    });

    expect(imageWritten).toBe(true);

    // Trigger paste via Cmd+V (smart paste checks system clipboard first)
    await page.keyboard.press('Meta+v');

    // Wait for image to appear in data model
    await page.waitForFunction(() => {
      return window.glassboardInstance.images &&
             window.glassboardInstance.images.length > 0;
    }, { timeout: 5000 });

    // Verify image was added
    const imageCount = await page.evaluate(() => window.glassboardInstance.images.length);
    expect(imageCount).toBe(1);

    // Verify the image has a dataUrl
    const hasDataUrl = await page.evaluate(() => {
      const img = window.glassboardInstance.images[0];
      return img.dataUrl && img.dataUrl.startsWith('data:image/');
    });
    expect(hasDataUrl).toBe(true);
  });

  test('paste text from clipboard creates text item', async ({ electronApp, page }) => {
    // Write text to system clipboard
    await electronApp.evaluate(async ({ clipboard }) => {
      clipboard.writeText('Pasted from clipboard');
    });

    // Trigger paste via Cmd+V (smart paste detects text in clipboard)
    await page.keyboard.press('Meta+v');

    // Wait for text item to appear in data model
    await page.waitForFunction(() => {
      return window.glassboardInstance.textItems &&
             window.glassboardInstance.textItems.length > 0;
    }, { timeout: 5000 });

    // Verify text item was created
    const textCount = await page.evaluate(() => window.glassboardInstance.textItems.length);
    expect(textCount).toBe(1);

    // Verify content contains the pasted text
    const content = await page.evaluate(() => window.glassboardInstance.textItems[0].content);
    expect(content).toContain('Pasted from clipboard');
  });
});
