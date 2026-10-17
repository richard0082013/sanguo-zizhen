import { SeededRandom } from '../utils/SeededRandom';
import { GAME_CONFIG } from '../config/gameConfig';
import { GENERALS, getAllGeneralChars } from '../config/generals';
import type { GeneralConfig } from '../config/generals';
import { ENEMIES, BOSSES } from '../config/enemies';
import { WAVES } from '../config/waves';
import type { WaveEnemy } from '../config/waves';
import {
  TILE_CONFIGS,
  SHOVEL_CONFIG,
  MAX_TILE_LEVEL,
  getTileDamage,
  getTileAttackSpeed,
} from '../config/tiles';
import type { TileType } from '../config/tiles';
import type {
  GameState,
  PlayerState,
  TileState,
  EnemyState,
  ProjectileState,
  CellState,
  GridPosition,
  Position,
  ActiveGeneralState,
  GameEvent,
} from './types';

type EventCallback = (event: GameEvent) => void;

export class BattleEngine {
  private state: GameState;
  private rng: SeededRandom;
  private opponentRng: SeededRandom;
  private eventListeners: EventCallback[] = [];
  private spawnQueue: { enemy: WaveEnemy; spawnTime: number; healthMultiplier: number }[] = [];
  private opponentSpawnQueue: { enemy: WaveEnemy; spawnTime: number; healthMultiplier: number }[] = [];
  private generalChars: string[] = [];
  private nextTileId = 0;
  private nextEnemyId = 0;
  private nextProjectileId = 0;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
    this.opponentRng = new SeededRandom(seed);
    this.generalChars = getAllGeneralChars();
    this.state = this.createInitialState(seed);
  }

  private createInitialState(seed: number): GameState {
    return {
      player: this.createPlayerState(),
      opponent: this.createPlayerState(),
      enemies: [],
      opponentEnemies: [],
      projectiles: [],
      opponentProjectiles: [],
      currentWave: 0,
      isWaveActive: false,
      waveStartTime: 0,
      gameTime: 0,
      isGameOver: false,
      winner: null,
      seed,
      isPaused: false,
    };
  }

  private createPlayerState(): PlayerState {
    const cells: CellState[] = [];
    const { gridCols, gridRows, initialUnlockedCells } = GAME_CONFIG;

    let unlockedCount = 0;
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const isUnlocked = unlockedCount < initialUnlockedCells;
        cells.push({
          position: { col, row },
          isUnlocked,
          tileId: null,
        });
        if (isUnlocked) unlockedCount++;
      }
    }

    return {
      buns: GAME_CONFIG.initialBuns,
      recruitCost: GAME_CONFIG.baseRecruitCost,
      recruitCount: 0,
      adouLives: GAME_CONFIG.adouLives,
      cells,
      tiles: [],
      activeGenerals: [],
      pendingTile: null,
    };
  }

  addEventListener(callback: EventCallback): void {
    this.eventListeners.push(callback);
  }

  removeEventListener(callback: EventCallback): void {
    this.eventListeners = this.eventListeners.filter((cb) => cb !== callback);
  }

  private emit(event: GameEvent): void {
    this.eventListeners.forEach((cb) => cb(event));
  }

  getState(): GameState {
    return this.state;
  }

  update(deltaTime: number): void {
    if (this.state.isGameOver || this.state.isPaused) return;

    this.state.gameTime += deltaTime;

    this.processSpawnQueues(deltaTime);
    this.updateEnemies(deltaTime, false);
    this.updateEnemies(deltaTime, true);
    this.updateTiles(deltaTime, false);
    this.updateTiles(deltaTime, true);
    this.updateProjectiles(deltaTime, false);
    this.updateProjectiles(deltaTime, true);
    this.updateGeneralSkills(deltaTime, false);
    this.updateGeneralSkills(deltaTime, true);
    this.updateAI(deltaTime);
    this.checkWaveComplete();
    this.checkGameOver();
  }

  private processSpawnQueues(_deltaTime: number): void {
    const now = this.state.gameTime;

    const spawnEnemy = (queue: typeof this.spawnQueue, isOpponent: boolean) => {
      const toSpawn = queue.filter((s) => s.spawnTime <= now);
      toSpawn.forEach((spawn) => {
        for (let i = 0; i < spawn.enemy.count; i++) {
          const delay = i * (WAVES[this.state.currentWave - 1]?.spawnInterval || 1000);
          if (spawn.spawnTime + delay <= now) {
            this.spawnEnemy(spawn.enemy.type, spawn.healthMultiplier, isOpponent);
            spawn.enemy.count--;
          }
        }
      });
      return queue.filter((s) => s.enemy.count > 0);
    };

    this.spawnQueue = spawnEnemy(this.spawnQueue, false);
    this.opponentSpawnQueue = spawnEnemy(this.opponentSpawnQueue, true);
  }

  private spawnEnemy(
    type: EnemyState['type'],
    healthMultiplier: number,
    isOpponent: boolean
  ): void {
    const config = ENEMIES[type];
    const startPos = GAME_CONFIG.pathPoints[0];

    const enemy: EnemyState = {
      id: `enemy_${this.nextEnemyId++}`,
      type,
      char: config.char,
      health: Math.floor(config.health * healthMultiplier),
      maxHealth: Math.floor(config.health * healthMultiplier),
      speed: config.speed,
      position: { ...startPos },
      pathIndex: 0,
      pathProgress: 0,
      damage: config.damage,
      rangedResist: config.rangedResist,
      meleeResist: config.meleeResist,
      reward: config.reward,
      color: config.color,
      isBoss: false,
      lastAbilityTime: 0,
      isSlowed: false,
      slowedUntil: 0,
      isBurning: false,
      burnDamage: 0,
      burnUntil: 0,
    };

    if (isOpponent) {
      this.state.opponentEnemies.push(enemy);
    } else {
      this.state.enemies.push(enemy);
    }
  }

  private spawnBoss(bossId: string, isOpponent: boolean): void {
    const boss = BOSSES.find((b) => b.id === bossId);
    if (!boss) return;

    const startPos = GAME_CONFIG.pathPoints[0];

    const enemy: EnemyState = {
      id: `enemy_${this.nextEnemyId++}`,
      type: 'boss',
      char: boss.char,
      health: boss.health,
      maxHealth: boss.health,
      speed: boss.speed,
      position: { ...startPos },
      pathIndex: 0,
      pathProgress: 0,
      damage: 3,
      rangedResist: 0.3,
      meleeResist: 0.3,
      reward: 50,
      color: boss.color,
      isBoss: true,
      bossId: boss.id,
      lastAbilityTime: 0,
      isSlowed: false,
      slowedUntil: 0,
      isBurning: false,
      burnDamage: 0,
      burnUntil: 0,
    };

    if (isOpponent) {
      this.state.opponentEnemies.push(enemy);
    } else {
      this.state.enemies.push(enemy);
    }
  }

  private updateEnemies(deltaTime: number, isOpponent: boolean): void {
    const enemies = isOpponent ? this.state.opponentEnemies : this.state.enemies;
    const player = isOpponent ? this.state.opponent : this.state.player;
    const now = this.state.gameTime;

    const toRemove: string[] = [];

    enemies.forEach((enemy) => {
      if (enemy.isSlowed && now >= enemy.slowedUntil) {
        enemy.isSlowed = false;
      }

      if (enemy.isBurning) {
        if (now >= enemy.burnUntil) {
          enemy.isBurning = false;
        } else {
          enemy.health -= (enemy.burnDamage * deltaTime) / 1000;
        }
      }

      if (enemy.health <= 0) {
        player.buns += enemy.reward;
        this.emit({ type: 'ENEMY_KILLED', enemyId: enemy.id, reward: enemy.reward, isOpponent });
        toRemove.push(enemy.id);
        return;
      }

      const speedMultiplier = enemy.isSlowed ? 0.5 : 1;
      const moveDistance = enemy.speed * speedMultiplier * (deltaTime / 1000);

      this.moveEnemyAlongPath(enemy, moveDistance);

      if (enemy.pathIndex >= GAME_CONFIG.pathPoints.length - 1) {
        player.adouLives -= enemy.damage;
        this.emit({
          type: 'ENEMY_REACHED_END',
          enemyId: enemy.id,
          damage: enemy.damage,
          isOpponent,
        });
        toRemove.push(enemy.id);
      }

      if (enemy.isBoss && enemy.bossId) {
        this.updateBossAbility(enemy, player, isOpponent);
      }
    });

    if (isOpponent) {
      this.state.opponentEnemies = enemies.filter((e) => !toRemove.includes(e.id));
    } else {
      this.state.enemies = enemies.filter((e) => !toRemove.includes(e.id));
    }
  }

  private moveEnemyAlongPath(enemy: EnemyState, distance: number): void {
    const path = GAME_CONFIG.pathPoints;

    while (distance > 0 && enemy.pathIndex < path.length - 1) {
      const current = path[enemy.pathIndex];
      const next = path[enemy.pathIndex + 1];

      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      const remainingInSegment = segmentLength - enemy.pathProgress;

      if (distance >= remainingInSegment) {
        enemy.pathIndex++;
        enemy.pathProgress = 0;
        distance -= remainingInSegment;
        enemy.position = { ...next };
      } else {
        enemy.pathProgress += distance;
        const t = enemy.pathProgress / segmentLength;
        enemy.position.x = current.x + dx * t;
        enemy.position.y = current.y + dy * t;
        distance = 0;
      }
    }
  }

  private updateBossAbility(enemy: EnemyState, player: PlayerState, _isOpponent: boolean): void {
    const boss = BOSSES.find((b) => b.id === enemy.bossId);
    if (!boss || !boss.ability.cooldown) return;

    const now = this.state.gameTime;
    if (now - enemy.lastAbilityTime < boss.ability.cooldown) return;

    enemy.lastAbilityTime = now;

    if (boss.ability.type === 'stun') {
      player.tiles.forEach((tile) => {
        if (!tile.position) return;
        const tilePos = this.gridToWorld(tile.position);
        const dist = this.distance(tilePos, enemy.position);
        if (dist <= (boss.ability.radius || 100)) {
          tile.isStunned = true;
          tile.stunnedUntil = now + (boss.ability.duration || 1500);
        }
      });
    }
  }

  private updateTiles(_deltaTime: number, isOpponent: boolean): void {
    const player = isOpponent ? this.state.opponent : this.state.player;
    const enemies = isOpponent ? this.state.opponentEnemies : this.state.enemies;
    const projectiles = isOpponent ? this.state.opponentProjectiles : this.state.projectiles;
    const now = this.state.gameTime;

    player.tiles.forEach((tile) => {
      if (!tile.position) return;

      if (tile.isStunned && now >= tile.stunnedUntil) {
        tile.isStunned = false;
      }

      if (tile.isStunned) return;

      if (tile.type === 'shovel' || tile.type === 'general') return;

      const config = TILE_CONFIGS[tile.type];
      const attackSpeed = getTileAttackSpeed(tile.type, tile.level) * (1 - tile.attackSpeedBuff);

      if (now - tile.lastAttackTime < attackSpeed) return;

      const tilePos = this.gridToWorld(tile.position);
      const target = this.findTarget(tilePos, config.attackRange * (1 + (tile.level - 1) * 0.2), enemies);

      if (!target) return;

      tile.lastAttackTime = now;

      const damage = Math.floor(
        getTileDamage(tile.type, tile.level) * (1 + tile.damageBuff) *
          (1 - (config.isRanged ? target.rangedResist : target.meleeResist))
      );

      if (config.isRanged) {
        const projectile: ProjectileState = {
          id: `proj_${this.nextProjectileId++}`,
          fromTileId: tile.id,
          targetEnemyId: target.id,
          position: { ...tilePos },
          targetPosition: { ...target.position },
          damage,
          isRanged: true,
          speed: 300,
        };
        projectiles.push(projectile);
      } else {
        target.health -= damage;
        this.emit({
          type: 'PROJECTILE_HIT',
          projectileId: '',
          enemyId: target.id,
          damage,
          isOpponent,
        });
      }
    });
  }

  private findTarget(
    position: Position,
    range: number,
    enemies: EnemyState[]
  ): EnemyState | null {
    let closest: EnemyState | null = null;
    let closestDist = Infinity;

    enemies.forEach((enemy) => {
      const dist = this.distance(position, enemy.position);
      if (dist <= range && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    });

    return closest;
  }

  private updateProjectiles(deltaTime: number, isOpponent: boolean): void {
    const projectiles = isOpponent ? this.state.opponentProjectiles : this.state.projectiles;
    const enemies = isOpponent ? this.state.opponentEnemies : this.state.enemies;

    const toRemove: string[] = [];

    projectiles.forEach((proj) => {
      const target = enemies.find((e) => e.id === proj.targetEnemyId);
      if (!target) {
        toRemove.push(proj.id);
        return;
      }

      proj.targetPosition = { ...target.position };

      const dx = proj.targetPosition.x - proj.position.x;
      const dy = proj.targetPosition.y - proj.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) {
        target.health -= proj.damage;
        this.emit({
          type: 'PROJECTILE_HIT',
          projectileId: proj.id,
          enemyId: target.id,
          damage: proj.damage,
          isOpponent,
        });
        toRemove.push(proj.id);
        return;
      }

      const moveSpeed = proj.speed * (deltaTime / 1000);
      proj.position.x += (dx / dist) * moveSpeed;
      proj.position.y += (dy / dist) * moveSpeed;
    });

    if (isOpponent) {
      this.state.opponentProjectiles = projectiles.filter((p) => !toRemove.includes(p.id));
    } else {
      this.state.projectiles = projectiles.filter((p) => !toRemove.includes(p.id));
    }
  }

  private updateGeneralSkills(_deltaTime: number, isOpponent: boolean): void {
    const player = isOpponent ? this.state.opponent : this.state.player;
    const enemies = isOpponent ? this.state.opponentEnemies : this.state.enemies;
    const now = this.state.gameTime;

    player.activeGenerals.forEach((ag) => {
      if (!ag.isActive) return;

      const general = GENERALS.find((g) => g.id === ag.generalId);
      if (!general || general.cooldown === 0) return;

      if (now - ag.lastSkillTime < general.cooldown) return;

      ag.lastSkillTime = now;
      this.useGeneralSkill(general, ag, player, enemies, isOpponent);
      this.emit({ type: 'GENERAL_SKILL_USED', generalId: ag.generalId, isOpponent });
    });
  }

  private useGeneralSkill(
    general: GeneralConfig,
    activeGeneral: ActiveGeneralState,
    player: PlayerState,
    enemies: EnemyState[],
    _isOpponent: boolean
  ): void {
    const firstTile = player.tiles.find((t) => t.id === activeGeneral.tileIds[0]);
    if (!firstTile?.position) return;

    const tilePos = this.gridToWorld(firstTile.position);
    const effect = general.skillEffect;

    switch (effect.type) {
      case 'damage':
        if (effect.piercing) {
          enemies.forEach((e) => {
            if (Math.abs(e.position.y - tilePos.y) < 50) {
              e.health -= effect.damage || 0;
            }
          });
        } else if (effect.radius) {
          enemies.forEach((e) => {
            if (this.distance(e.position, tilePos) <= effect.radius!) {
              e.health -= effect.damage || 0;
            }
          });
        }
        break;

      case 'stun':
        enemies.forEach((e) => {
          if (this.distance(e.position, tilePos) <= (effect.radius || 100)) {
            e.isSlowed = true;
            e.slowedUntil = this.state.gameTime + (effect.duration || 1000);
          }
        });
        break;

      case 'aoe':
        enemies.forEach((e) => {
          if (this.distance(e.position, tilePos) <= (effect.radius || 100)) {
            e.health -= effect.damage || 0;
          }
        });
        break;

      case 'buff':
        player.tiles.forEach((tile) => {
          if (!tile.position) return;
          const pos = this.gridToWorld(tile.position);
          if (this.distance(pos, tilePos) <= (effect.radius || 80)) {
            if (effect.buffType === 'attackSpeed') {
              tile.attackSpeedBuff = effect.buffValue || 0;
              setTimeout(() => {
                tile.attackSpeedBuff = 0;
              }, effect.duration || 5000);
            }
          }
        });
        break;

      case 'burn':
        enemies.forEach((e) => {
          if (this.distance(e.position, tilePos) <= (effect.radius || 60)) {
            e.isBurning = true;
            e.burnDamage = effect.damage || 30;
            e.burnUntil = this.state.gameTime + (effect.duration || 3000);
          }
        });
        break;

      case 'taunt':
        enemies.forEach((e) => {
          if (this.distance(e.position, tilePos) <= (effect.radius || 80)) {
            e.isSlowed = true;
            e.slowedUntil = this.state.gameTime + (effect.duration || 2000);
          }
        });
        break;

      case 'economy':
        break;
    }
  }

  private updateAI(_deltaTime: number): void {
    const opponent = this.state.opponent;

    if (
      this.opponentRng.next() < 0.02 &&
      opponent.buns >= opponent.recruitCost
    ) {
      this.recruit(true);
    }

    if (opponent.pendingTile) {
      const emptyCells = opponent.cells.filter((c) => c.isUnlocked && !c.tileId);
      if (emptyCells.length > 0) {
        const cell = this.opponentRng.pick(emptyCells);
        if (opponent.pendingTile.type === 'shovel') {
          const lockedCells = opponent.cells.filter((c) => !c.isUnlocked);
          if (lockedCells.length > 0) {
            this.unlockCell(lockedCells[0].position, true);
          }
          opponent.pendingTile = null;
        } else {
          this.placeTile(opponent.pendingTile.id, cell.position, true);
        }
      }
    }

    if (this.opponentRng.next() < 0.01) {
      const tilesOnBoard = opponent.tiles.filter((t) => t.position !== null);
      const mergeable = this.findMergeableTiles(tilesOnBoard);
      if (mergeable) {
        this.mergeTiles(mergeable.tile1.id, mergeable.tile2.id, true);
      }
    }
  }

  private findMergeableTiles(
    tiles: TileState[]
  ): { tile1: TileState; tile2: TileState } | null {
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (
          tiles[i].type === tiles[j].type &&
          tiles[i].char === tiles[j].char &&
          tiles[i].level === tiles[j].level &&
          tiles[i].level < MAX_TILE_LEVEL
        ) {
          return { tile1: tiles[i], tile2: tiles[j] };
        }
      }
    }
    return null;
  }

  private checkWaveComplete(): void {
    if (!this.state.isWaveActive) return;

    const playerDone =
      this.state.enemies.length === 0 && this.spawnQueue.length === 0;
    const opponentDone =
      this.state.opponentEnemies.length === 0 && this.opponentSpawnQueue.length === 0;

    const currentWaveConfig = WAVES[this.state.currentWave - 1];
    if (!currentWaveConfig) return;

    const noMoreSpawns =
      this.spawnQueue.every((s) => s.enemy.count === 0) &&
      this.opponentSpawnQueue.every((s) => s.enemy.count === 0);

    if (playerDone && opponentDone && noMoreSpawns) {
      this.state.isWaveActive = false;
      this.emit({ type: 'WAVE_COMPLETED', waveNumber: this.state.currentWave });

      const caocaoPlayer = this.state.player.activeGenerals.find(
        (ag) => ag.generalId === 'caocao' && ag.isActive
      );
      if (caocaoPlayer) {
        this.state.player.buns += 5;
      }

      const caocaoOpponent = this.state.opponent.activeGenerals.find(
        (ag) => ag.generalId === 'caocao' && ag.isActive
      );
      if (caocaoOpponent) {
        this.state.opponent.buns += 5;
      }
    }
  }

  private checkGameOver(): void {
    if (this.state.player.adouLives <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'opponent';
      this.emit({ type: 'GAME_OVER', winner: 'opponent' });
    } else if (this.state.opponent.adouLives <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'player';
      this.emit({ type: 'GAME_OVER', winner: 'player' });
    } else if (
      this.state.currentWave >= WAVES.length &&
      !this.state.isWaveActive
    ) {
      const playerLives = this.state.player.adouLives;
      const opponentLives = this.state.opponent.adouLives;
      this.state.isGameOver = true;
      this.state.winner = playerLives > opponentLives ? 'player' : 'opponent';
      this.emit({ type: 'GAME_OVER', winner: this.state.winner });
    }
  }

  startNextWave(): boolean {
    if (this.state.isWaveActive || this.state.isGameOver) return false;
    if (this.state.currentWave >= WAVES.length) return false;

    this.state.currentWave++;
    this.state.isWaveActive = true;
    this.state.waveStartTime = this.state.gameTime;

    const wave = WAVES[this.state.currentWave - 1];
    this.emit({ type: 'WAVE_STARTED', waveNumber: this.state.currentWave });

    if (wave.isBossWave && wave.boss) {
      this.spawnBoss(wave.boss.id, false);
      this.spawnBoss(wave.boss.id, true);
    } else {
      wave.enemies.forEach((enemy) => {
        this.spawnQueue.push({
          enemy: { ...enemy },
          spawnTime: this.state.gameTime + enemy.delay,
          healthMultiplier: enemy.healthMultiplier || 1,
        });
        this.opponentSpawnQueue.push({
          enemy: { ...enemy },
          spawnTime: this.state.gameTime + enemy.delay,
          healthMultiplier: enemy.healthMultiplier || 1,
        });
      });
    }

    return true;
  }

  recruit(isOpponent: boolean): TileState | null {
    const player = isOpponent ? this.state.opponent : this.state.player;
    const rng = isOpponent ? this.opponentRng : this.rng;

    if (player.buns < player.recruitCost) return null;

    player.buns -= player.recruitCost;
    player.recruitCount++;
    player.recruitCost = Math.min(
      GAME_CONFIG.maxRecruitCost,
      GAME_CONFIG.baseRecruitCost + player.recruitCount * GAME_CONFIG.recruitCostIncrement
    );

    const weights = GAME_CONFIG.recruitWeights;
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = rng.next() * totalWeight;

    let selectedType: TileType = 'sword';
    let char = '';

    for (const [type, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) {
        selectedType = type as TileType;
        break;
      }
    }

    if (selectedType === 'general') {
      char = rng.pick(this.generalChars);
    } else if (selectedType === 'shovel') {
      char = SHOVEL_CONFIG.char;
    } else {
      char = TILE_CONFIGS[selectedType].char;
    }

    const tile: TileState = {
      id: `tile_${this.nextTileId++}`,
      type: selectedType,
      char,
      level: 1,
      position: null,
      lastAttackTime: 0,
      attackSpeedBuff: 0,
      damageBuff: 0,
      isStunned: false,
      stunnedUntil: 0,
    };

    player.tiles.push(tile);
    player.pendingTile = tile;

    this.emit({ type: 'RECRUIT', tileType: selectedType, char, isOpponent });

    return tile;
  }

  placeTile(tileId: string, position: GridPosition, isOpponent: boolean): boolean {
    const player = isOpponent ? this.state.opponent : this.state.player;

    const tile = player.tiles.find((t) => t.id === tileId);
    if (!tile) return false;

    const cell = player.cells.find(
      (c) => c.position.col === position.col && c.position.row === position.row
    );
    if (!cell || !cell.isUnlocked || cell.tileId !== null) return false;

    if (tile.type === 'shovel') {
      return false;
    }

    tile.position = position;
    cell.tileId = tileId;

    if (player.pendingTile?.id === tileId) {
      player.pendingTile = null;
    }

    this.emit({ type: 'TILE_PLACED', tileId, position, isOpponent });

    this.checkGeneralActivation(player, isOpponent);

    return true;
  }

  unlockCell(position: GridPosition, isOpponent: boolean): boolean {
    const player = isOpponent ? this.state.opponent : this.state.player;

    const cell = player.cells.find(
      (c) => c.position.col === position.col && c.position.row === position.row
    );
    if (!cell || cell.isUnlocked) return false;

    const hasShovel = player.tiles.some(
      (t) => t.type === 'shovel' && t.position === null
    );
    if (!hasShovel) return false;

    const shovelTile = player.tiles.find(
      (t) => t.type === 'shovel' && t.position === null
    );
    if (shovelTile) {
      player.tiles = player.tiles.filter((t) => t.id !== shovelTile.id);
      if (player.pendingTile?.id === shovelTile.id) {
        player.pendingTile = null;
      }
    }

    cell.isUnlocked = true;
    this.emit({ type: 'CELL_UNLOCKED', position, isOpponent });

    return true;
  }

  mergeTiles(tile1Id: string, tile2Id: string, isOpponent: boolean): TileState | null {
    const player = isOpponent ? this.state.opponent : this.state.player;

    const tile1 = player.tiles.find((t) => t.id === tile1Id);
    const tile2 = player.tiles.find((t) => t.id === tile2Id);

    if (!tile1 || !tile2) return null;
    if (tile1.type !== tile2.type) return null;
    if (tile1.char !== tile2.char) return null;
    if (tile1.level !== tile2.level) return null;
    if (tile1.level >= MAX_TILE_LEVEL) return null;

    const newTile: TileState = {
      id: `tile_${this.nextTileId++}`,
      type: tile1.type,
      char: tile1.char,
      level: tile1.level + 1,
      position: tile1.position || tile2.position,
      generalId: tile1.generalId,
      lastAttackTime: 0,
      attackSpeedBuff: 0,
      damageBuff: 0,
      isStunned: false,
      stunnedUntil: 0,
    };

    if (tile1.position) {
      const cell = player.cells.find(
        (c) =>
          c.position.col === tile1.position!.col &&
          c.position.row === tile1.position!.row
      );
      if (cell) cell.tileId = newTile.id;
    }

    if (tile2.position) {
      const cell = player.cells.find(
        (c) =>
          c.position.col === tile2.position!.col &&
          c.position.row === tile2.position!.row
      );
      if (cell) cell.tileId = null;
    }

    player.tiles = player.tiles.filter(
      (t) => t.id !== tile1Id && t.id !== tile2Id
    );
    player.tiles.push(newTile);

    this.emit({
      type: 'TILES_MERGED',
      tile1Id,
      tile2Id,
      newTileId: newTile.id,
      isOpponent,
    });

    this.checkGeneralActivation(player, isOpponent);

    return newTile;
  }

  private checkGeneralActivation(player: PlayerState, isOpponent: boolean): void {
    const placedGeneralTiles = player.tiles.filter(
      (t) => t.type === 'general' && t.position !== null
    );

    for (const general of GENERALS) {
      const existingActivation = player.activeGenerals.find(
        (ag) => ag.generalId === general.id
      );
      if (existingActivation?.isActive) continue;

      const matchingTiles: TileState[] = [];
      let matched = true;

      for (const char of general.chars) {
        const tile = placedGeneralTiles.find(
          (t) =>
            t.char === char &&
            !matchingTiles.includes(t) &&
            !player.activeGenerals.some(
              (ag) => ag.isActive && ag.tileIds.includes(t.id)
            )
        );
        if (tile) {
          matchingTiles.push(tile);
        } else {
          matched = false;
          break;
        }
      }

      if (matched && matchingTiles.length === general.chars.length) {
        const activation: ActiveGeneralState = {
          generalId: general.id,
          tileIds: matchingTiles.map((t) => t.id),
          lastSkillTime: 0,
          isActive: true,
        };

        matchingTiles.forEach((t) => (t.generalId = general.id));
        player.activeGenerals.push(activation);

        this.emit({
          type: 'GENERAL_ACTIVATED',
          generalId: general.id,
          tileIds: activation.tileIds,
          isOpponent,
        });
      }
    }
  }

  private gridToWorld(pos: GridPosition): Position {
    return {
      x: GAME_CONFIG.gridStartX + pos.col * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2,
      y: GAME_CONFIG.gridStartY + pos.row * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2,
    };
  }

  private distance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  canRecruit(isOpponent: boolean): boolean {
    const player = isOpponent ? this.state.opponent : this.state.player;
    return player.buns >= player.recruitCost;
  }

  getRecruitCost(isOpponent: boolean): number {
    const player = isOpponent ? this.state.opponent : this.state.player;
    return player.recruitCost;
  }

  pause(): void {
    this.state.isPaused = true;
  }

  resume(): void {
    this.state.isPaused = false;
  }
}
