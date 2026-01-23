const { test, expect } = require('./fixtures/electron-app');

async function drawStroke(page, startX, startY, endX, endY) {
  const box = await page.locator('#draw-canvas').boundingBox();
  const absStartX = box.x + startX;
  const absStartY = box.y + startY;
  const absEndX = box.x + endX;
  const absEndY = box.y + endY;

  await page.mouse.move(absStartX, absStartY);
  await page.mouse.down();

  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = absStartX + ((absEndX - absStartX) * i) / steps;
    const y = absStartY + ((absEndY - absStartY) * i) / steps;
    await page.mouse.move(x, y);
  }

  await page.mouse.up();
}

test.describe('Drawing flow', () => {
  test('draw a stroke and verify it exists in data model', async ({ page }) => {
    // Draw mode is active by default - draw directly on canvas
    await drawStroke(page, 100, 100, 300, 300);

    const lineCount = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(lineCount).toBeGreaterThan(0);

    const pointCount = await page.evaluate(() => window.glassboardInstance.lines[0].points.length);
    expect(pointCount).toBeGreaterThan(2);
  });

  test('draw multiple strokes', async ({ page }) => {
    await drawStroke(page, 100, 100, 200, 200);
    // Wait beyond the 500ms objectId grouping window
    await page.waitForTimeout(600);
    await drawStroke(page, 400, 100, 500, 200);

    const lineCount = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(lineCount).toBe(2);
  });

  test('undo removes last stroke', async ({ page }) => {
    // Save initial empty state so undo has a baseline to return to
    await page.evaluate(() => window.glassboardInstance.saveState());

    await drawStroke(page, 100, 100, 300, 300);

    const before = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(before).toBeGreaterThan(0);

    await page.evaluate(() => window.glassboardInstance.undo());

    const after = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(after).toBe(0);
  });

  test('clear all removes everything', async ({ page }) => {
    await drawStroke(page, 100, 100, 300, 300);

    const before = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(before).toBeGreaterThan(0);

    // Call clear directly via the exposed instance (toolbar only shows on hover)
    await page.evaluate(() => window.glassboardInstance.clear());

    const after = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(after).toBe(0);
  });
});
