import { chromium } from '/workspace/sanguo-zizhen/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const out='/workspace/r11';
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const ctx=await b.newContext({viewport:{width:450,height:800},recordVideo:{dir:'/workspace/r11/vid',size:{width:450,height:800}}});
const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:5173/?seed=26809');await p.waitForFunction(()=>window.__test);const T=(fn,...a)=>p.evaluate(([fn,a])=>window.__test[fn](...a),[fn,a]);
await T('start');
await p.evaluate(()=>{
 window.captureEvents=[];const seen=new Set();let skillCount=0;const scene=window.__game.scene.getScene('GameScene');
 scene.engine.addEventListener(e=>{
  if(e.isOpponent||!['GENERAL_ACTIVATED','GENERAL_SKILL_USED','WEAPON_USED'].includes(e.type))return;
  if(e.type==='WEAPON_USED'&&e.weapon!=='fire')return;
  const key=e.type+(e.type==='GENERAL_SKILL_USED'?e.generalId:'');
  if(seen.has(key)||(e.type==='GENERAL_SKILL_USED'&&skillCount>=3))return;
  seen.add(key);if(e.type==='GENERAL_SKILL_USED')skillCount++;
  scene.time.delayedCall(e.type==='GENERAL_ACTIVATED'?420:e.type==='WEAPON_USED'?650:450,()=>{
   window.captureEvents.push({...e});scene.scene.pause();
  });
 });
});
const box=await p.locator('canvas').boundingBox(),abs=o=>({x:box.x+o.x,y:box.y+o.y});
async function drag(from,to){const a=abs(from),c=abs(to);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(c.x,c.y,{steps:3});await p.mouse.up();await p.waitForTimeout(35);}
const shot=async name=>{await p.screenshot({path:out+'/'+name+'.png'});console.log('captured',name);};
let range=false;let reveal=false,fire=false,high=false;const skills=new Set();let merges=0;
const names=['赵云','张飞','关羽','黄忠','刘备','诸葛亮','曹操','典韦','夏侯惇','周瑜','孙尚香','吕布'];
const began=Date.now();let lastProgress=0;
async function capture(){const events=await p.evaluate(()=>window.captureEvents.splice(0));for(const e of events){if(e.type==='GENERAL_ACTIVATED'&&!reveal){await shot('1_general_transform');reveal=true;}if(e.type==='GENERAL_SKILL_USED'&&!skills.has(e.generalId)&&skills.size<3){await shot(['2_skill_a','3_skill_b','4_skill_c'][skills.size]);skills.add(e.generalId);}if(e.type==='WEAPON_USED'&&e.weapon==='fire'&&!fire){await shot('5_fire_dragon_weapon');fire=true;}await p.evaluate(()=>window.__game.scene.getScene('GameScene').scene.resume());}}
while(Date.now()-began<230000){
 await capture();let s=await T('state');if(Date.now()-lastProgress>30000){console.log('progress',Math.round(s.gameTime/1000),'recruits',s.player.recruitCount,'tiers',s.player.tiles.filter(t=>t.position&&t.type!=='general').map(t=>t.char+t.level).join(','));lastProgress=Date.now();}if(s.isGameOver){console.log('GAME OVER',s.gameTime,s.player.adouLives,s.opponent.adouLives);break;}
 if(s.player.buns>=s.player.recruitCost){const r=abs(await T('recruitPos'));await p.mouse.click(r.x,r.y);await p.waitForTimeout(40);}
 s=await T('state');
 for(let i=0;i<s.player.holdingSlots.length;i++){
  const tile=s.player.holdingSlots[i];if(!tile)continue;
  let tiles=await T('myTiles');
  let target=tiles.find(t=>t.type===tile.type&&t.char===tile.char&&t.level===tile.level&&t.level<5&&t.type!=='general');
  if(tile.type==='general')target=tiles.find(t=>t.type==='general'&&names.some(n=>n.startsWith(t.char+tile.char)));
  if(target){await drag(await T('slotPos',i),await T('cellPos',target.row,target.col));merges++;await capture();continue;}
  const cells=await T('placeableCells');
  // Prioritize the road's entrance and inner bends for early defense.
  const road=[{row:1,col:6},{row:1,col:5},{row:1,col:4},{row:2,col:4},{row:3,col:4},{row:3,col:3},{row:3,col:2},{row:2,col:2},{row:1,col:2},{row:1,col:1},{row:1,col:0}];
  const score=c=>tile.type==='general' ? c.row*10-Math.abs(c.col-3) : road.reduce((sum,r)=>sum+(Math.hypot(c.row-r.row,c.col-r.col)*54<=(tile.type==='bow'?150:tile.type==='spear'?110:60)?1:0),0)*10+c.col;
  cells.sort((a,b)=>score(b)-score(a));
  const empty=cells.find(c=>!tiles.some(t=>t.row===c.row&&t.col===c.col));
  if(empty&&tile.type!=='shovel')await drag(await T('slotPos',i),await T('cellPos',empty.row,empty.col));
  else {
   const redundant=tiles.find(t=>t.type==='general'&&t.char.length===1&&tiles.some(u=>u.id!==t.id&&u.char===t.char)) || tiles.find(t=>t.type==='general'&&t.char.length===1);
   if(redundant&&tile.type!=='general')await drag(await T('cellPos',redundant.row,redundant.col),{x:405,y:722});
   else await drag(await T('slotPos',i),{x:405,y:722});
  }
 }
 let tiles=await T('myTiles');
 for(const a of tiles){const c=tiles.find(t=>t.id!==a.id&&((a.type!=='general'&&t.type===a.type&&t.char===a.char&&t.level===a.level&&t.level<5)||(a.type==='general'&&t.type==='general'&&names.some(n=>n.startsWith(t.char+a.char)))));if(c){await drag(await T('cellPos',a.row,a.col),await T('cellPos',c.row,c.col));merges++;break;}}
 tiles=await T('myTiles');if(!range&&tiles.some(t=>t.type==='bow')){const t=tiles.find(t=>t.type==='bow');const q=abs(await T('cellPos',t.row,t.col));await p.mouse.click(q.x,q.y);await p.waitForTimeout(100);await shot('7_range');range=true;}
 if(!high&&tiles.some(t=>t.level===5&&t.type!=='general')){await shot('6_high_level');high=true;}
 if(range&&reveal&&fire&&high&&skills.size===3)break;
 await p.waitForTimeout(60);
}
console.log(JSON.stringify({range,reveal,fire,high,skills:[...skills],merges,errors,gameTime:(await T('state')).gameTime}));
await ctx.close();await b.close();
assert.ok(range&&reveal&&fire&&high&&skills.size===3,'all six real-play captures required');assert.deepEqual(errors,[]);
