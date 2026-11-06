import {STORAGE_KEY,MAX_BYTES,validateState,initialState} from './progress.js';
export function createStore(units,exercises,storage,onStatus=()=>{}){
  let memory=initialState(units),session=false;
  const validate=v=>validateState(v,units,exercises);
  function read(){if(session)return structuredClone(memory);try{const raw=storage.getItem(STORAGE_KEY);if(raw!==null)memory=validate(JSON.parse(raw));}catch{session=true;onStatus('Session only: browser storage is unavailable or invalid. Download Progress to keep your work.');}return structuredClone(memory);}
  read();
  async function transaction(change,{restore=false}={}){
    const run=()=>{
      const base=read(),next=structuredClone(base),result=change(next);
      const checked=validate(next),raw=JSON.stringify(checked);
      if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Data exceeds the 4 MiB limit.');
      if(restore&&session)throw Error('Restore requires working browser storage. Current session has been preserved.');
      if(!session){try{storage.setItem(STORAGE_KEY,raw);}catch{if(restore)throw Error('Restore could not be saved. Current data has been preserved.');session=true;onStatus('Session only: saving failed. Download Progress to keep your work.');}}
      memory=checked;return result;
    };
    return globalThis.navigator?.locks?globalThis.navigator.locks.request(STORAGE_KEY,async()=>run()):run();
  }
  return {read,transaction,isSession:()=>session,restore:next=>transaction(s=>{for(const key of Object.keys(s))delete s[key];Object.assign(s,structuredClone(next));},{restore:true})};
}
