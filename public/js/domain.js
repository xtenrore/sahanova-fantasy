export const FORMATIONS = {
  '4-4-2': {DEF:4,MID:4,FWD:2}, '4-3-3': {DEF:4,MID:3,FWD:3}, '3-4-3': {DEF:3,MID:4,FWD:3},
  '3-5-2': {DEF:3,MID:5,FWD:2}, '4-5-1': {DEF:4,MID:5,FWD:1}, '5-3-2': {DEF:5,MID:3,FWD:2}, '5-4-1': {DEF:5,MID:4,FWD:1}
};
export const SQUAD_RULES = { size:15, GK:2, DEF:5, MID:5, FWD:3, maxPerClub:3, initialBudget:100 };
export const SCORING_RULES = {
 appearance:1, sixtyMinutes:1, goal:{GK:10,DEF:6,MID:5,FWD:4}, assist:3, cleanSheet:{GK:4,DEF:4,MID:1,FWD:0}, penaltySaved:5,
 penaltyMissed:-2, ownGoal:-2, yellow:-1, red:-3, savesEvery3:1, bonus:[3,2,1], captainMultiplier:2
};
export function byId(players){ return Object.fromEntries(players.map(p=>[p.id,p])); }
export function createInitialSquad(players){
 const grouped={GK:[],DEF:[],MID:[],FWD:[]};
 [...players].sort((a,b)=>(b.value+b.form)-(a.value+a.form)).forEach(p=>grouped[p.position].push(p));
 const selected=[]; const clubCount={};
 for(const pos of ['GK','DEF','MID','FWD']){
   const need=SQUAD_RULES[pos];
   for(const p of grouped[pos]){
     if(selected.filter(id=>players.find(x=>x.id===id)?.position===pos).length>=need) break;
     if((clubCount[p.clubId]||0)>=SQUAD_RULES.maxPerClub) continue;
     selected.push(p.id); clubCount[p.clubId]=(clubCount[p.clubId]||0)+1;
   }
 }
 const map=byId(players);
 let guard=0;
 while(squadCost(selected,players)>SQUAD_RULES.initialBudget && guard++<30){
   let best=null;
   for(const outId of selected){
     const out=map[outId];
     for(const incoming of grouped[out.position].slice().sort((a,b)=>a.price-b.price)){
       if(selected.includes(incoming.id)||incoming.price>=out.price) continue;
       const nextClubCount={...clubCount}; nextClubCount[out.clubId]--; nextClubCount[incoming.clubId]=(nextClubCount[incoming.clubId]||0)+1;
       if(nextClubCount[incoming.clubId]>SQUAD_RULES.maxPerClub) continue;
       const saving=out.price-incoming.price;
       const qualityLoss=(out.value+out.form)-(incoming.value+incoming.form);
       const score=saving*4-qualityLoss*.08;
       if(!best||score>best.score)best={outId,incoming,saving,score,nextClubCount};
     }
   }
   if(!best)break;
   selected[selected.indexOf(best.outId)]=best.incoming.id;
   Object.assign(clubCount,best.nextClubCount);
 }
 return selected;
}
export function squadCost(ids,players){ const map=byId(players); return Math.round(ids.reduce((s,id)=>s+(map[id]?.price||0),0)*10)/10; }
export function validateSquad(ids,players){
 const map=byId(players); const errors=[]; if(ids.length!==SQUAD_RULES.size) errors.push(`size:${ids.length}`);
 const count={GK:0,DEF:0,MID:0,FWD:0}; const clubs={};
 ids.forEach(id=>{const p=map[id]; if(!p)return errors.push(`missing:${id}`); count[p.position]++; clubs[p.clubId]=(clubs[p.clubId]||0)+1;});
 for(const p of Object.keys(count)) if(count[p]!==SQUAD_RULES[p]) errors.push(`${p}:${count[p]}`);
 for(const [club,n] of Object.entries(clubs)) if(n>SQUAD_RULES.maxPerClub) errors.push(`club:${club}:${n}`);
 return {valid:errors.length===0,errors,count,clubs,cost:squadCost(ids,players)};
}
export function recalcStartingXI(ids,formation,players,prefer=[]){
 const shape=FORMATIONS[formation]||FORMATIONS['4-4-2']; const map=byId(players); const target={GK:1,...shape};
 const chosen=[]; const preferred=[...prefer,...ids.filter(id=>!prefer.includes(id))];
 for(const pos of ['GK','DEF','MID','FWD']){
   const eligible=preferred.filter(id=>ids.includes(id)&&map[id]?.position===pos);
   chosen.push(...eligible.slice(0,target[pos]));
 }
 return chosen;
}
export function canTransfer({squadIds,outId,inId,players,budget}){
 const map=byId(players), out=map[outId], incoming=map[inId]; if(!out||!incoming) return {ok:false,reason:'missing'};
 if(out.position!==incoming.position) return {ok:false,reason:'position'}; if(squadIds.includes(inId)) return {ok:false,reason:'duplicate'};
 const next=squadIds.map(id=>id===outId?inId:id); const nextBudget=Math.round((budget+out.price-incoming.price)*10)/10;
 if(nextBudget<0) return {ok:false,reason:'budget',nextBudget}; const validation=validateSquad(next,players); if(!validation.valid) return {ok:false,reason:validation.errors.some(x=>x.startsWith('club:'))?'club':'rules',nextBudget};
 return {ok:true,next,nextBudget};
}
export function scorePlayerEvent(event,position,rules=SCORING_RULES){
 switch(event.type){
  case 'appearance': return rules.appearance;
  case 'sixtyMinutes': return rules.sixtyMinutes;
  case 'goal': return rules.goal[position]??0;
  case 'assist': return rules.assist;
  case 'cleanSheet': return rules.cleanSheet[position]??0;
  case 'penaltySaved': return rules.penaltySaved;
  case 'penaltyMissed': return rules.penaltyMissed;
  case 'ownGoal': return rules.ownGoal;
  case 'yellow': return rules.yellow;
  case 'red': return rules.red;
  case 'saves': return Math.floor((event.count||0)/3)*rules.savesEvery3;
  case 'bonus': return Math.max(0,Math.min(3,event.points||0));
  default:return 0;
 }
}
export function scoringRulesFromConfig(config={}){
 const s=config.scoring||config;
 return {...SCORING_RULES,goal:{...SCORING_RULES.goal,GK:Number(s.goalGK??SCORING_RULES.goal.GK),DEF:Number(s.goalDEF??SCORING_RULES.goal.DEF),MID:Number(s.goalMID??SCORING_RULES.goal.MID),FWD:Number(s.goalFWD??SCORING_RULES.goal.FWD)},cleanSheet:{...SCORING_RULES.cleanSheet,GK:Number(s.cleanSheetGK??SCORING_RULES.cleanSheet.GK),DEF:Number(s.cleanSheetDEF??SCORING_RULES.cleanSheet.DEF),MID:Number(s.cleanSheetMID??SCORING_RULES.cleanSheet.MID),FWD:Number(s.cleanSheetFWD??SCORING_RULES.cleanSheet.FWD)},appearance:Number(s.appearance??SCORING_RULES.appearance),sixtyMinutes:Number(s.sixtyMinutes??SCORING_RULES.sixtyMinutes),assist:Number(s.assist??SCORING_RULES.assist),penaltySaved:Number(s.penaltySaved??SCORING_RULES.penaltySaved),penaltyMissed:Number(s.penaltyMissed??SCORING_RULES.penaltyMissed),ownGoal:Number(s.ownGoal??SCORING_RULES.ownGoal),yellow:Number(s.yellow??SCORING_RULES.yellow),red:Number(s.red??SCORING_RULES.red),savesEvery3:Number(s.savesEvery3??SCORING_RULES.savesEvery3),captainMultiplier:Number(s.captainMultiplier??SCORING_RULES.captainMultiplier)};
}
export function calculateFantasyPoints(events,position,{captain=false,rules=SCORING_RULES}={}){
 const base=events.reduce((sum,e)=>sum+scorePlayerEvent(e,position,rules),0); return captain?base*rules.captainMultiplier:base;
}
export function fixtureDifficulty(homeStrength,awayStrength,isHome){
 const raw=isHome?3+(awayStrength-homeStrength)*0.55:3+(homeStrength-awayStrength)*0.7; return Math.max(1,Math.min(5,Math.round(raw)));
}
