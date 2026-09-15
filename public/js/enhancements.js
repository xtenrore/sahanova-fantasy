import { clubs, players, fixtures } from './data.js';
import { loadState } from './state.js';
import { buildManagerInsights } from './insights.js';

const clubMap=Object.fromEntries(clubs.map(c=>[c.id,c]));
const copy={
 tr:{hq:'Menajer Merkezi',desc:'Kadro formu, fikstür ve riskleri tek bakışta birleştiren karar merkezi.',live:'Canlı Analiz',projected:'Tahmini XI',health:'Kadro Sağlığı',captainEdge:'Kaptan Avantajı',fixture:'Fikstür Avantajı',risk:'riskli oyuncu',ready:'Kadro hazır',captain:'Kaptan Önerisi',transfer:'Transfer Önerisi',projectedPts:'tahmini puan',confidence:'güven',expected:'beklenen fark',smart:'Akıllı Hedefler',smartDesc:'Bütçe, form ve fikstüre göre öne çıkan yükseltmeler',team:'Takımım',fixtures:'Fikstür',leagues:'Ligler',bestCaptain:'En İyi Kaptan',easy:'Kolay seri',balanced:'Dengeli',tough:'Zorlu seri',budget:'Bütçe',form:'form',points:'puan'},
 en:{hq:'Manager HQ',desc:'A decision hub combining squad form, fixtures and risk at a glance.',live:'Live Analysis',projected:'Projected XI',health:'Squad Health',captainEdge:'Captain Edge',fixture:'Fixture Edge',risk:'risk players',ready:'Squad ready',captain:'Captain Pick',transfer:'Transfer Pick',projectedPts:'projected pts',confidence:'confidence',expected:'expected gain',smart:'Smart Targets',smartDesc:'Upgrades ranked by budget, form and fixtures',team:'My Team',fixtures:'Fixtures',leagues:'Leagues',bestCaptain:'Best Captain',easy:'Easy run',balanced:'Balanced',tough:'Tough run',budget:'Budget',form:'form',points:'pts'}
};
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=n=>`₺${Number(n).toFixed(1)}m`;
function badge(id){const c=clubMap[id];if(!c)return '';return `<span class="nova-club" style="--club:${c.primary};--club2:${c.secondary}">${esc(c.short.slice(0,2))}</span>`}
function stateAndIntel(){const s=loadState(),lang=s.language==='en'?'en':'tr',tx=copy[lang];const intel=buildManagerInsights({players,clubs,fixtures,squadIds:s.squadIds,startingIds:s.startingIds,captainId:s.captainId,budget:s.budget});return {s,tx,intel}}
function edgeLabel(edge,tx){return edge>.45?tx.easy:edge<-.45?tx.tough:tx.balanced}
function icon(name){const glyph={spark:'✦',team:'⌁',transfer:'⇄',calendar:'▦',trophy:'◇',crown:'♛',shield:'◆'}[name]||'•';return `<span class="nova-glyph" aria-hidden="true">${glyph}</span>`}

function renderHome(screen,{s,tx,intel}){
 if(screen.querySelector('.nova-hq'))return;
 const cap=intel.captainPick?.player,target=intel.transferTarget,riskCount=intel.riskPlayers.length;
 const el=document.createElement('section');el.className='nova-hq';el.innerHTML=`<div class="nova-hq-head"><div><span class="nova-eyebrow">NOVA IQ</span><h2>${tx.hq}</h2><p>${tx.desc}</p></div><span class="nova-live">${icon('spark')}${tx.live}</span></div><div class="nova-kpis"><article><span>${tx.projected}</span><b>${intel.projectedXI}</b><small>${tx.points}</small></article><article><span>${tx.health}</span><b>${intel.squadHealth}%</b><small>${riskCount?`${riskCount} ${tx.risk}`:tx.ready}</small></article><article><span>${tx.captainEdge}</span><b>+${intel.captainGain.toFixed(1)}</b><small>${cap?esc(cap.name.split(' ')[0]):'—'}</small></article><article><span>${tx.fixture}</span><b>${intel.fixtureEdge>0?'+':''}${intel.fixtureEdge.toFixed(1)}</b><small>${edgeLabel(intel.fixtureEdge,tx)}</small></article></div><div class="nova-advisors">${cap?`<button data-nova-player="${cap.id}"><i>${icon('crown')}</i><span><small>${tx.captain}</small><b>${esc(cap.name)}</b><em>${intel.captainPick.projected} ${tx.projectedPts} · ${intel.captainPick.confidence}% ${tx.confidence}</em></span><strong>›</strong></button>`:''}${target?`<button data-nova-buy="${target.player.id}"><i>${icon('transfer')}</i><span><small>${tx.transfer}</small><b>${esc(target.player.name)}</b><em>+${target.gain.toFixed(1)} ${tx.expected} · ${money(target.player.price)}</em></span><strong>›</strong></button>`:''}</div><div class="nova-actions"><button data-nova-nav="team">${icon('team')}<span>${tx.team}</span></button><button data-nova-nav="transfer">${icon('transfer')}<span>${tx.smart}</span></button><button data-nova-more="fixtures">${icon('calendar')}<span>${tx.fixtures}</span></button><button data-nova-more="leagues">${icon('trophy')}<span>${tx.leagues}</span></button></div>`;
 const metrics=screen.querySelector('.metric-grid');(metrics||screen.querySelector('.hero-panel'))?.after(el);
}

