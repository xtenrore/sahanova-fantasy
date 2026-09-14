const KEY='sahanova.state.v1';
const defaultState={
 language:'tr',theme:'dark',sounds:true,reducedMotion:false,notifications:true,screen:'home',moreScreen:null,formation:'4-4-2',favoriteClub:'ist',teamName:'Nova United',
 squadIds:[],startingIds:[],captainId:null,viceCaptainId:null,budget:3.5,transfersLeft:2,onboardingDone:false,weekPoints:64,totalPoints:487,overallRank:8421,miniLeagueRank:4,
 session:null,leagues:[{id:'l1',name:'Arkadaşlar Ligi',code:'NOVA26'}],transfersMade:4,installDismissed:false
};
export function loadState(){
 try { return {...defaultState,...JSON.parse(localStorage.getItem(KEY)||'{}')}; } catch { return {...defaultState}; }
}
export function saveState(state){ try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch{} }
export function resetState(){ localStorage.removeItem(KEY); return {...defaultState}; }
export function createStore(initial=loadState()){
 let state=initial; const listeners=new Set();
 return { get:()=>state, set(patch){state={...state,...(typeof patch==='function'?patch(state):patch)}; saveState(state); listeners.forEach(fn=>fn(state));}, subscribe(fn){listeners.add(fn); return()=>listeners.delete(fn);} };
}
