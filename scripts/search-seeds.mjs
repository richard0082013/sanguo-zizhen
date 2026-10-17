import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {nextAction} from './play-policy.mjs';
const root=mkdtempSync('/tmp/r12-engine-');process.on('exit',()=>rmSync(root,{recursive:true,force:true}));writeFileSync(root+'/package.json','{"type":"commonjs"}');
for(const dir of ['logic','config','utils']){mkdirSync(root+'/'+dir,{recursive:true});for(const file of readdirSync('src/game/'+dir).filter(f=>f.endsWith('.ts'))){writeFileSync(root+'/'+dir+'/'+file.replace('.ts','.js'),ts.transpileModule(readFileSync('src/game/'+dir+'/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);}}
const require=createRequire(import.meta.url),{BattleEngine}=require(root+'/logic/BattleEngine.js'),{GAME_CONFIG}=require(root+'/config/gameConfig.js');
// Drive wave delays on simulated engine time; prevent real timers from leaking across seeds.
globalThis.setTimeout=()=>0;
const count=Number(process.argv[2]||5000),start=Number(process.argv[3]||1),duration=Number(process.argv[4]||55000);let best=-1;
for(let seed=start;seed<start+count;seed++){
 const e=new BattleEngine(seed),s=e.getState(),weapons=new Set();let reveal=false,skill=false,high=false,nextWave=GAME_CONFIG.waveDelay,over=false;
 e.addEventListener(ev=>{if(ev.type==='WAVE_COMPLETED')nextWave=s.gameTime+GAME_CONFIG.betweenWaveDelay;if(ev.isOpponent)return;if(ev.type==='GENERAL_ACTIVATED')reveal=true;if(ev.type==='GENERAL_SKILL_USED'&&['lvbu','guanyu','zhangfei'].includes(ev.generalId)&&ev.targets.length)skill=true;if(ev.type==='WEAPON_USED')weapons.add(ev.weapon);});
 for(let time=0;time<duration;time+=100){
  if(!s.isWaveActive&&time>=nextWave)e.startNextWave();
  const action=nextAction(s.player,s.player.cells.filter(c=>!c.isPath).map(c=>c.position));
  if(action){if(action.kind==='recruit')e.recruit(false);if(action.kind==='place')e.placeTile(action.from.id,action.position,false);if(action.kind==='sell')e.discardTile(action.from.id);if(action.kind==='merge')e.mergeTiles(action.from.id,action.to.id,false);}
  e.update(100);high||=s.player.tiles.some(t=>t.type!=='general'&&t.level>=4);
  if(s.isGameOver){over=true;break;}
 }
 const score=weapons.size+Number(reveal)+Number(skill)+Number(high);
 if(score>best){best=score;console.log(JSON.stringify({seed,score,weapons:[...weapons],reveal,skill,high,over,recruits:s.player.recruitCount,wave:s.currentWave,buns:s.player.buns}));}
 if(score===7&&!over){console.log('FOUND',seed);process.exit(0);}
}
console.log('NONE',count,'best',best);process.exitCode=1;
