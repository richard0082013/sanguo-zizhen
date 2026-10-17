import type { TileType } from '../config/tiles';
import type { EnemyType } from '../config/enemies';

export interface Position {
  x: number;
  y: number;
}

export interface GridPosition {
  col: number;
  row: number;
}

export interface TileState {
  id: string;
  type: TileType;
  char: string;
  level: number;
  position: GridPosition | null;
  generalId?: string;
  lastAttackTime: number;
  attackSpeedBuff: number;
  damageBuff: number;
  isStunned: boolean;
  stunnedUntil: number;
}

export interface EnemyState {
  id: string;
  type: EnemyType;
  char: string;
  health: number;
  maxHealth: number;
  speed: number;
  position: Position;
  pathIndex: number;
  pathProgress: number;
  damage: number;
  rangedResist: number;
  meleeResist: number;
  reward: number;
  color: string;
  isBoss: boolean;
  bossId?: string;
  lastAbilityTime: number;
  isSlowed: boolean;
  slowedUntil: number;
  isBurning: boolean;
  burnDamage: number;
  burnUntil: number;
}

export interface ProjectileState {
  id: string;
  fromTileId: string;
  targetEnemyId: string;
  position: Position;
  targetPosition: Position;
  damage: number;
  isRanged: boolean;
  speed: number;
}

export interface ActiveGeneralState {
  generalId: string;
  tileIds: string[];
  lastSkillTime: number;
  isActive: boolean;
}

export interface CellState {
  position: GridPosition;
  isUnlocked: boolean;
  tileId: string | null;
}

export interface PlayerState {
  buns: number;
  recruitCost: number;
  recruitCount: number;
  adouLives: number;
  cells: CellState[];
  tiles: TileState[];
  activeGenerals: ActiveGeneralState[];
  pendingTile: TileState | null;
}

export interface GameState {
  player: PlayerState;
  opponent: PlayerState;
  enemies: EnemyState[];
  opponentEnemies: EnemyState[];
  projectiles: ProjectileState[];
  opponentProjectiles: ProjectileState[];
  currentWave: number;
  isWaveActive: boolean;
  waveStartTime: number;
  gameTime: number;
  isGameOver: boolean;
  winner: 'player' | 'opponent' | null;
  seed: number;
  isPaused: boolean;
}

export type GameEvent =
  | { type: 'ENEMY_KILLED'; enemyId: string; reward: number; isOpponent: boolean }
  | { type: 'ENEMY_REACHED_END'; enemyId: string; damage: number; isOpponent: boolean }
  | { type: 'TILE_PLACED'; tileId: string; position: GridPosition; isOpponent: boolean }
  | { type: 'TILES_MERGED'; tile1Id: string; tile2Id: string; newTileId: string; isOpponent: boolean }
  | { type: 'GENERAL_ACTIVATED'; generalId: string; tileIds: string[]; isOpponent: boolean }
  | { type: 'GENERAL_SKILL_USED'; generalId: string; isOpponent: boolean }
  | { type: 'CELL_UNLOCKED'; position: GridPosition; isOpponent: boolean }
  | { type: 'WAVE_STARTED'; waveNumber: number }
  | { type: 'WAVE_COMPLETED'; waveNumber: number }
  | { type: 'GAME_OVER'; winner: 'player' | 'opponent' }
  | { type: 'RECRUIT'; tileType: TileType; char: string; isOpponent: boolean }
  | { type: 'PROJECTILE_HIT'; projectileId: string; enemyId: string; damage: number; isOpponent: boolean };
