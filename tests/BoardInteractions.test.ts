import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from '../src/game/config/gameConfig';
import { BattleEngine } from '../src/game/logic/BattleEngine';

function setup() {
  const engine = new BattleEngine(42);
  const first = engine.recruit(false)!;
  const second = engine.recruit(false)!;
  Object.assign(first, { type: 'bow', char: '弓' });
  Object.assign(second, { type: 'bow', char: '弓' });
  return { engine, first, second, player: engine.getState().player };
}

describe('board interactions', () => {
  it('moves a tile and frees its previous cell', () => {
    const { engine, first, player } = setup();
    expect(engine.placeTile(first.id, { row: 0, col: 0 }, false)).toBe(true);
    expect(engine.placeTile(first.id, { row: 0, col: 1 }, false)).toBe(true);
    expect(player.cells.filter(c => c.tileId === first.id)).toHaveLength(1);
    expect(player.cells.find(c => c.position.row === 0 && c.position.col === 0)!.tileId).toBeNull();
  });

  for (const fromGrid of [false, true]) {
    it(`merges ${fromGrid ? 'grid' : 'slot'} into the destination cell`, () => {
      const { engine, first, second, player } = setup();
      if (fromGrid) engine.placeTile(first.id, { row: 0, col: 0 }, false);
      engine.placeTile(second.id, { row: 0, col: 1 }, false);
      const merged = engine.mergeTiles(first.id, second.id, false)!;
      expect(merged.level).toBe(2);
      expect(merged.position).toEqual({ row: 0, col: 1 });
      expect(player.cells.filter(c => c.tileId === merged.id)).toHaveLength(1);
      expect(player.cells.some(c => c.tileId === first.id || c.tileId === second.id)).toBe(false);
      expect(player.holdingSlots.every(t => !t || (t.id !== first.id && t.id !== second.id))).toBe(true);
    });
  }

  it('rejects self merging', () => {
    const { engine, first } = setup();
    expect(engine.mergeTiles(first.id, first.id, false)).toBeNull();
    expect(first.level).toBe(1);
  });
});

describe('early battle pacing', () => {
  it('allows funded recruits and placement on every non-path cell', () => {
    const engine = new BattleEngine(42);
    engine.getState().player.buns = 100;
    const tiles = Array.from({length: 5}, () => engine.recruit(false)!);
    expect(tiles.every(Boolean)).toBe(true);
    for (const cell of engine.getState().player.cells.filter(c => !c.isPath)) {
      expect(engine.placeTile(tiles[0].id, cell.position, false)).toBe(true);
    }
  });

  it('walks the full path and resolves enemies at the exit', () => {
    const engine = new BattleEngine(42);
    engine.startNextWave();
    engine.update(16);
    const enemy = engine.getState().enemies[0];
    const startX = enemy.position.x;
    engine.update(1000);
    expect(enemy.position.x).toBeLessThan(startX - 20);
    const travelTime = (GAME_CONFIG.pathCells.length - 1) * GAME_CONFIG.cellSize / enemy.speed * 1000;
    engine.update(travelTime);
    expect(engine.getState().enemies.some(e => e.id === enemy.id)).toBe(false);
    expect(engine.getState().player.adouLives).toBeLessThan(3);
  });

  it('funds a populated AI board with rising costs and bounded savings', () => {
    const engine = new BattleEngine(42);
    for (let i = 0; i < 800; i++) engine.update(50);
    const { player, opponent } = engine.getState();
    expect(opponent.tiles.filter(t => t.position).length).toBeGreaterThanOrEqual(1);
    expect(opponent.recruitCost).toBe(Math.min(GAME_CONFIG.maxRecruitCost,10 + opponent.recruitCount * 2));
    expect(player.buns).toBeLessThan(150);
    expect(opponent.buns).toBeLessThan(150);
  });
});


describe('shared enemy schedule', () => {
  it('spawns and moves matching enemies on both boards with independent HP', () => {
    const engine = new BattleEngine(42);
    engine.getState().opponent.buns = 0;
    engine.startNextWave();
    for (let i = 0; i < 80; i++) { engine.getState().opponent.buns = 0; engine.update(100); }
    const { enemies, opponentEnemies } = engine.getState();
    expect(enemies).toHaveLength(12);
    expect(opponentEnemies).toHaveLength(12);
    enemies.forEach((enemy, i) => {
      const other = opponentEnemies[i];
      expect(other.type).toBe(enemy.type);
      expect(other.pathIndex).toBe(enemy.pathIndex);
      expect(other.pathProgress).toBeCloseTo(enemy.pathProgress);
      expect(other.position.x).toBeCloseTo(enemy.position.x);
      expect(other.position.y).toBeCloseTo(enemy.position.y - 350);
    });
    const opponentHealth = opponentEnemies[0].health;
    enemies[0].health = 1;
    expect(opponentEnemies[0].health).toBe(opponentHealth);
  });

  it('uses the same road cells on both boards and rejects every road placement', () => {
    const engine = new BattleEngine(42);
    const { player, opponent } = engine.getState();
    expect(player.cells.filter(c => c.isPath).map(c => c.position)).toEqual(
      opponent.cells.filter(c => c.isPath).map(c => c.position));
    expect(player.cells.filter(c => c.isPath)).toHaveLength(GAME_CONFIG.pathCells.length);
    for (const isOpponent of [false, true]) {
      const tile = engine.recruit(isOpponent)!;
      for (const position of GAME_CONFIG.pathCells) {
        expect(engine.placeTile(tile.id, position, isOpponent)).toBe(false);
      }
    }
  });
});

describe('holding slot cleanup', () => {
  it('consumes a shovel, removes its target, and refunds its level value', () => {
    const { engine, first, second, player } = setup();
    engine.placeTile(first.id, { row: 0, col: 0 }, false);
    Object.assign(second, { type: 'shovel', char: '铲' });
    const before = player.buns;
    expect(engine.useShovel(second.id, first.id)).toBe(true);
    expect(player.buns).toBe(before + 4);
    expect(player.tiles).toHaveLength(0);
    expect(player.holdingSlots.every(t => t === null)).toBe(true);
    expect(player.cells.find(c => c.position.row === 0 && c.position.col === 0)?.tileId).toBeNull();
  });
  it('sells holding and placed tiles', () => {
    const { engine, first, second } = setup();
    engine.placeTile(first.id, { row: 0, col: 0 }, false);
    expect(engine.discardTile(first.id)).toBe(true);
    expect(engine.discardTile(second.id)).toBe(true);
  });
});
