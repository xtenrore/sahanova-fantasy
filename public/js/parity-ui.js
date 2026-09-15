import { clubs, players, fixtures, gameweeks, currentGameweek } from './data.js';
import { loadState } from './state.js';
import { MANAGER_CARDS, deadlineState, nostradamusScore, lineupWeekPoints, effectiveTransferBudget, generateH2HSchedule, generateCupBracket, managerCardSummary, transferWithRules, buildAttackStartingXI } from './parity.js';
import { buildMultiweekPlan } from './planner.js';

const KEY='sahanova.parity.v1';
const clubMap=Object.fromEntries(clubs.map(c=>[c.id,c]));
const playerMap=Object.fromEntries(players.map(p=>[p.id,p]));
let moduleOpen=null;

const C={
 tr:{points:'Puanım',nostra:'Nostradamus',cards:'Menajer Kartları',status:'Statü',cups:'Kupalar',rewards:'Ödüller',discover:'Keşfet',planner:'3 Hafta Planı',back:'Geri',weekly:'Haftalık Puanlar',avg:'Ortalama',high:'En Yüksek',total:'Toplam',nostraPts:'Nostradamus',rank:'Hafta Sırası',lineup:'Hafta Kadrosu',savePred:'Tahminlerini kaydet',complete:'9/9 tahmin tamamlandı',incomplete:'Tüm maçları tahmin et',correct:'Doğru sonuç',completion:'Tamamlama bonusu',active:'Aktif',used:'Kullanıldı',activate:'Etkinleştir',free:'SahaNova’da ücretsiz',oneCard:'Her maç haftasında yalnızca bir kart etkinleştirilebilir.',deadline:'Kadro kilidi',open:'Açık',locked:'Kilitli',cardCutoff:'Kart işlemleri',ready:'Hazır',todo:'Tamamlanmalı',teamSaved:'Kadro kaydı',predictions:'Tahminler',transfer:'Transferler',unlimited:'Sınırsız',autoSub:'Otomatik değişiklik',benchOrder:'Yedek sırası',moveUp:'Yukarı',moveDown:'Aşağı',autoLeagues:'Otomatik Ligler',classic:'Klasik',h2h:'Kafa Kafaya',round:'Tur',cupDesc:'Eleme usulü kupa simülasyonu',rewardDesc:'Ücretsiz demo ödül ve mini lig merkezi',claim:'Takip Et',discoverDesc:'Form, sakatlık, fikstür ve oyun rehberi tek yerde.',plannerDesc:'Önümüzdeki haftaları birlikte değerlendirip transfer sırasını planlar.',captainPlan:'Kaptan Planı',transferPlan:'Transfer Planı',gain:'beklenen kazanç',noMove:'Şu an pozitif getirili transfer görünmüyor.',social:'Sosyal giriş',demoSocial:'Demo sosyal giriş',lockedAction:'Maç haftası kilitlendi. Bir sonraki hafta için plan yapabilirsin.',attackOnly:'2-5-3 yalnızca Hücum+ kartıyla açılır.',matchPulse:'Maç Günü Canlı Akışı',liveFantasy:'Canlı fantezi etkisi'},
 en:{points:'My Points',nostra:'Nostradamus',cards:'Manager Cards',status:'Status',cups:'Cups',rewards:'Rewards',discover:'Discover',planner:'3-Week Planner',back:'Back',weekly:'Weekly Points',avg:'Average',high:'Highest',total:'Total',nostraPts:'Nostradamus',rank:'GW Rank',lineup:'Gameweek Squad',savePred:'Save predictions',complete:'9/9 predictions complete',incomplete:'Predict every match',correct:'Correct result',completion:'Completion bonus',active:'Active',used:'Used',activate:'Activate',free:'Free in SahaNova',oneCard:'Only one manager card can be active in a gameweek.',deadline:'Squad lock',open:'Open',locked:'Locked',cardCutoff:'Card actions',ready:'Ready',todo:'Needs attention',teamSaved:'Squad save',predictions:'Predictions',transfer:'Transfers',unlimited:'Unlimited',autoSub:'Auto substitutions',benchOrder:'Bench order',moveUp:'Up',moveDown:'Down',autoLeagues:'Automatic Leagues',classic:'Classic',h2h:'Head to Head',round:'Round',cupDesc:'Knockout cup simulation',rewardDesc:'Free demo rewards and mini-league hub',claim:'Track',discoverDesc:'Form, injuries, fixtures and game guides in one place.',plannerDesc:'Plan transfer order using the next few gameweeks together.',captainPlan:'Captain Plan',transferPlan:'Transfer Plan',gain:'expected gain',noMove:'No positive-gain transfer is available right now.',social:'Social sign-in',demoSocial:'Demo social sign-in',lockedAction:'This gameweek is locked. You can plan for the next one.',attackOnly:'2-5-3 unlocks only with the Attack+ card.',matchPulse:'Matchday Live Pulse',liveFantasy:'Live fantasy impact'}
};

