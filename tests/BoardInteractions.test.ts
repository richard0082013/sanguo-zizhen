import { describe, it, expect } from 'vitest';
import { BattleEngine } from '../src/game/logic/BattleEngine';

function setup() {
  const engine = new BattleEngine(42);
  engine.getState().player.buns = 1000;
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
  it('allows five recruits and placement on every non-path cell', () => {
    const engine = new BattleEngine(42);
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
    engine.update(20000);
    expect(engine.getState().enemies.some(e => e.id === enemy.id)).toBe(false);
    expect(engine.getState().player.adouLives).toBeLessThan(3);
  });

  it('fills the opponent board with timed recruiting', () => {
    const engine = new BattleEngine(42);
    for(let i = 0; i < 240; i++) engine.update(50);
    expect(engine.getState().opponent.tiles.filter(t => t.position).length).toBeGreaterThanOrEqual(20);
  });
});
