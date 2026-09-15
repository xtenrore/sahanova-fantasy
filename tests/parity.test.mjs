import test from 'node:test';
import assert from 'node:assert/strict';
import { players, fixtures, gameweeks, currentGameweek, clubs } from '../public/js/data.js';
import { createInitialSquad, recalcStartingXI, calculateFantasyPoints } from '../public/js/domain.js';
import { deadlineState, nostradamusScore, resolveAutoSubs, lineupWeekPoints, effectiveTransferBudget, generateH2HSchedule, generateCupBracket, specialFormationAllowed, MANAGER_CARDS, transferWithRules, buildAttackStartingXI } from '../public/js/parity.js';
import { buildMultiweekPlan } from '../public/js/planner.js';

const squadIds=createInitialSquad(players);
const startingIds=recalcStartingXI(squadIds,'4-4-2',players,[]);
const playerById=Object.fromEntries(players.map(p=>[p.id,p]));

test('published scoring parity gives goalkeeper goals 10 points',()=>{
 assert.equal(calculateFantasyPoints([{type:'goal'}],'GK'),10);
 assert.equal(calculateFantasyPoints([{type:'goal'}],'DEF'),6);
});

test('unlimited budget transfer ignores affordability but preserves squad rules',()=>{
 const out=playerById[squadIds.find(id=>playerById[id].position==='FWD')];
 const incoming=players.filter(p=>p.position==='FWD'&&!squadIds.includes(p.id)).sort((a,b)=>b.price-a.price)[0];
 const state={squadIds,budget:0};
 const normal=transferWithRules({state,outId:out.id,inId:incoming.id,players});
 const unlimited=transferWithRules({state,outId:out.id,inId:incoming.id,players,activeCard:'unlimited'});
 if(!normal.ok)assert.equal(normal.reason,'budget');
 assert.equal(unlimited.ok,true);
 assert.equal(unlimited.nextBudget,0);
});

test('manager card catalog contains all five parity cards',()=>{
 assert.deepEqual(MANAGER_CARDS.map(c=>c.id),['tripleCaptain','quadCaptain','benchBoost','attack','unlimited']);
 assert.equal(effectiveTransferBudget(3,'attack'),8);
 assert.equal(effectiveTransferBudget(3,'unlimited'),Infinity);
 assert.equal(specialFormationAllowed('attack','2-5-3'),true);
 assert.equal(specialFormationAllowed(null,'2-5-3'),false);
 assert.equal(buildAttackStartingXI(squadIds,playerById).length,11);
});

test('nostradamus awards completion point plus correct results',()=>{
 const gw=fixtures.filter(f=>f.gameweek===currentGameweek);
 const predictions=Object.fromEntries(gw.map(f=>[f.id,{home:Number(f.homeScore||0),away:Number(f.awayScore||0)}]));
 const score=nostradamusScore(predictions,gw);
 assert.equal(score.complete,true);
 assert.equal(score.completionPoint,1);
 assert.ok(score.total>=1);
});

test('deadline locks at and after deadline and cards close 15 minutes before',()=>{
 const iso=gameweeks.find(g=>g.id===currentGameweek).deadline;
 const t=new Date(iso).getTime();
 assert.equal(deadlineState(gameweeks,currentGameweek,t).locked,true);
 assert.equal(deadlineState(gameweeks,currentGameweek,t-10*60*1000).cardPurchaseClosed,true);
 assert.equal(deadlineState(gameweeks,currentGameweek,t-20*60*1000).cardPurchaseClosed,false);
});

test('auto substitutions follow bench order and preserve legal formation',()=>{
 const bench=squadIds.filter(id=>!startingIds.includes(id));
 const minutes=Object.fromEntries(squadIds.map(id=>[id,90]));
 minutes[startingIds.find(id=>playerById[id].position==='MID')]=0;
 const resolved=resolveAutoSubs({startingIds,benchOrder:bench,playersById:playerById,minutesById:minutes});
 assert.equal(resolved.length,11);
 assert.ok(resolved.every(id=>minutes[id]>0));
 assert.ok(resolved.filter(id=>playerById[id].position==='DEF').length>=3);
 assert.ok(resolved.filter(id=>playerById[id].position==='FWD').length>=1);
});

test('captain cards and bench boost affect weekly lineup score',()=>{
 const bench=squadIds.filter(id=>!startingIds.includes(id));
 const captain=startingIds.find(id=>playerById[id].position!=='GK');
 const base=lineupWeekPoints({startingIds,benchOrder:bench,playersById:playerById,captainId:captain,viceCaptainId:startingIds[1]});
 const triple=lineupWeekPoints({startingIds,benchOrder:bench,playersById:playerById,captainId:captain,viceCaptainId:startingIds[1],activeCard:'tripleCaptain'});
 const boost=lineupWeekPoints({startingIds,benchOrder:bench,playersById:playerById,captainId:captain,viceCaptainId:startingIds[1],activeCard:'benchBoost'});
 assert.ok(triple.total>=base.total);
 assert.ok(boost.total>=base.total);
});

test('head-to-head and cup generators create valid competition structures',()=>{
 const names=['A','B','C','D','E','F'];
 const schedule=generateH2HSchedule(names);
 assert.equal(schedule.length,5);
 assert.equal(schedule[0].length,3);
 const cup=generateCupBracket(names,8);
 assert.equal(cup.rounds[0].length,4);
});

test('multiweek planner returns only positive-gain transfer ideas',()=>{
 const plan=buildMultiweekPlan({players,clubs,fixtures,squadIds,budget:4,startWeek:currentGameweek,weeks:3});
 assert.ok(plan.moves.length<=3);
 assert.ok(plan.moves.every(m=>m.gain>0));
 assert.ok(plan.captain?.player.position!=='GK');
});
