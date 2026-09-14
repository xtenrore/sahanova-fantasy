import test from 'node:test';
import assert from 'node:assert/strict';
import { players } from '../public/js/data.js';
import { createInitialSquad, validateSquad, recalcStartingXI, canTransfer, calculateFantasyPoints, fixtureDifficulty, SQUAD_RULES, scoringRulesFromConfig } from '../public/js/domain.js';

test('initial squad satisfies composition and club limits',()=>{const ids=createInitialSquad(players);const v=validateSquad(ids,players);assert.equal(ids.length,15);assert.equal(v.valid,true);assert.deepEqual(v.count,{GK:2,DEF:5,MID:5,FWD:3});assert.ok(Object.values(v.clubs).every(n=>n<=3));assert.ok(v.cost<=SQUAD_RULES.initialBudget);});

test('all supported formations produce exactly eleven starters',()=>{const ids=createInitialSquad(players);for(const formation of ['4-4-2','4-3-3','3-4-3','3-5-2','4-5-1','5-3-2','5-4-1']){const starters=recalcStartingXI(ids,formation,players,[]);assert.equal(starters.length,11,formation);assert.equal(starters.filter(id=>players.find(p=>p.id===id).position==='GK').length,1);}});

test('transfer preserves position and budget math',()=>{const ids=createInitialSquad(players);const map=Object.fromEntries(players.map(p=>[p.id,p]));const out=map[ids[0]];let incoming=null,result=null;for(const p of players.filter(p=>p.position===out.position&&!ids.includes(p.id))){const attempt=canTransfer({squadIds:ids,outId:out.id,inId:p.id,players,budget:20});if(attempt.ok){incoming=p;result=attempt;break}}assert.ok(incoming);assert.equal(result.ok,true);assert.equal(result.next.length,15);assert.equal(result.nextBudget,Math.round((20+out.price-incoming.price)*10)/10);});

test('transfer rejects a different position',()=>{const ids=createInitialSquad(players);const map=Object.fromEntries(players.map(p=>[p.id,p]));const out=map[ids[0]];const incoming=players.find(p=>p.position!==out.position&&!ids.includes(p.id));const r=canTransfer({squadIds:ids,outId:out.id,inId:incoming.id,players,budget:99});assert.equal(r.ok,false);assert.equal(r.reason,'position');});

test('scoring engine applies configurable fantasy events and captain multiplier',()=>{const events=[{type:'appearance'},{type:'sixtyMinutes'},{type:'goal'},{type:'assist'},{type:'yellow'}];assert.equal(calculateFantasyPoints(events,'MID'),9);assert.equal(calculateFantasyPoints(events,'MID',{captain:true}),18);});

test('fixture difficulty is bounded and accessible as 1..5',()=>{for(let h=1;h<=5;h++)for(let a=1;a<=5;a++){const d=fixtureDifficulty(h,a,true);assert.ok(d>=1&&d<=5);}});

test('admin scoring config can override the scoring engine',()=>{const rules=scoringRulesFromConfig({goalMID:7,assist:4,captainMultiplier:3});const events=[{type:'goal'},{type:'assist'}];assert.equal(calculateFantasyPoints(events,'MID',{rules}),11);assert.equal(calculateFantasyPoints(events,'MID',{captain:true,rules}),33);});
