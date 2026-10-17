#!/usr/bin/env node
/**
 * Comprehensive Playwright test for 三国字阵 game
 * Tests: recruit, drag tiles to grid, combat with projectiles/damage numbers, merge, VFX
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
    viewport: { width: 500, height: 900 },
    deviceScaleFactor: 2
  });
  
  const page = await context.newPage();
  
  console.log('Opening game with debug mode...');
  await page.goto(GAME_URL + '?debug=1');
  await delay(2000);
  
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  console.log('Canvas bounds:', box);
  
  const canvasCenterX = box.x + box.width / 2;
  
  console.log('\n=== SCREENSHOT 1: Start screen ===');
  await screenshot(page, 'final-01-start');
  
  console.log('\nClicking start button...');
  const startBtnY = box.y + box.height * 0.58;
  await page.mouse.click(canvasCenterX, startBtnY);
  await delay(1500);
  
  console.log('\n=== SCREENSHOT 2: Game started ===');
  await screenshot(page, 'final-02-started');
  
  const recruitBtnY = box.y + box.height * 0.965;
  
  console.log('\nRecruiting 5 tiles...');
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(canvasCenterX, recruitBtnY);
    await delay(400);
    console.log(`  Recruited tile ${i + 1}`);
  }
  await delay(500);
  
  console.log('\n=== SCREENSHOT 3: Tiles recruited ===');
  await screenshot(page, 'final-03-recruited');
  
  console.log('\nDragging tiles to grid...');
  const slotY = box.y + box.height * 0.905;
  const slotStartX = box.x + box.width * 0.2;
  const slotGap = 52;
  
  const gridStartX = box.x + box.width * 0.2;
  const gridStartY = box.y + box.height * 0.5;
  const cellSize = 52;
  
  const placements = [
    { slotIdx: 0, gridCol: 1, gridRow: 1 },
    { slotIdx: 1, gridCol: 1, gridRow: 2 },
    { slotIdx: 2, gridCol: 3, gridRow: 2 },
    { slotIdx: 3, gridCol: 5, gridRow: 2 },
  ];
  
  for (const p of placements) {
    const fromX = slotStartX + p.slotIdx * slotGap;
    const fromY = slotY;
    const toX = gridStartX + p.gridCol * cellSize;
    const toY = gridStartY + p.gridRow * cellSize;
    
    await page.mouse.move(fromX, fromY);
    await page.mouse.down();
    await delay(100);
    await page.mouse.move(toX, toY, { steps: 10 });
    await delay(100);
    await page.mouse.up();
    await delay(300);
    console.log(`  Placed tile ${p.slotIdx + 1} at col ${p.gridCol}, row ${p.gridRow}`);
  }
  
  console.log('\n=== SCREENSHOT 4: Tiles placed on grid ===');
  await screenshot(page, 'final-04-tiles-placed');
  
  console.log('\nWaiting for enemies to reach tiles...');
  await delay(8000);
  
  console.log('\n=== SCREENSHOT 5: Combat in progress ===');
  await screenshot(page, 'final-05-combat');
  
  console.log('\nRecruiting more tiles for merging...');
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(canvasCenterX, recruitBtnY);
    await delay(400);
  }
  
  console.log('\nTrying to merge (placing same-type tiles adjacent)...');
  for (let i = 0; i < 2; i++) {
    const fromX = slotStartX + i * slotGap;
    const toX = gridStartX + (1 + i) * cellSize;
    const toY = gridStartY + 3 * cellSize;
    
    await page.mouse.move(fromX, slotY);
    await page.mouse.down();
    await delay(100);
    await page.mouse.move(toX, toY, { steps: 8 });
    await page.mouse.up();
    await delay(300);
  }
  
  await delay(2000);
  console.log('\n=== SCREENSHOT 6: After potential merge ===');
  await screenshot(page, 'final-06-merge');
  
  console.log('\nSpawning general via debug panel...');
  const debugPanelX = box.x + box.width - 55;
  const generalBtnY = box.y + 590;
  await page.mouse.click(debugPanelX, generalBtnY);
  await delay(1000);
  
  console.log('\n=== SCREENSHOT 7: General spawned ===');
  await screenshot(page, 'final-07-general');
  
  console.log('\nTriggering Fire VFX...');
  const fireBtnY = box.y + 470;
  await page.mouse.click(debugPanelX, fireBtnY);
  await delay(500);
  
  console.log('\n=== SCREENSHOT 8: Fire VFX ===');
  await screenshot(page, 'final-08-fire-vfx');
  
  console.log('\nWaiting for more combat...');
  await delay(5000);
  
  console.log('\n=== SCREENSHOT 9: Extended combat ===');
  await screenshot(page, 'final-09-combat-extended');
  
  console.log('\nTriggering lightning VFX...');
  const lightningBtnY = box.y + 620;
  await page.mouse.click(debugPanelX, lightningBtnY);
  await delay(500);
  
  console.log('\n=== SCREENSHOT 10: Lightning VFX ===');
  await screenshot(page, 'final-10-lightning');
  
  await browser.close();
  console.log('\n✓ Test complete! Screenshots saved to', SCREENSHOT_DIR);
}

main().catch(console.error);
