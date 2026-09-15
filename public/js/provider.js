export function createFantasyDataProvider({fetchImpl=fetch,timeoutMs=3500}={}){
  async function request(path){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{const r=await fetchImpl(path,{headers:{accept:'application/json'},signal:controller.signal,cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}
    finally{clearTimeout(timer)}
  }
  return {
    async bootstrap(){try{return {source:'server',...(await request('/api/public/bootstrap'))}}catch{return {source:'offline',config:null,overrides:null}}},
    async health(){try{return await request('/api/health')}catch{return {ok:false}}}
  };
}
