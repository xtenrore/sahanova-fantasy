export const clubs = [
  { id:'ist', name:'İstanbul Kuzey', short:'İKZ', city:'İstanbul', primary:'#7cf65a', secondary:'#082e20', strength:5 },
  { id:'bog', name:'Boğaziçi 1907', short:'BOĞ', city:'İstanbul', primary:'#6bd7ff', secondary:'#092544', strength:5 },
  { id:'ank', name:'Ankara Kale', short:'ANK', city:'Ankara', primary:'#ffd65a', secondary:'#4f2311', strength:4 },
  { id:'izm', name:'İzmir Rüzgâr', short:'İZR', city:'İzmir', primary:'#66f0d0', secondary:'#14304a', strength:4 },
  { id:'bur', name:'Bursa Yeşil', short:'BYS', city:'Bursa', primary:'#8ef085', secondary:'#133c2c', strength:3 },
  { id:'ada', name:'Adana Ateş', short:'ADA', city:'Adana', primary:'#ff785e', secondary:'#4a1915', strength:4 },
  { id:'ant', name:'Antalya Dalga', short:'ANT', city:'Antalya', primary:'#68c9ff', secondary:'#172b4b', strength:3 },
  { id:'tra', name:'Karadeniz Fırtına', short:'KRF', city:'Trabzon', primary:'#78d5ff', secondary:'#5c1830', strength:4 },
  { id:'kon', name:'Konya Ova', short:'KON', city:'Konya', primary:'#a5f071', secondary:'#16331e', strength:3 },
  { id:'esk', name:'Eskişehir Ray', short:'ESR', city:'Eskişehir', primary:'#ff6a6a', secondary:'#242424', strength:2 },
  { id:'gaz', name:'Gaziantep Yıldız', short:'GZY', city:'Gaziantep', primary:'#f6c356', secondary:'#4b2612', strength:3 },
  { id:'sam', name:'Samsun Liman', short:'SML', city:'Samsun', primary:'#ff6b79', secondary:'#1a1b2f', strength:2 }
];

const firstNames = ['Arda','Eren','Mert','Kerem','Emir','Bora','Deniz','Yiğit','Kaan','Alp','Umut','Baran','Tuna','Onur','Ozan','Can','Doruk','Berk','Cem','Sinan','Luka','Mateo','Rafael','Niko','Milan','Leo','Jonas','Marco','Theo','Alex'];
const lastNames = ['Aydın','Demir','Kaya','Yalçın','Arslan','Şahin','Koç','Keskin','Güneş','Aksoy','Ekinci','Bulut','Karaca','Yıldız','Ergin','Toprak','Santos','Petrov','Costa','Jovanović','Silva','Mendes','Novak','Bianchi','Torres','Martins','Kovač','Larsen','Duarte','Müller'];
const positions = ['GK','DEF','DEF','DEF','MID','MID','MID','FWD'];
const basePrice = { GK:4.5, DEF:5.0, MID:6.2, FWD:7.2 };

function hash(str){ let h=2166136261; for(let i=0;i<str.length;i++){h^=str.charCodeAt(i); h=Math.imul(h,16777619)} return Math.abs(h>>>0); }
function seeded(id,min,max,decimals=0){ const v=hash(id)%10000/9999; const n=min+(max-min)*v; const p=10**decimals; return Math.round(n*p)/p; }

export const players = clubs.flatMap((club, ci) => positions.map((position, pi) => {
  const id = `${club.id}-${pi+1}`;
  const seed = hash(id);
  const name = `${firstNames[(ci*4+pi*2)%firstNames.length]} ${lastNames[(ci*3+pi*5)%lastNames.length]}`;
  const price = Math.round((basePrice[position] + seeded(id+'p',0,3.8,1) + (club.strength-3)*0.25)*10)/10;
  const totalPoints = Math.round(seeded(id+'pts',18,103) + club.strength*5 + (position==='MID'?8:0));
  const form = seeded(id+'f',2.4,9.2,1);
  const ownership = seeded(id+'o',1.2,38.8,1);
  const statusRoll = seed % 23;
  const status = statusRoll===0?'injury':statusRoll===1?'suspended':statusRoll===2?'doubtful':'available';
  const minutes = Math.round(seeded(id+'m',260,810));
  const goals = position==='GK'?0:Math.round(seeded(id+'g',0, position==='FWD'?8:position==='MID'?6:3));
  const assists = position==='GK'?0:Math.round(seeded(id+'a',0,6));
  const cleanSheets = Math.round(seeded(id+'c',0, position==='GK'||position==='DEF'?7:3));
  const saves = position==='GK'?Math.round(seeded(id+'sv',12,43)):0;
  const yellow = Math.round(seeded(id+'y',0,5));
  const red = seed%41===0?1:0;
  const trend = Math.round(seeded(id+'t',-8500,16400));
  const recent = [0,1,2,3,4].map(x=>Math.round(seeded(id+'r'+x,1,14)));
  const prices = [4,3,2,1,0].map(x=>Math.max(3.8, Math.round((price + seeded(id+'ph'+x,-0.25,0.25,1))*10)/10));
  return { id,name,clubId:club.id,position,price,totalPoints,weekPoints:recent[4],form,ownership,status,minutes,goals,assists,cleanSheets,saves,yellow,red,trend,recent,prices, value:Math.round((totalPoints/price)*10)/10 };
}));

