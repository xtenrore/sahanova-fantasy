import { FORMATIONS } from './domain.js';

export const MANAGER_CARDS = [
  {id:'tripleCaptain',tr:'3x Kaptan',en:'Triple Captain',effect:'captain3'},
  {id:'quadCaptain',tr:'4x Kaptan',en:'Quadruple Captain',effect:'captain4'},
  {id:'benchBoost',tr:'Tüm Takım',en:'Bench Boost',effect:'bench'},
  {id:'attack',tr:'Hücum+',en:'Attack+',effect:'attack'},
  {id:'unlimited',tr:'Limitsiz Bütçe',en:'Unlimited Budget',effect:'unlimited'}
];

export function getGameweekDeadline(gameweeks,currentGameweek){
  return gameweeks.find(g=>g.id===currentGameweek)?.deadline||null;
}

export function deadlineState(gameweeks,currentGameweek,now=Date.now()){
  const iso=getGameweekDeadline(gameweeks,currentGameweek);
  const deadline=iso?new Date(iso).getTime():NaN;
  if(!Number.isFinite(deadline))return {locked:false,deadline:null,msLeft:Infinity,cardPurchaseClosed:false};
  const msLeft=deadline-now;
  return {locked:msLeft<=0,deadline:new Date(deadline),msLeft,cardPurchaseClosed:msLeft<=15*60*1000};
}

export function predictionResult(home,away){
  if(home===away)return 'D';
  return home>away?'H':'A';
}

export function nostradamusScore(predictions,fixtures){
  const eligible=fixtures||[];
  const complete=eligible.length>0&&eligible.every(f=>Number.isInteger(predictions?.[f.id]?.home)&&Number.isInteger(predictions?.[f.id]?.away));
  let correct=0;
  for(const f of eligible){
    const p=predictions?.[f.id];
    if(!p||!['result','live'].includes(f.status))continue;
    if(predictionResult(p.home,p.away)===predictionResult(Number(f.homeScore||0),Number(f.awayScore||0)))correct++;
  }
  return {complete,completionPoint:complete?1:0,correct,total:(complete?1:0)+correct};
}

function shapeCounts(ids,playerById){
  const count={GK:0,DEF:0,MID:0,FWD:0};
  ids.forEach(id=>{const p=playerById[id];if(p)count[p.position]++});
  return count;
}

function formationValid(ids,playerById){
  const c=shapeCounts(ids,playerById);
  return ids.length===11&&c.GK===1&&c.DEF>=3&&c.FWD>=1;
}

export function resolveAutoSubs({startingIds,benchOrder,playersById,minutesById={}}){
  const starters=[...startingIds];
  const out=starters.filter(id=>Number(minutesById[id]??playersById[id]?.minutes??0)<=0);
  const used=new Set(starters.filter(id=>!out.includes(id)));
  for(const outId of out){
    const outIndex=starters.indexOf(outId);
    for(const benchId of benchOrder){
      if(used.has(benchId))continue;
      const p=playersById[benchId];
      if(!p||Number(minutesById[benchId]??p.minutes??0)<=0)continue;
      const trial=[...starters];trial[outIndex]=benchId;
      if(!formationValid(trial,playersById))continue;
      starters[outIndex]=benchId;used.add(benchId);break;
    }
  }
  return starters;
}

export function effectiveCaptain({startingIds,playersById,captainId,viceCaptainId,minutesById={}}){
  const played=id=>id&&startingIds.includes(id)&&Number(minutesById[id]??playersById[id]?.minutes??0)>0;
  if(played(captainId))return captainId;
  if(played(viceCaptainId))return viceCaptainId;
  return null;
}

export function lineupWeekPoints({startingIds,benchOrder=[],playersById,captainId,viceCaptainId,activeCard=null,minutesById={}}){
  const resolved=resolveAutoSubs({startingIds,benchOrder,playersById,minutesById});
  const cap=effectiveCaptain({startingIds:resolved,playersById,captainId,viceCaptainId,minutesById});
  const base=resolved.reduce((sum,id)=>sum+Number(playersById[id]?.weekPoints||0),0);
  const capPts=Number(playersById[cap]?.weekPoints||0);
  const multiplier=activeCard==='tripleCaptain'?3:activeCard==='quadCaptain'?4:2;
  let total=base+(cap?capPts*(multiplier-1):0);
  if(activeCard==='benchBoost'){
    const bench=benchOrder.filter(id=>!resolved.includes(id));
    total+=bench.reduce((sum,id)=>sum+Number(playersById[id]?.weekPoints||0),0);
  }
  return {total,base,captainId:cap,captainMultiplier:multiplier,resolvedStartingIds:resolved};
}