function lang(){return loadState().language==='en'?'en':'tr'}
function tx(){return C[lang()]}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function readParity(){
 const base={predictions:{},activeCardByWeek:{},usedCards:[],benchOrder:[],savedWeeks:[],trackedRewards:[],cupType:'nova',leagueMode:'classic'};
 try{return {...base,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return base}
}
function writeParity(p){localStorage.setItem(KEY,JSON.stringify(p));return p}
function activeCard(){return readParity().activeCardByWeek?.[currentGameweek]||null}
function currentFixtures(){return fixtures.filter(f=>f.gameweek===currentGameweek)}
function deadline(){return deadlineState(gameweeks,currentGameweek)}
function formatLeft(ms){if(ms<=0)return tx().locked;const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000);return `${d}g ${String(h).padStart(2,'0')}s ${String(m).padStart(2,'0')}d`}
function badge(id){const c=clubMap[id];return `<span class="parity-club" style="--c1:${c?.primary||'#8cf'};--c2:${c?.secondary||'#123'}">${esc(c?.short?.slice(0,2)||'SN')}</span>`}
function icon(x){return `<span class="parity-glyph" aria-hidden="true">${x}</span>`}
function appState(){return loadState()}
function writeAppState(next){localStorage.setItem('sahanova.state.v1',JSON.stringify(next));return next}
function playerName(id){return playerMap[id]?.name||'—'}
function teamBench(s){const raw=s.squadIds.filter(id=>!s.startingIds.includes(id));const p=readParity();const known=(p.benchOrder||[]).filter(id=>raw.includes(id));return [...known,...raw.filter(id=>!known.includes(id))]}
function weeklyHistory(s){
 const vals=[38,52,61,44,Number(s.weekPoints||64),57,69,73];return vals.map((points,i)=>({week:i+1,points,rank:Math.max(1,Math.round(s.overallRank*(1+(4-i)*.08))),nostra:i===4?nostradamusScore(readParity().predictions?.[currentGameweek]||{},currentFixtures()).total:(i*3)%6}));
}
function customHeader(title,sub=''){return `<div class="parity-page-head"><button class="parity-back" data-parity-back>‹ ${tx().back}</button><div><span class="parity-kicker">SAHANOVA PARITY+</span><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div></div>`}

function renderPoints(){
 const s=appState(),history=weeklyHistory(s),p=readParity(),bench=teamBench(s),line=lineupWeekPoints({startingIds:s.startingIds,benchOrder:bench,playersById:playerMap,captainId:s.captainId,viceCaptainId:s.viceCaptainId,activeCard:activeCard()});const average=Math.round(history.reduce((a,b)=>a+b.points,0)/history.length),high=Math.max(...history.map(x=>x.points)),nTotal=history.reduce((a,b)=>a+b.nostra,0);
 return customHeader(tx().points,tx().weekly)+`<section class="parity-score-hero"><div><span>${tx().total}</span><b>${s.totalPoints}</b><small>${tx().rank} #${s.overallRank.toLocaleString()}</small></div><div class="parity-score-grid"><span><b>${average}</b><small>${tx().avg}</small></span><span><b>${high}</b><small>${tx().high}</small></span><span><b>${line.total}</b><small>${tx().weekly}</small></span><span><b>${nTotal}</b><small>${tx().nostraPts}</small></span></div></section><section class="parity-panel"><h2>${tx().weekly}</h2><div class="parity-week-bars">${history.map(x=>`<button><i style="--h:${Math.max(20,Math.min(100,x.points))}%"></i><b>${x.points}</b><small>H${x.week}</small></button>`).join('')}</div></section><section class="parity-panel"><div class="parity-section-head"><h2>${tx().lineup}</h2><span>${activeCard()?MANAGER_CARDS.find(c=>c.id===activeCard())?.[lang()]||activeCard():''}</span></div><div class="parity-lineup-list">${line.resolvedStartingIds.map(id=>`<div>${badge(playerMap[id].clubId)}<span><b>${esc(playerName(id))}</b><small>${playerMap[id].position}</small></span><strong>${playerMap[id].weekPoints}${line.captainId===id?` ×${line.captainMultiplier}`:''}</strong></div>`).join('')}</div></section>`;
}