function renderTeam(screen,{tx,intel}){
 if(screen.querySelector('.nova-team-pulse'))return;
 const cap=intel.captainPick?.player;const el=document.createElement('section');el.className='nova-team-pulse';el.innerHTML=`<div class="nova-pulse-stats"><span>${icon('spark')}<small>${tx.projected}</small><b>${intel.projectedXI}</b></span><span>${icon('shield')}<small>${tx.health}</small><b>${intel.squadHealth}%</b></span><span>${icon('calendar')}<small>${tx.fixture}</small><b>${edgeLabel(intel.fixtureEdge,tx)}</b></span></div>${cap?`<button data-nova-player="${cap.id}"><small>${icon('crown')}${tx.bestCaptain}</small><b>${esc(cap.name)}</b><em>${intel.captainPick.projected} ${tx.projectedPts}</em></button>`:''}`;
 const toolbar=screen.querySelector('.team-toolbar');toolbar?.after(el);
}

function renderTransfer(screen,{tx,intel}){
 if(screen.querySelector('.nova-smart-market')||!intel.transferCandidates.length)return;
 const el=document.createElement('section');el.className='nova-smart-market';el.innerHTML=`<div class="nova-smart-head"><div>${icon('spark')}<span><b>${tx.smart}</b><small>${tx.smartDesc}</small></span></div></div><div class="nova-targets">${intel.transferCandidates.map((x,i)=>`<button data-nova-buy="${x.player.id}"><strong>0${i+1}</strong>${badge(x.player.clubId)}<span><b>${esc(x.player.name)}</b><small>${money(x.player.price)} · ${x.player.form} ${tx.form}</small></span><em>+${x.gain.toFixed(1)}<small>${tx.expected}</small></em></button>`).join('')}</div>`;
 screen.querySelector('.transfer-head')?.after(el);
}

function clickNav(screen){document.querySelector(`.nav-item[data-nav="${screen}"]`)?.click()||document.querySelector(`[data-nav="${screen}"]`)?.click()}
function clickMore(screen){const target=document.querySelector(`[data-more="${screen}"]`);if(target)target.click();else{clickNav('more');setTimeout(()=>document.querySelector(`[data-more="${screen}"]`)?.click(),30)}}
function openPlayer(id){const here=document.querySelector(`[data-player="${CSS.escape(id)}"]`);if(here){here.click();return}clickNav('transfer');setTimeout(()=>document.querySelector(`[data-player="${CSS.escape(id)}"]`)?.click(),40)}
function buyPlayer(id){clickNav('transfer');setTimeout(()=>document.querySelector(`[data-buy="${CSS.escape(id)}"]`)?.click(),40)}
function bind(el){el.querySelectorAll('[data-nova-nav]').forEach(b=>b.addEventListener('click',()=>clickNav(b.dataset.novaNav)));el.querySelectorAll('[data-nova-more]').forEach(b=>b.addEventListener('click',()=>clickMore(b.dataset.novaMore)));el.querySelectorAll('[data-nova-player]').forEach(b=>b.addEventListener('click',()=>openPlayer(b.dataset.novaPlayer)));el.querySelectorAll('[data-nova-buy]').forEach(b=>b.addEventListener('click',()=>buyPlayer(b.dataset.novaBuy)))}
function enhance(){const screen=document.querySelector('#screen');if(!screen)return;const context=stateAndIntel();const active=context.s.screen;if(active==='home')renderHome(screen,context);else if(active==='team')renderTeam(screen,context);else if(active==='transfer')renderTransfer(screen,context);screen.querySelectorAll('.nova-hq,.nova-team-pulse,.nova-smart-market').forEach(bind)}
let queued=false;function queueEnhance(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
new MutationObserver(queueEnhance).observe(document.getElementById('app'),{childList:true,subtree:true});
queueEnhance();
