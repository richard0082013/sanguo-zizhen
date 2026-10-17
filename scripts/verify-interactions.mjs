import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5174');
  await page.waitForFunction(() => window.__test);
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height * 0.55);
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene');
    const state = scene.engine.getState();
    state.player.buns = 1000;
    for (let i = 0; i < 2; i++) {
      const tile = scene.engine.recruit(false);
      Object.assign(tile, { type: 'bow', char: '弓' });
      scene.tileSprites.get(tile.id).container.destroy();
      scene.tileSprites.delete(tile.id);
      scene.createHoldingSlotTile(i);
    }
  });
  await page.waitForTimeout(300);
  async function drag(from, to) {
    await page.mouse.move(canvas.x + from.x, canvas.y + from.y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + to.x, canvas.y + to.y, { steps: 15 });
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  const positions = await page.evaluate(() => ({
    a: window.__test.slotPos(0), b: window.__test.slotPos(1),
    cell: window.__test.cellPos(0, 6), next: window.__test.cellPos(0, 5),
  }));
  await drag(positions.a, positions.cell);
  await drag(positions.b, positions.cell);
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene').engine.getState().player.tiles[0].level), 2);
  await drag(positions.cell, positions.next);
  assert.deepEqual(await page.evaluate(() => window.__game.scene.getScene('GameScene').engine.getState().player.tiles[0].position), { row: 0, col: 5 });
  await page.waitForTimeout(4000);
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene').debugMode), false);
  await page.evaluate(() => window.__test.triggerFire());
  await page.waitForTimeout(350);
  await page.screenshot({ path: '/tmp/sanguo-fire.png' });
  await page.waitForTimeout(2500);
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: scaled canvas drag, slot merge, grid move, fire, no runtime errors.');
} finally {
  await browser.close();
}