function renderNostra(){
 const p=readParity(),pred=p.predictions?.[currentGameweek]||{},list=currentFixtures(),score=nostradamusScore(pred,list),d=deadline();
 return customHeader(tx().nostra,tx().predictions)+`<section class="parity-summary-strip"><span class="${score.complete?'ok':''}"><b>${Object.keys(pred).length}/${list.length}</b><small>${score.complete?tx().complete:tx().incomplete}</small></span><span><b>${score.correct}</b><small>${tx().correct}</small></span><span><b>+${score.completionPoint}</b><small>${tx().completion}</small></span><span><b>${formatLeft(d.msLeft)}</b><small>${tx().deadline}</small></span></section><div class="parity-predictions">${list.map(f=>{const h=clubMap[f.homeId],a=clubMap[f.awayId],v=pred[f.id]||{};return `<article><div>${badge(h.id)}<span><b>${esc(h.name)}</b><small>${new Date(f.start).toLocaleString(lang()==='tr'?'tr-TR':'en-US',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</small></span></div><div class="parity-score-input"><input inputmode="numeric" min="0" max="12" ${d.locked?'disabled':''} data-pred-home="${f.id}" value="${Number.isInteger(v.home)?v.home:''}"><i>:</i><input inputmode="numeric" min="0" max="12" ${d.locked?'disabled':''} data-pred-away="${f.id}" value="${Number.isInteger(v.away)?v.away:''}"></div><div class="away"><span><b>${esc(a.name)}</b><small>${f.status==='live'?`${f.minute||0}'`:f.status}</small></span>${badge(a.id)}</div></article>`}).join('')}</div><button class="primary parity-save" data-save-preds ${d.locked?'disabled':''}>${tx().savePred}</button>`;
}

function renderCards(){
 const p=readParity(),active=activeCard(),d=deadline();
 return customHeader(tx().cards,tx().oneCard)+`<div class="parity-card-grid">${MANAGER_CARDS.map((c,i)=>{const used=p.usedCards.includes(c.id),isActive=active===c.id;return `<article class="manager-card ${isActive?'active':''} ${used&&!isActive?'used':''}"><span class="card-index">0${i+1}</span><div class="card-art">${icon(['×3','×4','15','⚡','∞'][i])}</div><h2>${esc(c[lang()])}</h2><p>${esc(managerCardSummary(c.id,lang()))}</p><small>${tx().free}</small><button data-card="${c.id}" class="${isActive?'secondary':'primary'}" ${(active&&!isActive)||used||d.cardPurchaseClosed?'disabled':''}>${isActive?tx().active:used?tx().used:tx().activate}</button></article>`}).join('')}</div><p class="parity-footnote">${d.cardPurchaseClosed?`${tx().cardCutoff}: ${tx().locked}`:tx().oneCard}</p>`;
}

function renderStatus(){
 const p=readParity(),d=deadline(),s=appState(),pred=p.predictions?.[currentGameweek]||{},score=nostradamusScore(pred,currentFixtures()),saved=p.savedWeeks.includes(currentGameweek),card=activeCard();
 const checks=[[tx().teamSaved,saved],[tx().predictions,score.complete],[tx().transfer,true],[tx().cards,!!card]];
 return customHeader(tx().status,tx().deadline)+`<section class="parity-deadline ${d.locked?'locked':''}"><div class="deadline-ring"><span>${icon(d.locked?'■':'◌')}</span></div><div><small>${tx().deadline}</small><h2>${formatLeft(d.msLeft)}</h2><p>${d.deadline?.toLocaleString(lang()==='tr'?'tr-TR':'en-US',{dateStyle:'medium',timeStyle:'short'})||'—'}</p></div><strong>${d.locked?tx().locked:tx().open}</strong></section><div class="parity-checklist">${checks.map(([name,ok])=>`<div class="${ok?'done':''}">${icon(ok?'✓':'!')}<span><b>${name}</b><small>${ok?tx().ready:tx().todo}</small></span></div>`).join('')}</div><section class="parity-rule-cards"><article><b>∞</b><span>${tx().transfer}</span><small>${tx().unlimited}</small></article><article><b>+1</b><span>${tx().teamSaved}</span><small>${saved?tx().used:tx().ready}</small></article><article><b>${s.startingIds.length}/11</b><span>${tx().lineup}</span><small>${s.formation}</small></article><article><b>${card?MANAGER_CARDS.find(x=>x.id===card)?.[lang()]:'—'}</b><span>${tx().cards}</span><small>${card?tx().active:tx().todo}</small></article></section>`;
}

function cupNames(){return ['Nova United','Kadıköy Press','Gol Makinesi','Boğaz XI','Yüksek Pres','Son Dakika','Taktik Tahta','Rüzgâr SK']}
function renderCups(){
 const p=readParity(),types=[['nova',lang()==='tr'?'Nova Kupası':'Nova Cup',8],['sprint',lang()==='tr'?'Sprint Kupası':'Sprint Cup',8],['elite',lang()==='tr'?'Elit Kupa':'Elite Cup',8]],selected=p.cupType||'nova',def=types.find(x=>x[0]===selected)||types[0],br=generateCupBracket(cupNames(),def[2]);
 return customHeader(tx().cups,tx().cupDesc)+`<div class="parity-tabs">${types.map(x=>`<button data-cup-type="${x[0]}" class="${x[0]===selected?'active':''}">${x[1]}</button>`).join('')}</div><div class="cup-bracket"><h2>${tx().round} 1</h2>${br.rounds[0].map((m,i)=>`<article><span><b>${esc(m.home)}</b><em>${(i*3+2)%5}</em></span><i>VS</i><span><b>${esc(m.away)}</b><em>${(i*2+1)%4}</em></span></article>`).join('')}</div>`;
}

function renderRewards(){
 const p=readParity(),items=[
  {id:'weekly',title:lang()==='tr'?'Haftalık Zirve':'Weekly Peak',desc:lang()==='tr'?'Hafta sıralamasında ilk 100 hedefi':'Target a top-100 gameweek finish',progress:72},
  {id:'season',title:lang()==='tr'?'Sezon Maratonu':'Season Marathon',desc:lang()==='tr'?'Sezon boyunca istikrarlı puan topla':'Score consistently across the season',progress:48},
  {id:'mini1',title:lang()==='tr'?'Ödüllü Mini Lig — Modül 1':'Reward Mini League — Module 1',desc:lang()==='tr'?'SahaNova demo ligine ücretsiz katılım':'Free entry to a SahaNova demo league',progress:34},
  {id:'cup',title:lang()==='tr'?'Kupa Koşusu':'Cup Run',desc:lang()==='tr'?'Eleme turunda ilerle':'Advance through the knockout bracket',progress:25}
 ];
 return customHeader(tx().rewards,tx().rewardDesc)+`<div class="reward-grid">${items.map(x=>`<article><div class="reward-medal">${icon(x.id==='cup'?'◇':'★')}</div><span><h2>${esc(x.title)}</h2><p>${esc(x.desc)}</p><i><em style="width:${x.progress}%"></em></i><small>${x.progress}%</small></span><button data-reward="${x.id}" class="secondary ${p.trackedRewards.includes(x.id)?'tracked':''}">${p.trackedRewards.includes(x.id)?'✓':tx().claim}</button></article>`).join('')}</div><p class="parity-footnote">${lang()==='tr'?'Bu bölüm gerçek para veya gerçek ödül vaat etmez; ücretsiz SahaNova demo rekabet sistemidir.':'This section does not promise real-money or real-world prizes; it is a free SahaNova demo competition system.'}</p>`;
}

function renderDiscover(){
 const trending=[...players].sort((a,b)=>b.trend-a.trend).slice(0,4),flagged=players.filter(p=>p.status!=='available').slice(0,3);
 return customHeader(tx().discover,tx().discoverDesc)+`<section class="discover-hero"><div><span>SCOUT FEED</span><h2>${lang()==='tr'?'Yetenek Avcısı':'Scout Desk'}</h2><p>${lang()==='tr'?'Kadronu etkileyen sinyalleri tek akışta gör.':'See the signals that can change your squad in one feed.'}</p></div>${icon('⌁')}</section><div class="discover-grid"><section class="parity-panel"><h2>${lang()==='tr'?'Trend Oyuncular':'Trending Players'}</h2>${trending.map(p=>`<button class="discover-player" data-parity-player="${p.id}">${badge(p.clubId)}<span><b>${esc(p.name)}</b><small>${p.form} form · ${p.totalPoints} ${tx().total}</small></span><strong>▲ ${p.trend.toLocaleString()}</strong></button>`).join('')}</section><section class="parity-panel"><h2>${lang()==='tr'?'Kadro Haberleri':'Squad News'}</h2>${flagged.map(p=>`<div class="news-row">${badge(p.clubId)}<span><b>${esc(p.name)}</b><small>${p.status==='injury'?(lang()==='tr'?'Sakatlık takibi':'Injury watch'):p.status==='suspended'?(lang()==='tr'?'Cezalı':'Suspended'):(lang()==='tr'?'Şüpheli':'Doubtful')}</small></span></div>`).join('')}</section></div><section class="parity-panel guide"><h2>${lang()==='tr'?'Oyun Rehberi':'Game Guide'}</h2><div><article><b>01</b><span>${lang()==='tr'?'Kadro ve yedek sırası':'Squad & bench order'}</span></article><article><b>02</b><span>Nostradamus</span></article><article><b>03</b><span>${tx().cards}</span></article><article><b>04</b><span>${lang()==='tr'?'Ligler ve kupalar':'Leagues & cups'}</span></article></div></section>`;
}

function renderPlanner(){
 const s=appState(),plan=buildMultiweekPlan({players,clubs,fixtures,squadIds:s.squadIds,budget:s.budget,startWeek:currentGameweek,weeks:3});
 return customHeader(tx().planner,tx().plannerDesc)+`<section class="planner-captain"><span>${icon('♛')}<small>${tx().captainPlan}</small><h2>${esc(plan.captain?.player.name||'—')}</h2><p>${plan.captain?.total||0} ${tx().weekly}</p></span><div>${[0,1,2].map(i=>`<i><b>H${currentGameweek+i}</b><small>${plan.captain?plan.scores.get(plan.captain.player.id)?.[i]?.projected||0:0}</small></i>`).join('')}</div></section><section class="parity-panel"><h2>${tx().transferPlan}</h2><div class="planner-moves">${plan.moves.length?plan.moves.map((m,i)=>`<article><strong>0${i+1}</strong><div>${badge(m.out.clubId)}<span><b>${esc(m.out.name)}</b><small>OUT</small></span></div><i>→</i><div>${badge(m.target.clubId)}<span><b>${esc(m.target.name)}</b><small>IN · +${m.gain.toFixed(1)} ${tx().gain}</small></span></div></article>`).join(''):`<div class="empty-state">${tx().noMove}</div>`}</div></section>`;
}

function renderModule(key){return key==='points'?renderPoints():key==='nostra'?renderNostra():key==='cards'?renderCards():key==='status'?renderStatus():key==='cups'?renderCups():key==='rewards'?renderRewards():key==='discover'?renderDiscover():renderPlanner()}
function titleFor(key){return tx()[key]||'SahaNova'}
function openModule(key){moduleOpen=key;const screen=document.getElementById('screen');if(!screen)return;screen.innerHTML=`<div class="parity-page">${renderModule(key)}</div>`;const top=document.querySelector('.top-title>span');if(top)top.textContent=titleFor(key);bindModule(screen)}
function closeModule(){moduleOpen=null;document.querySelector('.nav-item[data-nav="more"]')?.click()||document.querySelector('[data-nav="more"]')?.click()}

function bindModule(screen){
 screen.querySelector('[data-parity-back]')?.addEventListener('click',closeModule);
 screen.querySelectorAll('[data-pred-home],[data-pred-away]').forEach(input=>input.addEventListener('change',()=>{const p=readParity(),week={...(p.predictions?.[currentGameweek]||{})},id=input.dataset.predHome||input.dataset.predAway,cur={...(week[id]||{})};cur[input.dataset.predHome?'home':'away']=Math.max(0,Math.min(12,Number(input.value)||0));week[id]=cur;p.predictions={...p.predictions,[currentGameweek]:week};writeParity(p)}));
 screen.querySelector('[data-save-preds]')?.addEventListener('click',()=>openModule('nostra'));
 screen.querySelectorAll('[data-card]').forEach(b=>b.addEventListener('click',()=>{const p=readParity();if(p.activeCardByWeek?.[currentGameweek]||p.usedCards.includes(b.dataset.card))return;p.activeCardByWeek={...p.activeCardByWeek,[currentGameweek]:b.dataset.card};p.usedCards=[...p.usedCards,b.dataset.card];writeParity(p);openModule('cards')}));
 screen.querySelectorAll('[data-cup-type]').forEach(b=>b.addEventListener('click',()=>{const p=readParity();p.cupType=b.dataset.cupType;writeParity(p);openModule('cups')}));
 screen.querySelectorAll('[data-reward]').forEach(b=>b.addEventListener('click',()=>{const p=readParity();if(!p.trackedRewards.includes(b.dataset.reward))p.trackedRewards=[...p.trackedRewards,b.dataset.reward];writeParity(p);openModule('rewards')}));
 screen.querySelectorAll('[data-parity-player]').forEach(b=>b.addEventListener('click',()=>{moduleOpen=null;document.querySelector('.nav-item[data-nav="transfer"]')?.click();setTimeout(()=>document.querySelector(`[data-player="${CSS.escape(b.dataset.parityPlayer)}"]`)?.click(),50)}));
}

function enhanceMore(screen){
 const grid=screen.querySelector('.more-grid');if(!grid||grid.querySelector('[data-parity-open]'))return;
 const tiles=[['points','◫'],['nostra','◎'],['cards','✦'],['status','◷'],['cups','◇'],['rewards','★'],['discover','⌁'],['planner','↗']];
 grid.insertAdjacentHTML('beforeend',tiles.map(([k,g])=>`<button class="more-tile parity-more" data-parity-open="${k}"><span class="tile-icon">${icon(g)}</span><span><b>${tx()[k]}</b><small>${k==='planner'?'Nova IQ':k==='status'?tx().deadline:'SahaNova'}</small></span><span>›</span></button>`).join(''));
 grid.querySelectorAll('[data-parity-open]').forEach(b=>b.addEventListener('click',()=>openModule(b.dataset.parityOpen)));
}

function enhanceTeam(screen){
 if(screen.querySelector('.parity-team-tools'))return;const s=appState(),p=readParity(),d=deadline(),bench=teamBench(s),active=activeCard();
 const html=`<section class="parity-team-tools"><div class="parity-lock-chip ${d.locked?'locked':''}">${icon(d.locked?'■':'◷')}<span><small>${tx().deadline}</small><b>${formatLeft(d.msLeft)}</b></span></div><div class="parity-bench-editor"><div><small>${tx().autoSub}</small><b>${tx().benchOrder}</b></div>${bench.map((id,i)=>`<button data-bench-id="${id}" data-bench-index="${i}"><span>${i+1}</span>${badge(playerMap[id].clubId)}<em>${esc(playerMap[id].name.split(' ').pop())}</em><i>${i?`↑`:''}${i<bench.length-1?`↓`:''}</i></button>`).join('')}</div>${active?`<div class="parity-active-card"><span>✦</span><div><small>${tx().cards}</small><b>${MANAGER_CARDS.find(c=>c.id===active)?.[lang()]}</b></div></div>`:''}</section>`;
 screen.querySelector('.team-toolbar')?.insertAdjacentHTML('afterend',html);
 screen.querySelectorAll('[data-bench-id]').forEach(b=>b.addEventListener('click',e=>{const id=b.dataset.benchId,idx=Number(b.dataset.benchIndex),arr=teamBench(appState()),rect=b.getBoundingClientRect(),up=e.clientY<rect.top+rect.height/2;const ni=up?idx-1:idx+1;if(ni<0||ni>=arr.length)return;[arr[idx],arr[ni]]=[arr[ni],arr[idx]];const next=readParity();next.benchOrder=arr;writeParity(next);document.querySelector('.nav-item[data-nav="team"]')?.click()}));
 if(active==='attack'){const scroll=screen.querySelector('.formation-scroll');if(scroll&&!scroll.querySelector('[data-parity-formation]')){scroll.insertAdjacentHTML('beforeend',`<button class="formation-pill ${s.formation==='2-5-3'?'active':''}" data-parity-formation="2-5-3">2-5-3 · ⚡</button>`);scroll.querySelector('[data-parity-formation]')?.addEventListener('click',()=>{if(deadline().locked)return;const state=appState(),startingIds=buildAttackStartingXI(state.squadIds,playerMap),captainId=startingIds.includes(state.captainId)?state.captainId:startingIds.find(id=>playerMap[id]?.position==='FWD')||startingIds[0],viceCaptainId=startingIds.includes(state.viceCaptainId)&&state.viceCaptainId!==captainId?state.viceCaptainId:startingIds.find(id=>id!==captainId);writeAppState({...state,formation:'2-5-3',startingIds,captainId,viceCaptainId});location.reload()})}}
 if(d.locked){screen.querySelectorAll('[data-formation],#save-squad,[data-parity-formation]').forEach(x=>x.disabled=true)}
}

function enhanceLeague(screen){
 const card=screen.querySelector('.league-card');if(!card||screen.querySelector('.parity-league-addon'))return;const p=readParity(),mode=p.leagueMode||'classic';const names=['Nova United','Kadıköy Press','Gol Makinesi','Boğaz XI','Yüksek Pres','Son Dakika'];const rounds=generateH2HSchedule(names);
 card.insertAdjacentHTML('beforebegin',`<section class="parity-league-addon"><div class="parity-section-head"><div><small>${tx().autoLeagues}</small><b>${lang()==='tr'?'Genel · Şehir · Favori Kulüp':'Overall · City · Favorite Club'}</b></div><div class="parity-tabs"><button data-league-mode="classic" class="${mode==='classic'?'active':''}">${tx().classic}</button><button data-league-mode="h2h" class="${mode==='h2h'?'active':''}">${tx().h2h}</button></div></div>${mode==='h2h'?`<div class="h2h-round"><h3>${tx().round} 1</h3>${rounds[0].map((m,i)=>`<div><span>${esc(m.home)}</span><b>${(i+2)%4} : ${(i+1)%3}</b><span>${esc(m.away)}</span></div>`).join('')}</div>`:''}</section>`);
 screen.querySelectorAll('[data-league-mode]').forEach(b=>b.addEventListener('click',()=>{const n=readParity();n.leagueMode=b.dataset.leagueMode;writeParity(n);document.querySelector('[data-more="leagues"]')?.click()}));
}

function enhanceMatches(screen){
 const head=screen.querySelector('.match-header');if(!head||screen.querySelector('.parity-match-pulse'))return;const live=fixtures.filter(f=>f.status==='live');head.insertAdjacentHTML('afterend',`<section class="parity-match-pulse"><div><span class="pulse-ball">●</span><span><small>${tx().matchPulse}</small><b>${live.length?`${live.length} ${tx().liveFantasy}`:tx().ready}</b></span></div><div class="pulse-track">${live.map(f=>`<i><em style="--x:${Math.min(92,(f.minute||1))}%"></em><small>${clubMap[f.homeId].short} ${f.homeScore}-${f.awayScore} ${clubMap[f.awayId].short}</small></i>`).join('')}</div></section>`);
}

function enhanceAuth(){
 const form=document.getElementById('auth-form');if(!form||document.querySelector('.parity-social'))return;const submit=form.querySelector('button[type="submit"]');if(!submit)return;const box=document.createElement('div');box.className='parity-social';box.innerHTML=`<span>${tx().social}</span><div><button type="button" data-social="google">G</button><button type="button" data-social="apple">●</button><button type="button" data-social="x">X</button></div><small>${tx().demoSocial}</small>`;submit.after(box);box.querySelectorAll('[data-social]').forEach(b=>b.addEventListener('click',()=>{const email=form.querySelector('input[name="email"]'),pass=form.querySelector('input[name="password"]');if(email)email.value='demo@sahanova.local';if(pass)pass.value='demo1234';form.requestSubmit()}));
}

function enhance(){
 enhanceAuth();const screen=document.getElementById('screen');if(!screen)return;if(moduleOpen){if(!screen.querySelector('.parity-page'))openModule(moduleOpen);return}
 if(screen.querySelector('.more-grid'))enhanceMore(screen);if(screen.querySelector('.team-toolbar'))enhanceTeam(screen);if(screen.querySelector('.league-card'))enhanceLeague(screen);if(screen.querySelector('.match-header'))enhanceMatches(screen);
 document.querySelectorAll('.transfer-balance small,.hero-mini span:nth-child(2)').forEach(el=>{if(el.textContent&&!el.textContent.includes('∞'))el.innerHTML=el.innerHTML.replace(/^\s*\d+/,'∞')});
 const s=appState(),card=activeCard(),eff=effectiveTransferBudget(s.budget,card),budgetText=Number.isFinite(eff)?`₺${eff.toFixed(1)}m`:'∞';document.querySelectorAll('.transfer-balance b,.squad-budget b').forEach(el=>el.textContent=budgetText);
}

function saveSquadBonus(){const p=readParity();if(p.savedWeeks.includes(currentGameweek))return;p.savedWeeks=[...p.savedWeeks,currentGameweek];writeParity(p);const s=appState();writeAppState({...s,weekPoints:Number(s.weekPoints||0)+1,totalPoints:Number(s.totalPoints||0)+1})}
function showParityToast(message){let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)}el.className='toast show error';el.textContent=message;setTimeout(()=>el.classList.remove('show'),2400)}
function interceptTransfer(button){const incomingName=document.querySelector('.transfer-modal .incoming-card b')?.textContent?.trim(),incoming=players.find(p=>p.name===incomingName),state=appState();if(!incoming)return false;const result=transferWithRules({state,outId:button.dataset.outgoing,inId:incoming.id,players,activeCard:activeCard()});if(!result.ok){showParityToast(result.reason==='budget'?(lang()==='tr'?'Bütçe aşıldı.':'Budget exceeded.'):result.reason==='club'?(lang()==='tr'?'Kulüp limiti aşıldı.':'Club limit exceeded.'):(lang()==='tr'?'Transfer uygun değil.':'Transfer is not valid.'));return true}const newStarting=state.startingIds.map(id=>id===button.dataset.outgoing?incoming.id:id),captainId=state.captainId===button.dataset.outgoing?incoming.id:state.captainId,viceCaptainId=state.viceCaptainId===button.dataset.outgoing?incoming.id:state.viceCaptainId;writeAppState({...state,squadIds:result.next,startingIds:newStarting,budget:result.nextBudget,captainId,viceCaptainId,transfersLeft:999,transfersMade:Number(state.transfersMade||0)+1});location.reload();return true}
document.addEventListener('click',e=>{
 const target=e.target.closest('button,[data-outgoing]');if(!target)return;
 const d=deadline();
 if(target.matches('[data-outgoing]')){e.preventDefault();e.stopImmediatePropagation();if(d.locked){showParityToast(tx().lockedAction);return}interceptTransfer(target);return}
 if(target.id==='save-squad')saveSquadBonus();
 if(!d.locked)return;
 if(target.matches('[data-formation],[data-captain],[data-vice],[data-toggle-start],[data-buy],#save-squad')){e.preventDefault();e.stopImmediatePropagation();showParityToast(tx().lockedAction)}
},true);
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
new MutationObserver(queue).observe(document.getElementById('app'),{childList:true,subtree:true});
queue();
