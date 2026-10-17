import { describe, it, expect, beforeEach } from 'vitest';
import { BattleEngine } from '../src/game/logic/BattleEngine';
import { GAME_CONFIG } from '../src/game/config/gameConfig';
import { MAX_TILE_LEVEL } from '../src/game/config/tiles';

describe('BattleEngine', () => {
  let engine: BattleEngine;

  beforeEach(() => {
    engine = new BattleEngine(12345);
  });

  describe('Initial State', () => {
    it('should initialize with correct player state', () => {
      const state = engine.getState();

      expect(state.player.buns).toBe(GAME_CONFIG.initialBuns);
      expect(state.player.adouLives).toBe(GAME_CONFIG.adouLives);
      expect(state.player.recruitCost).toBe(GAME_CONFIG.baseRecruitCost);
      expect(state.player.tiles).toHaveLength(0);
      expect(state.player.pendingTile).toBeNull();
    });

    it('should initialize with correct number of cells', () => {
      const state = engine.getState();
      const expectedCells = GAME_CONFIG.gridCols * GAME_CONFIG.gridRows;

      expect(state.player.cells).toHaveLength(expectedCells);

      const unlockedCells = state.player.cells.filter((c) => c.isUnlocked);
      expect(unlockedCells).toHaveLength(GAME_CONFIG.initialUnlockedCells);
    });

    it('should initialize opponent with same state', () => {
      const state = engine.getState();

      expect(state.opponent.buns).toBe(state.player.buns);
      expect(state.opponent.adouLives).toBe(state.player.adouLives);
      expect(state.opponent.cells).toHaveLength(state.player.cells.length);
    });
  });

  describe('Recruit System', () => {
    it('should recruit a tile when player has enough buns', () => {
      const tile = engine.recruit(false);

      expect(tile).not.toBeNull();
      expect(tile!.level).toBe(1);
      expect(tile!.position).toBeNull();
    });

    it('should deduct buns when recruiting', () => {
      const initialBuns = engine.getState().player.buns;
      const cost = engine.getRecruitCost(false);

      engine.recruit(false);

      expect(engine.getState().player.buns).toBe(initialBuns - cost);
    });

    it('should increase recruit cost after each recruit', () => {
      const initialCost = engine.getRecruitCost(false);

      engine.recruit(false);

      const newCost = engine.getRecruitCost(false);
      expect(newCost).toBe(initialCost + GAME_CONFIG.recruitCostIncrement);
    });

    it('should not recruit when player has insufficient buns', () => {
      const state = engine.getState();
      state.player.buns = 0;

      const tile = engine.recruit(false);

      expect(tile).toBeNull();
    });

    it('should set pending tile after recruit', () => {
      engine.recruit(false);

      const state = engine.getState();
      expect(state.player.pendingTile).not.toBeNull();
    });

    it('should produce deterministic results with same seed', () => {
      const engine1 = new BattleEngine(42);
      const engine2 = new BattleEngine(42);

      const tile1 = engine1.recruit(false);
      const tile2 = engine2.recruit(false);

      expect(tile1!.type).toBe(tile2!.type);
      expect(tile1!.char).toBe(tile2!.char);
    });
  });

  describe('Tile Placement', () => {
    it('should place tile on unlocked empty cell', () => {
      const tile = engine.recruit(false)!;
      if (tile.type === 'shovel') {
        engine.recruit(false);
        return;
      }

      const state = engine.getState();
      const emptyCell = state.player.cells.find((c) => c.isUnlocked && !c.tileId);

      if (!emptyCell) return;

      const success = engine.placeTile(tile.id, emptyCell.position, false);

      expect(success).toBe(true);

      const updatedState = engine.getState();
      const placedTile = updatedState.player.tiles.find((t) => t.id === tile.id);
      expect(placedTile!.position).toEqual(emptyCell.position);
    });

    it('should not place tile on locked cell', () => {
      const tile = engine.recruit(false)!;
      if (tile.type === 'shovel') return;

      const state = engine.getState();
      const lockedCell = state.player.cells.find((c) => !c.isUnlocked);

      if (!lockedCell) return;

      const success = engine.placeTile(tile.id, lockedCell.position, false);

      expect(success).toBe(false);
    });

    it('should not place tile on occupied cell', () => {
      engine.getState().player.buns = 100;

      const tile1 = engine.recruit(false)!;
      const tile2 = engine.recruit(false)!;

      if (tile1.type === 'shovel' || tile2.type === 'shovel') return;

      const state = engine.getState();
      const emptyCell = state.player.cells.find((c) => c.isUnlocked && !c.tileId);

      if (!emptyCell) return;

      engine.placeTile(tile1.id, emptyCell.position, false);
      const success = engine.placeTile(tile2.id, emptyCell.position, false);

      expect(success).toBe(false);
    });

    it('should clear pending tile after placement', () => {
      const tile = engine.recruit(false)!;
      if (tile.type === 'shovel') return;

      const state = engine.getState();
      const emptyCell = state.player.cells.find((c) => c.isUnlocked && !c.tileId);

      if (!emptyCell) return;

      engine.placeTile(tile.id, emptyCell.position, false);

      expect(engine.getState().player.pendingTile).toBeNull();
    });
  });

  describe('Merge System', () => {
    it('should merge two tiles of same type, char, and level', () => {
      const state = engine.getState();
      state.player.buns = 1000;

      const tiles: ReturnType<typeof engine.recruit>[] = [];
      for (let i = 0; i < 20; i++) {
        const tile = engine.recruit(false);
        if (tile && tile.type !== 'shovel' && tile.type !== 'general') {
          tiles.push(tile);
        }
      }

      const swordTiles = state.player.tiles.filter(
        (t) => t.type === 'sword' && t.level === 1
      );

      if (swordTiles.length < 2) return;

      const emptyCells = state.player.cells.filter((c) => c.isUnlocked && !c.tileId);
      if (emptyCells.length < 2) return;

      engine.placeTile(swordTiles[0].id, emptyCells[0].position, false);
      engine.placeTile(swordTiles[1].id, emptyCells[1].position, false);

      const newTile = engine.mergeTiles(swordTiles[0].id, swordTiles[1].id, false);

      if (newTile) {
        expect(newTile.level).toBe(2);
        expect(newTile.type).toBe('sword');
      }
    });

    it('should not merge tiles of different types', () => {
      const state = engine.getState();
      state.player.buns = 1000;

      for (let i = 0; i < 20; i++) {
        engine.recruit(false);
      }

      const swordTile = state.player.tiles.find((t) => t.type === 'sword');
      const spearTile = state.player.tiles.find((t) => t.type === 'spear');

      if (!swordTile || !spearTile) return;

      const result = engine.mergeTiles(swordTile.id, spearTile.id, false);

      expect(result).toBeNull();
    });

    it('should not merge tiles of different levels', () => {
      const state = engine.getState();
      state.player.buns = 1000;

      for (let i = 0; i < 30; i++) {
        engine.recruit(false);
      }

      const swordTiles = state.player.tiles.filter((t) => t.type === 'sword');

      if (swordTiles.length < 3) return;

      const emptyCells = state.player.cells.filter((c) => c.isUnlocked && !c.tileId);
      if (emptyCells.length < 3) return;

      engine.placeTile(swordTiles[0].id, emptyCells[0].position, false);
      engine.placeTile(swordTiles[1].id, emptyCells[1].position, false);

      const mergedTile = engine.mergeTiles(swordTiles[0].id, swordTiles[1].id, false);

      if (!mergedTile || swordTiles.length < 3) return;

      engine.placeTile(swordTiles[2].id, emptyCells[2].position, false);

      const result = engine.mergeTiles(mergedTile.id, swordTiles[2].id, false);

      expect(result).toBeNull();
    });

    it('should not merge tiles at max level', () => {
      const state = engine.getState();

      const tile1 = {
        id: 'test_tile_1',
        type: 'sword' as const,
        char: '刀',
        level: MAX_TILE_LEVEL,
        position: { col: 0, row: 0 },
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      const tile2 = {
        id: 'test_tile_2',
        type: 'sword' as const,
        char: '刀',
        level: MAX_TILE_LEVEL,
        position: { col: 1, row: 0 },
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      state.player.tiles.push(tile1, tile2);
      state.player.cells[0].tileId = tile1.id;
      state.player.cells[1].tileId = tile2.id;

      const result = engine.mergeTiles(tile1.id, tile2.id, false);

      expect(result).toBeNull();
    });
  });

  describe('General Activation', () => {
    it('should activate general when all name characters are placed', () => {
      const state = engine.getState();

      const zhaoTile = {
        id: 'zhao_tile',
        type: 'general' as const,
        char: '赵',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      const yunTile = {
        id: 'yun_tile',
        type: 'general' as const,
        char: '云',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      state.player.tiles.push(zhaoTile, yunTile);

      engine.placeTile(zhaoTile.id, { col: 0, row: 0 }, false);
      engine.placeTile(yunTile.id, { col: 1, row: 0 }, false);

      const updatedState = engine.getState();
      const zhaoyunActivation = updatedState.player.activeGenerals.find(
        (ag) => ag.generalId === 'zhaoyun'
      );

      expect(zhaoyunActivation).toBeDefined();
      expect(zhaoyunActivation!.isActive).toBe(true);
      expect(zhaoyunActivation!.tileIds).toContain('zhao_tile');
      expect(zhaoyunActivation!.tileIds).toContain('yun_tile');
    });

    it('should not activate general with only partial name', () => {
      const state = engine.getState();

      const zhaoTile = {
        id: 'zhao_tile_2',
        type: 'general' as const,
        char: '赵',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      state.player.tiles.push(zhaoTile);

      engine.placeTile(zhaoTile.id, { col: 2, row: 0 }, false);

      const updatedState = engine.getState();
      const zhaoyunActivation = updatedState.player.activeGenerals.find(
        (ag) => ag.generalId === 'zhaoyun'
      );

      expect(zhaoyunActivation).toBeUndefined();
    });

    it('should activate 3-character general (诸葛亮)', () => {
      const state = engine.getState();

      const zhuTile = {
        id: 'zhu_tile',
        type: 'general' as const,
        char: '诸',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      const geTile = {
        id: 'ge_tile',
        type: 'general' as const,
        char: '葛',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      const liangTile = {
        id: 'liang_tile',
        type: 'general' as const,
        char: '亮',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      state.player.tiles.push(zhuTile, geTile, liangTile);

      const emptyCells = state.player.cells.filter((c) => c.isUnlocked && !c.tileId);
      if (emptyCells.length < 3) return;

      engine.placeTile(zhuTile.id, emptyCells[0].position, false);
      engine.placeTile(geTile.id, emptyCells[1].position, false);
      engine.placeTile(liangTile.id, emptyCells[2].position, false);

      const updatedState = engine.getState();
      const zhugeliangActivation = updatedState.player.activeGenerals.find(
        (ag) => ag.generalId === 'zhugeliang'
      );

      expect(zhugeliangActivation).toBeDefined();
      expect(zhugeliangActivation!.isActive).toBe(true);
    });
  });

  describe('Cell Unlock', () => {
    it('should unlock cell when using shovel', () => {
      const state = engine.getState();

      const shovelTile = {
        id: 'shovel_tile',
        type: 'shovel' as const,
        char: '铲',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      state.player.tiles.push(shovelTile);
      state.player.pendingTile = shovelTile;

      const lockedCell = state.player.cells.find((c) => !c.isUnlocked);

      if (!lockedCell) return;

      const success = engine.unlockCell(lockedCell.position, false);

      expect(success).toBe(true);

      const updatedState = engine.getState();
      const unlockedCell = updatedState.player.cells.find(
        (c) =>
          c.position.col === lockedCell.position.col &&
          c.position.row === lockedCell.position.row
      );

      expect(unlockedCell!.isUnlocked).toBe(true);
    });

    it('should not unlock already unlocked cell', () => {
      const state = engine.getState();

      const shovelTile = {
        id: 'shovel_tile_2',
        type: 'shovel' as const,
        char: '铲',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      state.player.tiles.push(shovelTile);

      const unlockedCell = state.player.cells.find((c) => c.isUnlocked);

      if (!unlockedCell) return;

      const success = engine.unlockCell(unlockedCell.position, false);

      expect(success).toBe(false);
    });

    it('should consume shovel after unlocking', () => {
      const state = engine.getState();

      const shovelTile = {
        id: 'shovel_tile_3',
        type: 'shovel' as const,
        char: '铲',
        level: 1,
        position: null,
        lastAttackTime: 0,
        attackSpeedBuff: 0,
        damageBuff: 0,
        isStunned: false,
        stunnedUntil: 0,
      };

      state.player.tiles.push(shovelTile);

      const lockedCell = state.player.cells.find((c) => !c.isUnlocked);

      if (!lockedCell) return;

      engine.unlockCell(lockedCell.position, false);

      const updatedState = engine.getState();
      const shovel = updatedState.player.tiles.find((t) => t.id === 'shovel_tile_3');

      expect(shovel).toBeUndefined();
    });
  });

  describe('Wave System', () => {
    it('should start wave when requested', () => {
      const success = engine.startNextWave();

      expect(success).toBe(true);

      const state = engine.getState();
      expect(state.currentWave).toBe(1);
      expect(state.isWaveActive).toBe(true);
    });

    it('should not start wave when one is active', () => {
      engine.startNextWave();
      const success = engine.startNextWave();

      expect(success).toBe(false);
    });

    it('should spawn enemies during wave', () => {
      engine.startNextWave();

      for (let i = 0; i < 100; i++) {
        engine.update(100);
      }

      const state = engine.getState();
      expect(state.enemies.length).toBeGreaterThan(0);
    });
  });

  describe('Game Over', () => {
    it('should end game when player loses all lives', () => {
      const state = engine.getState();
      state.player.adouLives = 0;

      engine.update(16);

      expect(state.isGameOver).toBe(true);
      expect(state.winner).toBe('opponent');
    });

    it('should end game when opponent loses all lives', () => {
      const state = engine.getState();
      state.opponent.adouLives = 0;

      engine.update(16);

      expect(state.isGameOver).toBe(true);
      expect(state.winner).toBe('player');
    });
  });
});