const now = new Date();
const day = 86400000;
function at(offsetDays,hour,minute=0){ const d=new Date(now.getTime()+offsetDays*day); d.setHours(hour,minute,0,0); return d.toISOString(); }

export const gameweeks = Array.from({length:8},(_,i)=>({
  id:i+1,
  label:`Hafta ${i+1}`,
  start:at((i-4)*7,19),
  end:at((i-4)*7+3,23),
  deadline:at((i-4)*7,18,30)
}));
export const currentGameweek = 5;

const pairings = [
 ['ist','sam'],['ank','esk'],['bog','gaz'],['izm','kon'],['ada','ant'],['tra','bur'],
 ['sam','ank'],['esk','bog'],['gaz','izm'],['kon','ada'],['ant','tra'],['bur','ist'],
 ['ist','ank'],['bog','sam'],['izm','esk'],['ada','gaz'],['tra','kon'],['bur','ant']
];

export const fixtures = pairings.map((p,i)=>{
 const home=clubs.find(c=>c.id===p[0]); const away=clubs.find(c=>c.id===p[1]);
 const phase=i<2?'live':i<5?'today':i<12?'upcoming':'result';
 const start=phase==='live'?at(0,19):phase==='today'?at(0,21):phase==='upcoming'?at(2+(i%5),18+(i%3)):at(-2-(i%4),19);
 const homeScore=phase==='result'?hash('h'+i)%4:phase==='live'?1:0;
 const awayScore=phase==='result'?hash('a'+i)%3:phase==='live'&&i===1?1:0;
 const minute=phase==='live'?(i===0?67:43):null;
 return { id:`fx-${i+1}`,gameweek:phase==='result'?4:5+(phase==='upcoming'&&i>8?1:0),homeId:home.id,awayId:away.id,start,status:phase,homeScore,awayScore,minute,
   events: phase==='live'||phase==='result' ? [
     {minute:18+i,type:'goal',clubId:home.id,playerId:players.find(x=>x.clubId===home.id&&x.position==='FWD')?.id},
     ...(awayScore>0?[{minute:34+i,type:'goal',clubId:away.id,playerId:players.find(x=>x.clubId===away.id&&x.position==='MID')?.id}]:[]),
     {minute:51+i,type:'yellow',clubId:away.id,playerId:players.find(x=>x.clubId===away.id&&x.position==='DEF')?.id},
     {minute:60+i,type:'sub',clubId:home.id,playerOutId:players.find(x=>x.clubId===home.id&&x.position==='DEF')?.id,playerInId:players.find(x=>x.clubId===home.id&&x.position==='MID')?.id}
   ]:[]
 };
});

export const leaderboard = [
 {rank:1,change:2,manager:'Selin Aras',team:'Kadıköy Press',week:76,total:512},
 {rank:2,change:-1,manager:'Mert Tan',team:'Gol Makinesi',week:68,total:506},
 {rank:3,change:1,manager:'Deniz Efe',team:'Boğaz XI',week:72,total:498},
 {rank:4,change:0,manager:'SahaNova Demo',team:'Nova United',week:64,total:487},
 {rank:5,change:3,manager:'Aras Koç',team:'Yüksek Pres',week:80,total:481},
 {rank:6,change:-2,manager:'Ece Yaman',team:'Son Dakika',week:59,total:473},
 {rank:7,change:1,manager:'Can Bora',team:'Taktik Tahta',week:66,total:469}
];

export const achievements = [
 {id:'firstWin',icon:'flag',unlocked:true,progress:100},
 {id:'hundredPoints',icon:'spark',unlocked:true,progress:100},
 {id:'fiveHundredPoints',icon:'star',unlocked:false,progress:97},
 {id:'captainMaster',icon:'crown',unlocked:true,progress:100},
 {id:'transferExpert',icon:'swap',unlocked:false,progress:72},
 {id:'managerOfWeek',icon:'medal',unlocked:false,progress:40},
 {id:'top10000',icon:'rocket',unlocked:true,progress:100},
 {id:'top1000',icon:'trophy',unlocked:false,progress:18}
];


export function applyOverrides(overrides = {}) {
  for (const c of clubs) Object.assign(c, overrides.clubs?.[c.id] || {});
  for (const p of players) Object.assign(p, overrides.players?.[p.id] || {});
  for (const f of fixtures) Object.assign(f, overrides.fixtures?.[f.id] || {});
}

// Browser cache keeps admin changes usable offline; the Railway/Node bootstrap refreshes it at app startup.
if (typeof localStorage !== 'undefined') {
  try { applyOverrides(JSON.parse(localStorage.getItem('sahanova.admin.overrides') || '{}')); } catch {}
}
