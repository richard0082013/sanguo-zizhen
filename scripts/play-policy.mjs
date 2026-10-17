// Shared by the engine seed search and pointer-driven browser play.
const names=['赵云','张飞','关羽','黄忠','刘备','诸葛亮','曹操','典韦','夏侯惇','周瑜','孙尚香','吕布'];
export function nextAction(player,cells){
 const board=player.tiles.filter(t=>t.position);
 const combines=(a,b)=>a.id!==b.id&&((a.type!=='general'&&a.type!=='shovel'&&a.type===b.type&&a.char===b.char&&a.level===b.level&&a.level<5)||(a.type==='general'&&b.type==='general'&&!a.generalId&&!b.generalId&&names.some(n=>n.startsWith(b.char+a.char))));
 for(let i=0;i<player.holdingSlots.length;i++){
  const a=player.holdingSlots[i];if(!a)continue;
  const b=board.find(b=>combines(a,b));if(b && (!a.weapon || a.lastWeaponTime))return {kind:'merge',from:a,to:b};
  const range={sword:75,cavalry:75,spear:110,bow:150}[a.type]||0;
  const road=[{row:1,col:6},{row:1,col:5},{row:1,col:4},{row:2,col:4},{row:3,col:4},{row:3,col:3},{row:3,col:2},{row:2,col:2},{row:1,col:2},{row:1,col:1},{row:1,col:0}];
  const score=c=>a.type==='general'?c.row*10-Math.abs(c.col-3):road.filter(r=>Math.hypot(c.row-r.row,c.col-r.col)*54<=range).length*10+c.col;
  const empty=cells.filter(c=>!board.some(t=>t.position.row===c.row&&t.position.col===c.col)).sort((a,b)=>score(b)-score(a))[0];
  if(empty&&a.type!=='shovel')return {kind:'place',from:a,position:empty};
  return {kind:'sell',from:a};
 }
 for(const a of board){if(a.weapon&&!a.lastWeaponTime)continue;const b=board.find(b=>combines(a,b)&&(!b.weapon||b.lastWeaponTime));if(b && (!a.weapon || a.lastWeaponTime))return {kind:'merge',from:a,to:b};}
 if(player.buns>=player.recruitCost)return {kind:'recruit'};
 return null;
}
