import {describe,it,expect} from 'vitest';
import {BattleEngine} from '../src/game/logic/BattleEngine';
import {GENERALS} from '../src/game/config/generals';
import {getTileDamage,getTileAttackSpeed,getTileRange} from '../src/game/config/tiles';
import type {TileState} from '../src/game/logic/types';
const tile=(id:string,char:string,type:TileState['type']='general',level=1):TileState=>({id,char,type,level,position:null,lastAttackTime:0,attackSpeedBuff:0,damageBuff:0,isStunned:false,stunnedUntil:0});
describe('gameplay depth',()=>{
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
 it('does not script the opening Zhou Yu pair',()=>{expect(Array.from({length:12},(_,i)=>new BattleEngine(i+1).recruit(false)!.char)).not.toEqual(Array(12).fill('周'));});
});
