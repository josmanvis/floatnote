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

test.describe('Multi-note navigation', () => {
  test('create new note and verify counter', async ({ page }) => {
    // Verify initial counter
    const initialCounter = await page.locator('#note-counter').textContent();
    expect(initialCounter).toBe('1/1');

    // Click new-note button
    await page.evaluate(() => document.getElementById('new-note').click());
    await page.waitForTimeout(200);

    // Verify counter shows 2/2
    const newCounter = await page.locator('#note-counter').textContent();
    expect(newCounter).toBe('2/2');
  });

  test('navigate between notes preserves content', async ({ page }) => {
    // Draw a stroke on note 1 (draw mode is default)
    await drawStroke(page, 100, 100, 250, 250);
    await page.waitForTimeout(100);

    const note1Lines = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(note1Lines).toBeGreaterThan(0);

    // Create note 2
    await page.evaluate(() => document.getElementById('new-note').click());
    await page.waitForTimeout(200);

    // Verify counter is 2/2
    const counter2 = await page.locator('#note-counter').textContent();
    expect(counter2).toBe('2/2');

    // Draw a different stroke on note 2
    await drawStroke(page, 300, 100, 450, 250);
    await page.waitForTimeout(100);

    const note2Lines = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(note2Lines).toBeGreaterThan(0);

    // Navigate back to note 1
    await page.evaluate(() => document.getElementById('prev-note').click());
    await page.waitForTimeout(200);

    // Verify counter is 1/2
    const counter1 = await page.locator('#note-counter').textContent();
    expect(counter1).toBe('1/2');

    // Verify note 1 still has its lines
    const note1LinesAfter = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(note1LinesAfter).toBeGreaterThan(0);

    // Navigate forward to note 2
    await page.evaluate(() => document.getElementById('next-note').click());
    await page.waitForTimeout(200);

    // Verify note 2 still has its lines
    const note2LinesAfter = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(note2LinesAfter).toBeGreaterThan(0);
  });

  test('new note starts empty', async ({ page }) => {
    // Draw a stroke on note 1
    await drawStroke(page, 100, 100, 250, 250);
    await page.waitForTimeout(100);

    const hasLines = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(hasLines).toBeGreaterThan(0);

    // Create new note
    await page.evaluate(() => document.getElementById('new-note').click());
    await page.waitForTimeout(200);

    // Verify new note is empty
    const lines = await page.evaluate(() => window.glassboardInstance.lines.length);
    expect(lines).toBe(0);

    const textItems = await page.evaluate(() => window.glassboardInstance.textItems.length);
    expect(textItems).toBe(0);
  });

  test('navigate with keyboard shortcuts', async ({ page }) => {
    // Create note 2
    await page.evaluate(() => document.getElementById('new-note').click());
    await page.waitForTimeout(200);

    const counter = await page.locator('#note-counter').textContent();
    expect(counter).toBe('2/2');

    // Ensure we're not in text mode (keyboard shortcuts only work outside text input)
    await page.evaluate(() => document.getElementById('draw-mode').click());
    await page.waitForTimeout(100);

    // Press '[' to go back to note 1
    await page.keyboard.press('[');
    await page.waitForTimeout(200);

    const counterAfterPrev = await page.locator('#note-counter').textContent();
    expect(counterAfterPrev).toBe('1/2');

    // Press ']' to go forward to note 2
    await page.keyboard.press(']');
    await page.waitForTimeout(200);

    const counterAfterNext = await page.locator('#note-counter').textContent();
    expect(counterAfterNext).toBe('2/2');
  });
});
