import test from 'node:test';
import assert from 'node:assert/strict';
import { clubs, players, fixtures } from '../public/js/data.js';
import { createInitialSquad, recalcStartingXI } from '../public/js/domain.js';
import { buildManagerInsights, projectPlayer } from '../public/js/insights.js';

const squadIds=createInitialSquad(players);
const startingIds=recalcStartingXI(squadIds,'4-4-2',players,[]);

test('player projection is bounded and includes fixture context',()=>{
 const clubsById=Object.fromEntries(clubs.map(c=>[c.id,c]));
 const p=projectPlayer(players[0],clubsById,fixtures);
 assert.ok(p.projected>=0&&p.projected<=16);
 assert.ok(p.difficulty>=1&&p.difficulty<=5);
 assert.ok(p.confidence>=42&&p.confidence<=94);
});

test('manager insights produces actionable squad intelligence',()=>{
 const result=buildManagerInsights({players,clubs,fixtures,squadIds,startingIds,captainId:startingIds[0],budget:4});
 assert.ok(result.projectedXI>0);
 assert.ok(result.squadHealth>=0&&result.squadHealth<=100);
 assert.ok(Array.isArray(result.captainCandidates));
 assert.ok(result.captainCandidates.length>0);
 assert.ok(result.transferCandidates.length<=3);
 if(result.transferTarget)assert.equal(result.transferTarget.player.position,result.transferOut.position);
});

test('captain recommendation never selects a goalkeeper',()=>{
 const result=buildManagerInsights({players,clubs,fixtures,squadIds,startingIds,captainId:startingIds[0],budget:4});
 assert.notEqual(result.captainPick?.player.position,'GK');
});