export function transferWithRules({state,outId,inId,players,activeCard=null}){
  const map=Object.fromEntries(players.map(p=>[p.id,p])),out=map[outId],incoming=map[inId];
  if(!out||!incoming)return {ok:false,reason:'missing'};
  if(out.position!==incoming.position)return {ok:false,reason:'position'};
  if(state.squadIds.includes(inId))return {ok:false,reason:'duplicate'};
  const next=state.squadIds.map(id=>id===outId?inId:id);
  const clubs={};for(const id of next){const p=map[id];clubs[p.clubId]=(clubs[p.clubId]||0)+1;if(clubs[p.clubId]>3)return {ok:false,reason:'club'};}
  const bonus=activeCard==='attack'?5:0,calc=Math.round((Number(state.budget||0)+bonus+out.price-incoming.price)*10)/10;
  if(activeCard!=='unlimited'&&calc<0)return {ok:false,reason:'budget',nextBudget:calc};
  return {ok:true,next,nextBudget:activeCard==='unlimited'?Number(state.budget||0):calc};
}

export function buildAttackStartingXI(squadIds,playersById){
  const need={GK:1,DEF:2,MID:5,FWD:3},out=[];
  for(const pos of ['GK','DEF','MID','FWD'])out.push(...squadIds.filter(id=>playersById[id]?.position===pos).slice(0,need[pos]));
  return out;
}

export function specialFormationAllowed(activeCard,formation){
  return formation!=='2-5-3'||activeCard==='attack';
}

export function effectiveTransferBudget(budget,activeCard){
  if(activeCard==='unlimited')return Infinity;
  return Number(budget||0)+(activeCard==='attack'?5:0);
}

export function generateH2HSchedule(names,seed=1){
  const teams=[...names];if(teams.length%2)teams.push('BYE');
  const fixed=teams[0],rest=teams.slice(1),rounds=[];
  for(let r=0;r<teams.length-1;r++){
    const ring=[fixed,...rest];const pairs=[];
    for(let i=0;i<ring.length/2;i++){const a=ring[i],b=ring[ring.length-1-i];if(a!=='BYE'&&b!=='BYE')pairs.push({home:(r+seed)%2?a:b,away:(r+seed)%2?b:a});}
    rounds.push(pairs);rest.unshift(rest.pop());
  }
  return rounds;
}

export function generateCupBracket(names,size=8){
  const entrants=[...names].slice(0,size);
  while(entrants.length<size)entrants.push(`Wild Card ${entrants.length+1}`);
  const first=[];for(let i=0;i<entrants.length;i+=2)first.push({home:entrants[i],away:entrants[i+1],homeScore:null,awayScore:null});
  return {size,rounds:[first],champion:null};
}

export function managerCardSummary(cardId,lang='tr'){
  const card=MANAGER_CARDS.find(c=>c.id===cardId);if(!card)return '';
  const tr={tripleCaptain:'Kaptan puanını 3x yapar.',quadCaptain:'Kaptan puanını 4x yapar.',benchBoost:'Yedek puanlarını da haftalık skora ekler.',attack:'2-5-3 hücum dizilişini açar ve +₺5.0m geçici bütçe verir.',unlimited:'Bu maç haftasında bütçe sınırını kaldırır.'};
  const en={tripleCaptain:'Captain scores 3x.',quadCaptain:'Captain scores 4x.',benchBoost:'Bench points count toward the gameweek score.',attack:'Unlocks 2-5-3 and grants +₺5.0m temporary budget.',unlimited:'Removes the budget limit for this gameweek.'};
  return (lang==='en'?en:tr)[cardId];
}

export function formationOptions(activeCard){
  return Object.keys(FORMATIONS).filter(f=>f!=='2-5-3'||activeCard==='attack');
}
