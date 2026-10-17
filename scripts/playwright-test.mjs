#!/usr/bin/env node
/**
 * Playwright test script for 三国字阵 game
 * Tests: recruit, drag-drop, combat, merge, general activation
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOT_DIR = '/opt/cursor/artifacts/screenshots';
const GAME_URL = 'http://localhost:5175';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const path = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`Screenshot: ${path}`);
  return path;
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2
  });
  
  const page = await context.newPage();
  
  console.log('Opening game...');
  await page.goto(GAME_URL);
  await delay(2000);
  
  console.log('Taking start screen screenshot...');
  await screenshot(page, 'test-01-start-screen');
  
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  console.log('Canvas bounds:', box);
  
  const canvasCenterX = box.x + box.width / 2;
  const canvasCenterY = box.y + box.height / 2;
  
  console.log('Clicking start button at center...');
  await page.mouse.click(canvasCenterX, canvasCenterY);
  await delay(1000);
  
  await screenshot(page, 'test-02-game-started');
  
  const recruitBtnX = canvasCenterX;
  const recruitBtnY = box.y + box.height - 50;
  
  console.log('Recruiting tiles...');
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(recruitBtnX, recruitBtnY);
    await delay(500);
    console.log(`Recruited tile ${i + 1}`);
  }
  
  await screenshot(page, 'test-03-tiles-recruited');
  
  console.log('Waiting for enemies to spawn...');
  await delay(4000);
  
  await screenshot(page, 'test-04-enemies-spawned');
  
  console.log('Dragging tile to grid...');
  const slotStartX = box.x + 80;
  const slotY = box.y + box.height - 130;
  
  const gridX = box.x + 200;
  const gridY = box.y + 520;
  
  await page.mouse.move(slotStartX, slotY);
  await delay(100);
  await page.mouse.down();
  await delay(200);
  
  await screenshot(page, 'test-05-pickup');
  
  await page.mouse.move(gridX, gridY, { steps: 15 });
  await delay(200);
  
  await screenshot(page, 'test-06-dragging');
  
  await page.mouse.up();
  await delay(500);
  
  await screenshot(page, 'test-07-tile-placed');
  
  console.log('Recruiting more and placing...');
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(recruitBtnX, recruitBtnY);
    await delay(300);
  }
  
  const gridPositions = [
    { x: box.x + 160, y: box.y + 480 },
    { x: box.x + 205, y: box.y + 480 },
    { x: box.x + 250, y: box.y + 480 },
    { x: box.x + 160, y: box.y + 565 },
  ];
  
  for (let i = 0; i < 4; i++) {
    const slotX = slotStartX + (i % 5) * 55;
    await page.mouse.move(slotX, slotY);
    await page.mouse.down();
    await delay(50);
    await page.mouse.move(gridPositions[i].x, gridPositions[i].y, { steps: 8 });
    await page.mouse.up();
    await delay(300);
  }
  
  await screenshot(page, 'test-08-multiple-tiles');
  
  console.log('Waiting for combat...');
  await delay(6000);
  
  await screenshot(page, 'test-09-combat');
  
  console.log('More combat effects...');
  await delay(4000);
  
  await screenshot(page, 'test-10-more-combat');
  
  console.log('Final state...');
  await delay(3000);
  await screenshot(page, 'test-11-final');
  
  console.log('\n--- Debug mode test ---');
  await page.goto(GAME_URL + '?debug=1');
  await delay(2000);
  
  await screenshot(page, 'test-12-debug-start');
  
  await page.mouse.click(canvasCenterX, canvasCenterY);
  await delay(1000);
  
  await screenshot(page, 'test-13-debug-playing');
  
  const debugPanelX = box.x + box.width - 60;
  const debugGeneralY = box.y + 550;
  
  console.log('Spawning general...');
  await page.mouse.click(debugPanelX, debugGeneralY);
  await delay(500);
  
  await screenshot(page, 'test-14-general-spawned');
  
  const debugFireY = box.y + 450;
  console.log('Triggering fire VFX...');
  await page.mouse.click(debugPanelX, debugFireY);
  await delay(500);
  
  await screenshot(page, 'test-15-fire-vfx');
  
  await delay(2000);
  await screenshot(page, 'test-16-vfx-complete');
  
  await browser.close();
  console.log('\n✓ Test complete! Screenshots saved to', SCREENSHOT_DIR);
}

main().catch(console.error);
