import { projectPlayer } from './insights.js';

function fixtureForWeek(clubId,fixtures,week){return fixtures.find(f=>f.gameweek===week&&[f.homeId,f.awayId].includes(clubId))||null}

export function projectAcrossWeeks({player,clubsById,fixtures,startWeek,weeks=3}){
  const out=[];
  for(let i=0;i<weeks;i++){
    const week=startWeek+i,fixture=fixtureForWeek(player.clubId,fixtures,week);
    const scoped=fixture?[fixture]:fixtures;
    const p=projectPlayer(player,clubsById,scoped);
    out.push({week,projected:p.projected,difficulty:p.difficulty,fixture});
  }
  return out;
}

export function buildMultiweekPlan({players,clubs,fixtures,squadIds,budget,startWeek,weeks=3}){
  const playerById=Object.fromEntries(players.map(p=>[p.id,p])),clubsById=Object.fromEntries(clubs.map(c=>[c.id,c]));
  const squad=squadIds.map(id=>playerById[id]).filter(Boolean);
  const scores=new Map(players.map(p=>[p.id,projectAcrossWeeks({player:p,clubsById,fixtures,startWeek,weeks})]));
  const sum=id=>(scores.get(id)||[]).reduce((s,x)=>s+x.projected,0);
  const outgoing=[...squad].sort((a,b)=>sum(a.id)-sum(b.id));
  const clubCount=id=>squad.filter(p=>p.clubId===id).length;
  const moves=[];
  for(const out of outgoing){
    const max=out.price+Number(budget||0);
    const target=players.filter(p=>!squadIds.includes(p.id)&&p.position===out.position&&p.status==='available'&&p.price<=max&&clubCount(p.clubId)<3)
      .map(p=>({player:p,gain:Math.round((sum(p.id)-sum(out.id))*10)/10,total:Math.round(sum(p.id)*10)/10}))
      .filter(x=>x.gain>0).sort((a,b)=>b.gain-a.gain)[0];
    if(target){moves.push({out,target:target.player,gain:target.gain,total:target.total});if(moves.length===3)break;}
  }
  const captain=[...squad].filter(p=>p.position!=='GK'&&p.status==='available').map(p=>({player:p,total:Math.round(sum(p.id)*10)/10})).sort((a,b)=>b.total-a.total)[0]||null;
  return {moves,captain,scores,weeks};
}
