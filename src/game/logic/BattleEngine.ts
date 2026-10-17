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
  getTileRange,
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
  private playerRng: SeededRandom;
  private opponentRng: SeededRandom;
  private eventListeners: EventCallback[] = [];
  private spawnQueue: { enemy: WaveEnemy; spawnTime: number; healthMultiplier: number; spawnIndex: number }[] = [];
  private generalChars: string[] = [];
  private nextAITime = 0;
  private nextIncomeTime = 1000;
  private nextTileId = 0;
  private nextEnemyId = 0;
  private nextProjectileId = 0;

  constructor(seed: number) {
    this.playerRng = new SeededRandom(seed);
    this.opponentRng = new SeededRandom(seed + 1);
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
    const { gridCols, gridRows, pathCells } = GAME_CONFIG;

    const pathSet = new Set(pathCells.map((p) => `${p.col},${p.row}`));

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const isPath = pathSet.has(`${col},${row}`);
        cells.push({
          position: { col, row },
          isUnlocked: !isPath,
          tileId: null,
          isPath,
        });
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
      holdingSlots: new Array(GAME_CONFIG.holdingSlots).fill(null),
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

    if (this.state.gameTime >= this.nextIncomeTime) {
      this.state.player.buns = Math.min(GAME_CONFIG.bunsCapacity, this.state.player.buns + GAME_CONFIG.incomePerSecond);
      this.state.opponent.buns = Math.min(GAME_CONFIG.bunsCapacity, this.state.opponent.buns + GAME_CONFIG.incomePerSecond);
      this.nextIncomeTime = this.state.gameTime + 1000;
    }
    this.processSpawnQueues();
    this.updateEnemies(deltaTime, false);
    this.updateEnemies(deltaTime, true);
    this.updateTiles(false);
    this.updateTiles(true);
    this.updateProjectiles(deltaTime, false);
    this.updateProjectiles(deltaTime, true);
    this.updateGeneralSkills(false);
    this.updateGeneralSkills(true);
    this.updateAI();
    this.checkWaveComplete();
    this.checkGameOver();
  }

  private processSpawnQueues(): void {
    const now = this.state.gameTime;
    const wave = WAVES[this.state.currentWave - 1];
    if (!wave) return;

    // One schedule emits an independent enemy for each board on the same tick.
    this.spawnQueue.forEach((spawn) => {
      while (spawn.enemy.count > 0 && spawn.spawnTime + spawn.spawnIndex * wave.spawnInterval <= now) {
        this.spawnEnemy(spawn.enemy.type, spawn.healthMultiplier, false);
        this.spawnEnemy(spawn.enemy.type, spawn.healthMultiplier, true);
        spawn.enemy.count--;
        spawn.spawnIndex++;
      }
    });
    this.spawnQueue = this.spawnQueue.filter(spawn => spawn.enemy.count > 0);
  }

  private spawnEnemy(
    type: EnemyState['type'],
    healthMultiplier: number,
    isOpponent: boolean
  ): void {
    const config = ENEMIES[type];
    const pathCells = GAME_CONFIG.pathCells;
    const startCell = pathCells[0];
    const startPos = this.cellToWorld(startCell, isOpponent);

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
      reward: config.reward + Math.min(2, Math.floor((this.state.currentWave - 1) / 3)),
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

    const pathCells = GAME_CONFIG.pathCells;
    const startCell = pathCells[0];
    const startPos = this.cellToWorld(startCell, isOpponent);

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
      reward: 12,
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

    this.emit({ type: 'BOSS_SPAWN', bossId, isOpponent });
  }

  private updateEnemies(deltaTime: number, isOpponent: boolean): void {
    const enemies = isOpponent ? this.state.opponentEnemies : this.state.enemies;
    const player = isOpponent ? this.state.opponent : this.state.player;
    const pathCells = GAME_CONFIG.pathCells;
    const now = this.state.gameTime;

    const toRemove: string[] = [];

    enemies.forEach((enemy) => {
      if (enemy.isSlowed && now >= enemy.slowedUntil) {
        enemy.isSlowed = false;
      }

      if (enemy.poisonedUntil && now < enemy.poisonedUntil) enemy.health -= (enemy.poisonDamage || 0) * deltaTime / 1000;
      if (enemy.isBurning) {
        if (now >= enemy.burnUntil) {
          enemy.isBurning = false;
        } else {
          enemy.health -= (enemy.burnDamage * deltaTime) / 1000;
        }
      }

      if (enemy.health <= 0) {
        player.buns = Math.min(GAME_CONFIG.bunsCapacity, player.buns + enemy.reward);
        this.emit({
          type: 'ENEMY_KILLED',
          enemyId: enemy.id,
          reward: enemy.reward,
          isOpponent,
          position: { ...enemy.position },
        });
        toRemove.push(enemy.id);
        return;
      }

      const speedMultiplier = (enemy.frozenUntil || 0) > now ? 0 : enemy.isSlowed ? 0.5 : 1;
      const moveDistance = enemy.speed * speedMultiplier * (deltaTime / 1000);

      this.moveEnemyAlongPath(enemy, moveDistance, pathCells, isOpponent);

      if (enemy.pathIndex >= pathCells.length - 1) {
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

  private moveEnemyAlongPath(
    enemy: EnemyState,
    distance: number,
    pathCells: GridPosition[],
    isOpponent: boolean
  ): void {
    const cellSize = GAME_CONFIG.cellSize * (isOpponent ? GAME_CONFIG.opponentBoardScale : 1);

    while (distance > 0 && enemy.pathIndex < pathCells.length - 1) {
      const current = this.cellToWorld(pathCells[enemy.pathIndex], isOpponent);
      const next = this.cellToWorld(pathCells[enemy.pathIndex + 1], isOpponent);

      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy) || cellSize;

      const remainingInSegment = segmentLength * (1 - enemy.pathProgress);

      if (distance >= remainingInSegment) {
        enemy.pathIndex++;
        enemy.pathProgress = 0;
        distance -= remainingInSegment;
        enemy.position = { ...next };
      } else {
        enemy.pathProgress += distance / segmentLength;
        const t = enemy.pathProgress;
        enemy.position.x = current.x + dx * t;
        enemy.position.y = current.y + dy * t;
        distance = 0;
      }
    }
  }

  private updateBossAbility(enemy: EnemyState, player: PlayerState, isOpponent: boolean): void {
    const boss = BOSSES.find((b) => b.id === enemy.bossId);
    if (!boss || !boss.ability.cooldown) return;

    const now = this.state.gameTime;
    if (now - enemy.lastAbilityTime < boss.ability.cooldown) return;

    enemy.lastAbilityTime = now;

    if (boss.ability.type === 'stun') {
      player.tiles.forEach((tile) => {
        if (!tile.position) return;
        const tilePos = this.gridToWorld(tile.position, isOpponent);
        const dist = this.distance(tilePos, enemy.position);
        if (dist <= (boss.ability.radius || 100)) {
          tile.isStunned = true;
          tile.stunnedUntil = now + (boss.ability.duration || 1500);
          this.emit({
            type: 'TILE_STUNNED',
            tileId: tile.id,
            duration: boss.ability.duration || 1500,
            isOpponent,
          });
        }
      });
    }
  }

  private updateTiles(isOpponent: boolean): void {
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
      if (tile.buffUntil && now >= tile.buffUntil) { tile.attackSpeedBuff = 0; tile.damageBuff = 0; }
      if (tile.type === 'shovel' || (tile.type === 'general' && !tile.generalId)) return;
      if (tile.type === 'general') {
        if (now - tile.lastAttackTime >= 850) {
          const from = this.gridToWorld(tile.position, isOpponent);
          const target = this.findTarget(from, getTileRange(tile.type, tile.generalId), enemies);
          if (target) { tile.lastAttackTime = now; target.health -= 48; this.emit({type:'TILE_ATTACK', tileId:tile.id, targetId:target.id, damage:48, isRanged:true, isOpponent, fromPos:from, toPos:{...target.position}, tileType:tile.type, level:5}); }
        }
        return;
      }
      if (tile.weapon && now - (tile.lastWeaponTime || 0) >= 5500 && enemies.length) {
        tile.lastWeaponTime = now;
        const targets = enemies.filter(e => e.health > 0).slice(0, tile.weapon === 'thunder' ? 4 : 9);
        this.applyWeaponEffect(tile, targets);
        this.emit({type:'WEAPON_USED', weapon:tile.weapon, tileId:tile.id, isOpponent, position:this.gridToWorld(tile.position,isOpponent), targets:targets.map(e=>({...e.position}))});
      }

      const config = TILE_CONFIGS[tile.type];
      const attackSpeed = getTileAttackSpeed(tile.type, tile.level) * (1 - tile.attackSpeedBuff);

      if (now - tile.lastAttackTime < attackSpeed) return;

      const tilePos = this.gridToWorld(tile.position, isOpponent);
      const range = getTileRange(tile.type);
      const target = this.findTarget(tilePos, range, enemies);

      if (!target) return;

      tile.lastAttackTime = now;

      const damage = Math.floor(
        getTileDamage(tile.type, tile.level) *
          (1 + tile.damageBuff) *
          (1 - (config.isRanged ? target.rangedResist : target.meleeResist))
      );

      this.emit({
        type: 'TILE_ATTACK',
        tileId: tile.id,
        targetId: target.id,
        damage,
        isRanged: config.isRanged,
        isOpponent,
        fromPos: { ...tilePos },
        toPos: { ...target.position },
        tileType: tile.type,
        level: tile.level,
      });

      if (config.isRanged) {
        const projectile: ProjectileState = {
          id: `proj_${this.nextProjectileId++}`,
          fromTileId: tile.id,
          targetEnemyId: target.id,
          position: { ...tilePos },
          targetPosition: { ...target.position },
          damage,
          isRanged: true,
          speed: GAME_CONFIG.animation.projectileSpeed,
          tileType: tile.type,
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
          position: { ...target.position },
        });
      }
    });
  }

  private findTarget(position: Position, range: number, enemies: EnemyState[]): EnemyState | null {
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

      if (dist <= Math.max(8, proj.speed * deltaTime / 1000)) {
        target.health -= proj.damage;
        this.emit({
          type: 'PROJECTILE_HIT',
          projectileId: proj.id,
          enemyId: target.id,
          damage: proj.damage,
          isOpponent,
          position: { ...target.position },
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

  private updateGeneralSkills(isOpponent: boolean): void {
    const player = isOpponent ? this.state.opponent : this.state.player;
    const enemies = isOpponent ? this.state.opponentEnemies : this.state.enemies;
    const now = this.state.gameTime;

    player.activeGenerals.forEach((ag) => {
      if (!ag.isActive || !enemies.some(e=>e.health > 0)) return;
      const caster = player.tiles.find(t=>t.id===ag.tileIds[0]);
      if (!caster?.position || caster.isStunned) return;

      const general = GENERALS.find((g) => g.id === ag.generalId);
      if (!general || general.cooldown === 0) return;

      if (now - ag.lastSkillTime < general.cooldown) return;

      ag.lastSkillTime = now;
      this.useGeneralSkill(general, ag, player, enemies, isOpponent);
      this.emit({ type: 'GENERAL_SKILL_USED', generalId: ag.generalId, isOpponent, position:this.gridToWorld(caster.position,isOpponent), targets:enemies.slice(0,9).map(e=>({...e.position})) });
    });
  }

  private useGeneralSkill(
    general: GeneralConfig,
    activeGeneral: ActiveGeneralState,
    player: PlayerState,
    enemies: EnemyState[],
    isOpponent: boolean
  ): void {
    const firstTile = player.tiles.find((t) => t.id === activeGeneral.tileIds[0]);
    if (!firstTile?.position) return;

    const tilePos = this.gridToWorld(firstTile.position, isOpponent);
    const effect = general.skillEffect;

    if (general.id === 'zhugeliang') { enemies.slice(0,6).forEach(e=>{ e.health -= 110; e.isSlowed=true; e.slowedUntil=this.state.gameTime+2000; }); return; }
    if (general.id === 'huangzhong') { enemies.slice(0,8).forEach(e=>e.health-=80); return; }
    switch (effect.type) {
      case 'summon':
        enemies.slice(0,5).forEach(e=>e.health -= 85);
        player.tiles.filter(t=>t.position).forEach(t=>{t.damageBuff=0.35;t.buffUntil=this.state.gameTime+3500;});
        break;
      case 'damage':
        if (effect.piercing) {
          enemies.forEach((e) => {
            if (this.distance(e.position, tilePos) < 260) {
              e.health -= effect.damage || 0;
            }
          });
        } else if (effect.radius) {
          enemies.forEach((e) => {
            if (this.distance(e.position, tilePos) <= effect.radius!) {
              e.health -= effect.damage || 0;
            }
          });
        } else {
          const target = this.findTarget(tilePos, general.attackRange, enemies);
          if (target) target.health -= effect.damage || 0;
        }
        break;

      case 'stun':
        enemies.forEach((e) => {
          if (this.distance(e.position, tilePos) <= (effect.radius || 100)) {
            e.frozenUntil = this.state.gameTime + (effect.duration || 1000);
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
          const pos = this.gridToWorld(tile.position, isOpponent);
          if (this.distance(pos, tilePos) <= (effect.radius || 80)) {
            if (effect.buffType === 'attackSpeed') {
              tile.attackSpeedBuff = effect.buffValue || 0;
              tile.buffUntil = this.state.gameTime + (effect.duration || 4000);
            }
          }
        });
        break;

      case 'burn':
        enemies.forEach((e) => {
          if (general.id === 'zhouyu' || this.distance(e.position, tilePos) <= (effect.radius || 60)) {
            // Fire attack applies an initial impact and lingering burn.
            e.health -= (effect.damage || 30) * 2;
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
    }
  }

  private updateAI(): void {
    const opponent = this.state.opponent;
    if (this.state.gameTime < this.nextAITime) return;
    this.nextAITime = this.state.gameTime + 450;

    if (opponent.cells.some(c => !c.isPath && !c.tileId) && opponent.buns >= opponent.recruitCost) {
      this.recruit(true);
    }

    const pendingSlotIndex = opponent.holdingSlots.findIndex((s) => s !== null);
    if (pendingSlotIndex >= 0) {
      const tile = opponent.holdingSlots[pendingSlotIndex];
      if (tile) {
        const emptyCells = opponent.cells.filter((c) => c.isUnlocked && !c.tileId && !c.isPath);
        if (emptyCells.length > 0) {
          if (tile.type === 'shovel') {
            opponent.holdingSlots[pendingSlotIndex] = null;
            opponent.tiles = opponent.tiles.filter((t) => t.id !== tile.id);
          } else {
            const range = getTileRange(tile.type, tile.generalId);
            const coverage = (c: CellState) => GAME_CONFIG.pathCells.filter(p => Math.hypot(p.row-c.position.row,p.col-c.position.col)*GAME_CONFIG.cellSize <= range).length;
            emptyCells.sort((a,b)=>coverage(b)-coverage(a)||b.position.col-a.position.col);
            const cell = emptyCells[0];
            const success = this.placeTile(tile.id, cell.position, true);
            if (success) {
              opponent.holdingSlots[pendingSlotIndex] = null;
            }
          }
        }
      }
    }

    // Activate completed names immediately instead of waiting for a full board.
    const letters = opponent.tiles.filter(t => t.position && t.type === 'general' && !t.generalId);
    for (const incoming of letters) {
      const destination = letters.find(t => t.id !== incoming.id &&
        GENERALS.some(g => g.name.startsWith(t.char + incoming.char)));
      if (destination) {
        this.mergeTiles(incoming.id, destination.id, true);
        return;
      }
    }

    if (opponent.tiles.filter(t => t.position).length >= 24) {
      const tilesOnBoard = opponent.tiles.filter((t) => t.position !== null);
      const mergeable = this.findMergeableTiles(tilesOnBoard);
      if (mergeable) {
        this.mergeTiles(mergeable.tile1.id, mergeable.tile2.id, true);
      }
    }
  }

  private findMergeableTiles(tiles: TileState[]): { tile1: TileState; tile2: TileState } | null {
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

    const playerDone = this.state.enemies.length === 0 && this.spawnQueue.length === 0;
    const opponentDone =
      this.state.opponentEnemies.length === 0 && this.spawnQueue.length === 0;

    const noMoreSpawns =
      this.spawnQueue.every((s) => s.enemy.count === 0);

    if (playerDone && opponentDone && noMoreSpawns) {
      this.state.isWaveActive = false;
      this.state.player.buns += GAME_CONFIG.waveClearBonus;
      this.state.opponent.buns += GAME_CONFIG.waveClearBonus;
      this.emit({ type: 'WAVE_COMPLETED', waveNumber: this.state.currentWave });

      if (this.state.currentWave < WAVES.length) {
        setTimeout(() => {
          this.startNextWave();
        }, GAME_CONFIG.betweenWaveDelay);
      }
    }
  }

  private checkGameOver(): void {
    if (this.state.player.adouLives <= 0 && this.state.opponent.adouLives <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'draw';
      this.emit({ type: 'GAME_OVER', winner: 'draw' });
    } else if (this.state.player.adouLives <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'opponent';
      this.emit({ type: 'GAME_OVER', winner: 'opponent' });
    } else if (this.state.opponent.adouLives <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'player';
      this.emit({ type: 'GAME_OVER', winner: 'player' });
    } else if (this.state.currentWave >= WAVES.length && !this.state.isWaveActive) {
      const playerLives = this.state.player.adouLives;
      const opponentLives = this.state.opponent.adouLives;
      this.state.isGameOver = true;
      if (playerLives > opponentLives) {
        this.state.winner = 'player';
      } else if (opponentLives > playerLives) {
        this.state.winner = 'opponent';
      } else {
        this.state.winner = 'draw';
      }
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
    }
    let nextSpawnOffset = 0;
    wave.enemies.forEach((enemy) => {
      const offset = Math.max(nextSpawnOffset, enemy.delay);
      this.spawnQueue.push({
        enemy: { ...enemy },
        spawnTime: this.state.gameTime + offset,
        healthMultiplier: enemy.healthMultiplier || 1,
        spawnIndex: 0,
      });
      nextSpawnOffset = offset + enemy.count * wave.spawnInterval;
    });

    return true;
  }

  recruit(isOpponent: boolean): TileState | null {
    const player = isOpponent ? this.state.opponent : this.state.player;
    const rng = isOpponent ? this.opponentRng : this.playerRng;

    if (player.buns < player.recruitCost) return null;

    const emptySlotIndex = player.holdingSlots.findIndex((s) => s === null);
    if (emptySlotIndex === -1) return null;

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
      const partners = player.tiles.filter(t=>t.position && t.type==='general' && !t.generalId)
        .flatMap(t=>GENERALS.filter(g=>g.name.startsWith(t.char) && g.name.length>t.char.length).map(g=>g.name[t.char.length]));
      char = partners.length && rng.next() < GAME_CONFIG.namePartnerChance ? rng.pick(partners) : rng.pick(this.generalChars);
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

    if (selectedType === 'spear' && rng.next() < GAME_CONFIG.weaponRecruitChance) {
      tile.weapon = rng.pick(['fire', 'ice', 'thunder', 'poison'] as const);

    }
    player.tiles.push(tile);
    player.holdingSlots[emptySlotIndex] = tile;

    this.emit({ type: 'RECRUIT', tileType: selectedType, char, isOpponent, slotIndex: emptySlotIndex });

    return tile;
  }

  discardTile(tileId: string, isOpponent = false): boolean {
    const player = isOpponent ? this.state.opponent : this.state.player;
    const tile = player.tiles.find(t => t.id === tileId);
    if (!tile) return false;
    player.cells.forEach(c => { if (c.tileId === tileId) c.tileId = null; });
    player.activeGenerals = player.activeGenerals.filter(g => !g.tileIds.includes(tileId));
    if (tile.type !== 'shovel') player.buns += Math.floor(GAME_CONFIG.baseRecruitCost * Math.pow(2, tile.level - 1) * 0.4);
    player.holdingSlots = player.holdingSlots.map(t => t?.id === tileId ? null : t);
    player.tiles = player.tiles.filter(t => t.id !== tileId);
    return true;
  }

  useShovel(shovelId: string, targetId: string): boolean {
    const player = this.state.player;
    const shovel = player.holdingSlots.find(t => t?.id === shovelId && t.type === 'shovel');
    const target = player.tiles.find(t => t.id === targetId && t.position);
    if (!shovel || !target) return false;
    this.discardTile(targetId);
    return this.discardTile(shovelId);
  }

  placeTile(tileId: string, position: GridPosition, isOpponent: boolean): boolean {
    const player = isOpponent ? this.state.opponent : this.state.player;

    const tile = player.tiles.find((t) => t.id === tileId);
    if (!tile) return false;

    const cell = player.cells.find(
      (c) => c.position.col === position.col && c.position.row === position.row
    );
    if (!cell || !cell.isUnlocked || cell.tileId !== null || cell.isPath) return false;

    if (tile.type === 'shovel') {
      return false;
    }

    if (tile.position) {
      const source = player.cells.find((c) => c.tileId === tileId);
      if (source) source.tileId = null;
    }
    tile.position = { ...position };
    cell.tileId = tileId;

    const slotIndex = player.holdingSlots.findIndex((s) => s?.id === tileId);
    if (slotIndex >= 0) {
      player.holdingSlots[slotIndex] = null;
    }

    this.emit({ type: 'TILE_PLACED', tileId, position, isOpponent });



    return true;
  }

  mergeTiles(tile1Id: string, tile2Id: string, isOpponent: boolean): TileState | null {
    const player = isOpponent ? this.state.opponent : this.state.player;

    const tile1 = player.tiles.find((t) => t.id === tile1Id);
    const tile2 = player.tiles.find((t) => t.id === tile2Id);

    if (!tile1 || !tile2 || tile1Id === tile2Id) return null;
    if (tile1.type === 'general' && tile2.type === 'general') return this.combineName(tile1, tile2, player, isOpponent);
    if (tile1.type !== tile2.type) return null;
    if (tile1.char !== tile2.char) return null;
    if (tile1.level !== tile2.level) return null;
    if (tile1.level >= MAX_TILE_LEVEL) return null;

    const newTile: TileState = {
      id: `tile_${this.nextTileId++}`,
      type: tile1.type,
      char: tile1.char,
      level: tile1.level + 1,
      position: tile2.position || tile1.position,
      generalId: tile1.generalId,
      weapon: tile1.weapon || tile2.weapon,
      lastAttackTime: 0,
      attackSpeedBuff: 0,
      damageBuff: 0,
      isStunned: false,
      stunnedUntil: 0,
    };

    // Clear both sources before assigning the merged tile to the drop target.
    player.cells.forEach((cell) => {
      if (cell.tileId === tile1Id || cell.tileId === tile2Id) cell.tileId = null;
    });
    if (newTile.position) {
      const destination = player.cells.find((cell) =>
        cell.position.col === newTile.position!.col && cell.position.row === newTile.position!.row);
      if (destination) destination.tileId = newTile.id;
    }

    [tile1Id, tile2Id].forEach((id) => {
      const slotIndex = player.holdingSlots.findIndex((s) => s?.id === id);
      if (slotIndex >= 0) {
        player.holdingSlots[slotIndex] = null;
      }
    });

    player.tiles = player.tiles.filter((t) => t.id !== tile1Id && t.id !== tile2Id);
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

  canCombineNames(first: TileState, second: TileState): boolean {
    return first.type === 'general' && second.type === 'general' && !first.generalId && !second.generalId && GENERALS.some(g=>g.name.startsWith(second.char + first.char));
  }

  private combineName(first: TileState, second: TileState, player: PlayerState, isOpponent: boolean): TileState | null {
    if (!this.canCombineNames(first,second) || !second.position) return null;
    const name = second.char + first.char;
    const general = GENERALS.find(g=>g.name === name);
    const tile: TileState = {...second, id:`tile_${this.nextTileId++}`, char:name, generalId:general?.id, level:general ? 5 : 1};
    player.cells.forEach(c=>{if(c.tileId===first.id || c.tileId===second.id)c.tileId=null;});
    player.cells.find(c=>c.position.row===tile.position!.row && c.position.col===tile.position!.col)!.tileId=tile.id;
    player.tiles=player.tiles.filter(t=>t.id!==first.id && t.id!==second.id);
    player.holdingSlots=player.holdingSlots.map(t=>t?.id===first.id || t?.id===second.id ? null:t);
    player.tiles.push(tile);
    this.emit({type:'TILES_MERGED',tile1Id:first.id,tile2Id:second.id,newTileId:tile.id,isOpponent});
    if(general){
      player.activeGenerals.push({generalId:general.id,tileIds:[tile.id],lastSkillTime:this.state.gameTime-general.cooldown+1800,isActive:true});
      this.emit({type:'GENERAL_ACTIVATED',generalId:general.id,tileIds:[tile.id],isOpponent});
    }
    return tile;
  }

  private checkGeneralActivation(_player: PlayerState, _isOpponent: boolean): void {}

  applyWeaponEffect(tile: TileState, targets: EnemyState[]): void {
    const now=this.state.gameTime;
    for(const [i,e] of targets.entries()) {
      if(tile.weapon==='fire'){e.health-=45*tile.level;e.isBurning=true;e.burnDamage=18*tile.level;e.burnUntil=now+3500;}
      if(tile.weapon==='ice'){e.health-=20*tile.level;e.isSlowed=true;e.slowedUntil=now+3500;}
      if(tile.weapon==='thunder') e.health-=70*tile.level*Math.pow(0.8,i);
      if(tile.weapon==='poison'){e.poisonDamage=24*tile.level;e.poisonedUntil=now+4500;}
    }
  }

  private cellToWorld(cell: GridPosition, isOpponent: boolean): Position {
    const scale = isOpponent ? GAME_CONFIG.opponentBoardScale : 1;
    const startX = isOpponent ? GAME_CONFIG.opponentGridStartX : GAME_CONFIG.playerGridStartX;
    const startY = isOpponent ? GAME_CONFIG.opponentGridStartY : GAME_CONFIG.playerGridStartY;
    const cellSize = GAME_CONFIG.cellSize * scale;

    return {
      x: startX + cell.col * cellSize + cellSize / 2,
      y: startY + cell.row * cellSize + cellSize / 2,
    };
  }

  gridToWorld(pos: GridPosition, isOpponent: boolean): Position {
    return this.cellToWorld(pos, isOpponent);
  }

  private distance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  canRecruit(isOpponent: boolean): boolean {
    const player = isOpponent ? this.state.opponent : this.state.player;
    return player.buns >= player.recruitCost && player.holdingSlots.some((s) => s === null);
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
