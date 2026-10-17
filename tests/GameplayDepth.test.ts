import {describe,it,expect} from 'vitest';
import {BattleEngine} from '../src/game/logic/BattleEngine';
import {GAME_CONFIG} from '../src/game/config/gameConfig';
import {GENERALS} from '../src/game/config/generals';
import {getTileDamage,getTileAttackSpeed,getTileRange} from '../src/game/config/tiles';
import type {TileState} from '../src/game/logic/types';
const tile=(id:string,char:string,type:TileState['type']='general',level=1):TileState=>({id,char,type,level,position:null,lastAttackTime:0,attackSpeedBuff:0,damageBuff:0,isStunned:false,stunnedUntil:0});
describe('gameplay depth',()=>{
 it('has no passive income and no practical savings cap',()=>{const e=new BattleEngine(1);e.getState().player.buns=200;e.update(1000);expect(e.getState().player.buns).toBe(200);});
 it('melee reaches adjacent road cells',()=>{expect(getTileRange('sword')).toBe(75);expect(getTileRange('cavalry')).toBe(75);});
 it('pays kills above the old cap and pays six buns on wave clear',()=>{
  const e=new BattleEngine(1),s=e.getState();s.player.buns=200;e.startNextWave();e.update(1);
  s.enemies[0].health=0;e.update(1);expect(s.player.buns).toBe(203);
  e.update(6000);s.enemies.forEach(enemy=>enemy.health=0);s.opponentEnemies.forEach(enemy=>enemy.health=0);
  const before=s.player.buns;const rewards=s.enemies.reduce((sum,enemy)=>sum+enemy.reward,0);
  e.update(1);expect(s.player.buns).toBe(before+rewards+6);
 });
 it('scales ordinary kill rewards from three to five with the wave',()=>{
  for (const [wave,reward] of [[1,3],[3,3],[4,4],[6,4],[7,5],[9,5]]) {
   const e=new BattleEngine(1),s=e.getState();s.currentWave=wave-1;e.startNextWave();e.update(1);
   expect(s.enemies.find(enemy=>!enemy.isBoss)?.reward).toBe(reward);
  }
 });
 it('raises recruitment by one and caps the price at twenty-four',()=>{
  const e=new BattleEngine(1),p=e.getState().player;
  for(let i=0;i<20;i++) {p.buns=100;const t=e.recruit(false)!;expect(t).not.toBeNull();e.discardTile(t.id);expect(p.recruitCost).toBe(Math.min(24,11+i));}
  expect(GAME_CONFIG.incomePerSecond).toBe(0);
 });
 it('AI activates complementary name characters before filling its board',()=>{
  const e=new BattleEngine(1),p=e.getState().opponent;p.buns=0;
  for(const [index,char] of ['张','飞'].entries()) {const t=tile('ai-'+index,char);p.tiles.push(t);e.placeTile(t.id,{row:0,col:6-index},true);}
  e.update(500);
  expect(p.tiles.some(t=>t.generalId==='zhangfei'&&t.position)).toBe(true);
  expect(p.tiles).toHaveLength(1);
 });
 it('selling a partial name frees its board cell and gives a partial refund',()=>{
  const e=new BattleEngine(1),p=e.getState().player,t=tile('partial','诸葛');p.tiles.push(t);e.placeTile(t.id,{row:0,col:0},false);
  const before=p.buns;expect(e.discardTile(t.id)).toBe(true);expect(p.buns).toBe(before+4);expect(p.cells.some(c=>c.tileId===t.id)).toBe(false);expect(e.discardTile(t.id)).toBe(false);
 });
 it('starts with enough buns for exactly two recruits',()=>{
  const e=new BattleEngine(1);expect(e.recruit(false)).not.toBeNull();expect(e.recruit(false)).not.toBeNull();expect(e.recruit(false)).toBeNull();
 });
 it('keeps bows long, spears medium, blades and cavalry melee at every tier',()=>{
  expect(getTileRange('bow')).toBeGreaterThan(getTileRange('spear'));
  expect(getTileRange('spear')).toBeGreaterThan(getTileRange('sword'));
  expect(getTileRange('spear')).toBeGreaterThan(getTileRange('cavalry'));
  expect(getTileRange('shovel')).toBe(0);expect(getTileRange('general')).toBe(0);
  for(const g of GENERALS)expect(getTileRange('general',g.id)).toBe(g.attackRange);
  expect(new Set(GENERALS.map(g=>g.attackRange)).size).toBe(GENERALS.length);
 });
 it('requires sixteen base soldiers to merge to gold, with rising damage and speed',()=>{
  const e=new BattleEngine(1),p=e.getState().player;
  let army=Array.from({length:16},(_,i)=>tile('s'+i,'刀','sword'));
  p.tiles.push(...army);e.placeTile(army[0].id,{row:0,col:0},false);
  for(let level=1;level<5;level++){
   const next:TileState[]=[];
   for(let i=0;i<army.length;i+=2)next.push(e.mergeTiles(army[i+1].id,army[i].id,false)!);
   army=next;expect(army.every(t=>t.level===level+1)).toBe(true);
   expect(getTileDamage('sword',level+1)).toBeGreaterThan(getTileDamage('sword',level));
   expect(getTileAttackSpeed('sword',level+1)).toBeLessThan(getTileAttackSpeed('sword',level));
  }
  expect(p.tiles).toHaveLength(1);expect(army[0].level).toBe(5);
  const extra=tile('extra','刀','sword',5);p.tiles.push(extra);expect(e.mergeTiles(extra.id,army[0].id,false)).toBeNull();
 });
 for(const g of GENERALS)it('completes '+g.name+' in order and runs its active cooldown',()=>{
  const e=new BattleEngine(3),s=e.getState(),p=s.player;
  const parts=g.chars.map((c,i)=>tile('name'+i,c));p.tiles.push(...parts);
  e.placeTile(parts[0].id,{row:0,col:5},false);
  expect(p.activeGenerals).toHaveLength(0);
  expect(e.mergeTiles(parts[0].id,parts[1].id,false)).toBeNull();
  let result=parts[0];for(const part of parts.slice(1))result=e.mergeTiles(part.id,result.id,false)!;
  expect(result.generalId).toBe(g.id);expect(p.activeGenerals).toHaveLength(1);expect(p.tiles).toHaveLength(1);
  const events:string[]=[];e.addEventListener(ev=>{if(ev.type==='GENERAL_SKILL_USED')events.push(ev.generalId);});
  e.startNextWave();for(let i=0;i<25;i++)e.update(100);
  expect(events).toContain(g.id);const count=events.length;e.update(50);expect(events).toHaveLength(count);
 });
 for(const weapon of ['fire','ice','thunder','poison'] as const)it('applies '+weapon+' from its weapon and preserves it through merging',()=>{
  const e=new BattleEngine(5);e.startNextWave();e.update(100);
  const enemies=e.getState().enemies,enemy=enemies[0],before=enemy.health;
  const a=tile('a','枪','spear'),b=tile('b','枪','spear');a.weapon=weapon;b.weapon=weapon;
  e.getState().player.tiles.push(a,b);e.placeTile(a.id,{row:0,col:5},false);
  const merged=e.mergeTiles(b.id,a.id,false)!;expect(merged.weapon).toBe(weapon);
  e.applyWeaponEffect(merged,enemies);
  if(weapon==='ice'){expect(enemy.isSlowed).toBe(true);expect(enemy.slowedUntil).toBeGreaterThan(3000);}
  if(weapon==='fire')expect(enemy.isBurning).toBe(true);
  if(weapon==='poison'){expect(enemy.poisonDamage).toBe(48);const hp=enemy.health;e.update(100);expect(enemy.health).toBeLessThan(hp);}
  else expect(enemy.health).toBeLessThan(before);
 });
 it('biases name draws toward a placed partner without scripting recruits',()=>{
  let matching=0,names=0;
  for(let seed=1;seed<=1000;seed++){
   const e=new BattleEngine(seed),p=e.getState().player;
   const half=tile('half','吕');p.tiles.push(half);e.placeTile(half.id,{row:0,col:0},false);
   const draw=e.recruit(false)!;if(draw.type==='general'){names++;if(draw.char==='布')matching++;}
  }
  expect(names).toBeGreaterThan(90);expect(matching/names).toBeGreaterThan(0.55);expect(matching/names).toBeLessThan(0.85);
 });
 it('merges elemental and plain spears while preserving an equipped destination',()=>{
  const e=new BattleEngine(5),p=e.getState().player,a=tile('a','枪','spear'),b=tile('b','枪','spear');b.weapon='ice';p.tiles.push(a,b);e.placeTile(b.id,{row:0,col:0},false);
  const merged=e.mergeTiles(a.id,b.id,false)!;expect(merged.level).toBe(2);expect(merged.weapon).toBe('ice');expect(merged.char).toBe('枪');
 });
 it('does not script the opening Zhou Yu pair',()=>{expect(Array.from({length:12},(_,i)=>new BattleEngine(i+1).recruit(false)!.char)).not.toEqual(Array(12).fill('周'));});
});
