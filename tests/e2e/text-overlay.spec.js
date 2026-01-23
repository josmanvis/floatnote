const { test, expect } = require('./fixtures/electron-app');

test.describe('Text overlay', () => {
  test('create text overlay and verify content', async ({ page }) => {
    // Switch to text mode
    await page.evaluate(() => document.getElementById('text-mode').click());

    // Get text-container boundingBox for click positioning
    const box = await page.locator('#text-container').boundingBox();

    // Click to create a text item
    await page.mouse.click(box.x + 200, box.y + 200);

    // Wait for the contenteditable text-input div to appear
    await page.waitForSelector('.text-item .text-input');

    // Type content
    await page.keyboard.type('Hello E2E');

    // Click elsewhere to deselect (click the canvas area)
    await page.mouse.click(box.x + 50, box.y + 50);

    // Small delay for input event to propagate
    await page.waitForTimeout(200);

    // Verify text item exists in data model
    const itemCount = await page.evaluate(() => window.glassboardInstance.textItems.length);
    expect(itemCount).toBe(1);

    // Verify content
    const content = await page.evaluate(() => window.glassboardInstance.textItems[0].content);
    expect(content).toContain('Hello E2E');
  });

  test('edit existing text overlay', async ({ page }) => {
    // Switch to text mode and create a text item
    await page.evaluate(() => document.getElementById('text-mode').click());
    const box = await page.locator('#text-container').boundingBox();
    await page.mouse.click(box.x + 200, box.y + 200);
    await page.waitForSelector('.text-item .text-input');
    await page.keyboard.type('Initial text');

    // Click elsewhere to deselect
    await page.mouse.click(box.x + 50, box.y + 50);
    await page.waitForTimeout(200);

    // Switch to select mode
    await page.evaluate(() => document.getElementById('select-mode').click());

    // Double-click the text item to re-enter edit mode
    const textItem = page.locator('.text-item .text-input');
    await textItem.dblclick();
    await page.waitForTimeout(100);

    // Select all and type new text
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('Edited text');

    // Click elsewhere to deselect
    await page.mouse.click(box.x + 50, box.y + 50);
    await page.waitForTimeout(200);

    // Verify content changed in data model
    const content = await page.evaluate(() => window.glassboardInstance.textItems[0].content);
    expect(content).toContain('Edited text');
  });

  test('multiple text overlays at different positions', async ({ page }) => {
    // Switch to text mode
    await page.evaluate(() => document.getElementById('text-mode').click());
    const box = await page.locator('#text-container').boundingBox();

    // Create first text item
    await page.mouse.click(box.x + 150, box.y + 150);
    await page.waitForSelector('.text-item .text-input');
    await page.keyboard.type('First');

    // Click elsewhere to deselect
    await page.mouse.click(box.x + 50, box.y + 50);
    await page.waitForTimeout(300);

    // Create second text item at a different position
    await page.mouse.click(box.x + 350, box.y + 350);
    // Wait for the second text item
    await page.waitForFunction(() => {
      return document.querySelectorAll('.text-item').length === 2;
    });
    await page.keyboard.type('Second');

    // Click elsewhere to deselect
    await page.mouse.click(box.x + 50, box.y + 50);
    await page.waitForTimeout(200);

    // Verify both items exist in data model
    const itemCount = await page.evaluate(() => window.glassboardInstance.textItems.length);
    expect(itemCount).toBe(2);
  });
});
