const clamp=(min,max,value)=>Math.max(min,Math.min(max,value));

function nextFixture(clubId,fixtures){
 return fixtures
  .filter(f=>[f.homeId,f.awayId].includes(clubId)&&['today','upcoming'].includes(f.status))
  .sort((a,b)=>new Date(a.start)-new Date(b.start))[0]||null;
}

function fixtureDifficultyFor(clubId,clubsById,fixtures){
 const fixture=nextFixture(clubId,fixtures);
 if(!fixture)return {difficulty:3,fixture:null,opponentId:null,isHome:true};
 const isHome=fixture.homeId===clubId;
 const opponentId=isHome?fixture.awayId:fixture.homeId;
 const team=clubsById[clubId];
 const opponent=clubsById[opponentId];
 const raw=3+(opponent?.strength||3)-(team?.strength||3)+(isHome?-.45:.45);
 return {difficulty:clamp(1,5,Math.round(raw)),fixture,opponentId,isHome};
}

export function projectPlayer(player,clubsById,fixtures){
 const recent=Array.isArray(player.recent)&&player.recent.length?player.recent:[player.weekPoints||0];
 const recentAvg=recent.reduce((sum,n)=>sum+Number(n||0),0)/recent.length;
 const {difficulty,fixture,opponentId,isHome}=fixtureDifficultyFor(player.clubId,clubsById,fixtures);
 const statusFactor=player.status==='available'?1:player.status==='doubtful'?.68:player.status==='suspended'?0:.18;
 const form=Number(player.form||0);
 const value=Number(player.value||0);
 const positionBoost=player.position==='MID'?.25:player.position==='FWD'?.18:player.position==='DEF'?.12:0;
 const fixtureBoost=(3-difficulty)*.72+(isHome?.2:0);
 const raw=(recentAvg*.46+form*.47+value*.07+positionBoost+fixtureBoost)*statusFactor;
 const projected=Math.round(clamp(0,16,raw)*10)/10;
 const confidence=Math.round(clamp(42,94,58+recent.length*4+Math.abs(3-difficulty)*4-(player.status==='available'?0:18)));
 return {playerId:player.id,projected,difficulty,fixture,opponentId,isHome,confidence};
}

function clubCount(squadPlayers,clubId){return squadPlayers.filter(p=>p.clubId===clubId).length;}

export function buildManagerInsights({players,clubs,fixtures,squadIds=[],startingIds=[],captainId=null,budget=0}){
 const playerById=Object.fromEntries(players.map(p=>[p.id,p]));
 const clubsById=Object.fromEntries(clubs.map(c=>[c.id,c]));
 const squadPlayers=squadIds.map(id=>playerById[id]).filter(Boolean);
 const starterPlayers=startingIds.map(id=>playerById[id]).filter(Boolean);
 const projections=new Map(players.map(p=>[p.id,projectPlayer(p,clubsById,fixtures)]));
 const starterProjection=starterPlayers.reduce((sum,p)=>sum+(projections.get(p.id)?.projected||0),0);
 const captainProjection=projections.get(captainId)?.projected||0;
 const projectedXI=Math.round((starterProjection+captainProjection)*10)/10;
 const riskPlayers=squadPlayers
  .filter(p=>p.status!=='available'||(projections.get(p.id)?.projected||0)<3.2)
  .sort((a,b)=>{
   const statusA=a.status==='available'?0:1,statusB=b.status==='available'?0:1;
   return statusB-statusA||(projections.get(a.id)?.projected||0)-(projections.get(b.id)?.projected||0);
  });
 const healthPenalty=squadPlayers.reduce((sum,p)=>sum+(p.status==='available'?0:p.status==='doubtful'?8:p.status==='suspended'?16:18),0)+riskPlayers.filter(p=>p.status==='available').length*3;
 const squadHealth=clamp(0,100,Math.round(100-healthPenalty));
 const captainCandidates=starterPlayers
  .filter(p=>p.position!=='GK'&&p.status==='available')
  .map(p=>({player:p,...projections.get(p.id)}))
  .sort((a,b)=>b.projected-a.projected||b.player.form-a.player.form)
  .slice(0,3);
 const captainPick=captainCandidates[0]||null;
 const captainGain=captainPick?Math.max(0,Math.round((captainPick.projected-captainProjection)*10)/10):0;
 const fixtureAvg=starterPlayers.length?starterPlayers.reduce((sum,p)=>sum+(projections.get(p.id)?.difficulty||3),0)/starterPlayers.length:3;
 const fixtureEdge=Math.round((3-fixtureAvg)*10)/10;

 const outgoingPool=squadPlayers
  .map(p=>({player:p,projection:projections.get(p.id)}))
  .sort((a,b)=>{
   const riskA=a.player.status==='available'?0:2,riskB=b.player.status==='available'?0:2;
   return (riskB+(4-(b.projection?.projected||0)))-(riskA+(4-(a.projection?.projected||0)));
  });
 let transferOut=outgoingPool[0]?.player||null;
 let transferCandidates=[];
 if(transferOut){
  const maxPrice=Number(transferOut.price||0)+Number(budget||0);
  transferCandidates=players
   .filter(p=>!squadIds.includes(p.id)&&p.position===transferOut.position&&p.status==='available'&&p.price<=maxPrice&&clubCount(squadPlayers,p.clubId)<3)
   .map(p=>({player:p,...projections.get(p.id),gain:Math.round(((projections.get(p.id)?.projected||0)-(projections.get(transferOut.id)?.projected||0))*10)/10}))
   .filter(x=>x.gain>0)
   .sort((a,b)=>b.gain-a.gain||b.player.value-a.player.value)
   .slice(0,3);
 }
 const transferTarget=transferCandidates[0]||null;
 return {projectedXI,squadHealth,riskPlayers,captainCandidates,captainPick,captainGain,fixtureEdge,fixtureAvg,transferOut,transferTarget,transferCandidates,projections};
}
