import {activityIdFor,practicePool,speakingActivities} from './core.js';

export const FORMAT='english11-speaking-progress';
export const STORAGE_KEY='english11-speaking.user-data.v1';
export const MAX_BYTES=4*1024*1024;
export function initialState(units){return {version:1,prefs:{section:'practice',mode:'daily',unitId:units[0]?.id||'',activityId:units[0]?.activities[0]?.id||'',index:0,customIds:[],hintLevel:'meaning'},phrases:[],cards:[]};}
export function validateState(value,units,exercises){
  const fail=m=>{throw Error(`Invalid progress: ${m}`);};
  const obj=(v,keys)=>{if(!v||Array.isArray(v)||typeof v!=='object'||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!(k in v)))fail('object fields');};
  const str=(v,max=10000,blank=true)=>{if(typeof v!=='string'||v.length>max||(!blank&&!v.trim()))fail('text length');};
  const id=v=>{str(v,100,false);if(!/^[A-Za-z0-9_-]+$/.test(v))fail('ID');};
  const integer=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail('number bounds');};
  const iso=v=>{str(v,30,false);if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v)fail('date');};
  obj(value,['version','prefs','phrases','cards']);if(value.version!==1)fail('version');
  value=structuredClone(value);
  const p=value.prefs;
  if(!p||typeof p!=='object'||Array.isArray(p))fail('preferences');
  if(!Object.hasOwn(p,'hintLevel'))p.hintLevel='meaning';
  const legacy=Object.hasOwn(p,'lesson');
  obj(p,['section','mode','unitId',legacy?'lesson':'activityId','index','customIds','hintLevel']);
  if(!['guided','starters','meaning'].includes(p.hintLevel))fail('support level');
  if(!['practice','daily'].includes(p.section)||!['daily','custom'].includes(p.mode)||!units.some(u=>u.id===p.unitId))fail('preferences');
  integer(p.index,0,100000);
  if(!Array.isArray(p.customIds)||p.customIds.length>exercises.length||new Set(p.customIds).size!==p.customIds.length||p.customIds.some(x=>!exercises.some(e=>e.id===x)))fail('Custom IDs');
  const rows=exercises.filter(e=>e.unitId===p.unitId);
  if(legacy){
   integer(p.lesson,0,10000);
   const oldPool=rows.slice(p.lesson*10,p.lesson*10+10);
   if(!oldPool.length)fail('lesson');
   if(p.mode==='daily'&&p.index>=oldPool.length)fail('question position');
   const anchor=p.mode==='daily'?oldPool[p.index]:oldPool[0];
   p.activityId=activityIdFor(anchor);delete p.lesson;
   if(p.mode==='daily')p.index=practicePool(exercises,p).findIndex(e=>e.id===anchor.id);
  }
  if(!speakingActivities(exercises,p.unitId,units).some(a=>a.id===p.activityId))fail('activity');
  const pool=practicePool(exercises,p);
  if(p.index>=Math.max(1,pool.length))fail('question position');
  if(!Array.isArray(value.phrases)||value.phrases.length>1000||!Array.isArray(value.cards)||value.cards.length>3000)fail('item limit');
  const cards=new Map(),phrases=new Set(),drafts=new Set();
  for(const c of value.cards){
    obj(c,['id','front','back','createdAt','updatedAt','schedule']);id(c.id);if(cards.has(c.id))fail('duplicate card');cards.set(c.id,c);
    str(c.front,10000,false);str(c.back,10000,false);iso(c.createdAt);iso(c.updatedAt);
    const s=c.schedule;obj(s,['stage','step','interval','ease','reps','lapses','due']);
    if(!['new','learning','review','relearning'].includes(s.stage))fail('stage');
    integer(s.step,0,1);integer(s.interval,0,36500);integer(s.reps,0,1000000);integer(s.lapses,0,s.reps);
    if(typeof s.ease!=='number'||!Number.isFinite(s.ease)||s.ease<1.3||s.ease>3.5)fail('ease');
    if(s.stage==='review'&&(s.interval<1||s.step!==0))fail('review interval');
    if(s.stage==='new'&&(s.step!==0||s.interval!==0||s.reps!==0||s.lapses!==0))fail('new schedule');
    if(s.stage==='learning'&&s.interval!==0)fail('learning interval');iso(s.due);
  }
  for(const q of value.phrases){
    obj(q,['id','date','topic','english','meaning','reply','drafts']);id(q.id);if(phrases.has(q.id))fail('duplicate phrase');phrases.add(q.id);
    if(typeof q.date!=='string'||!/^\d{4}-\d\d-\d\d$/.test(q.date)||!Number.isFinite(Date.parse(q.date+'T00:00:00Z'))||new Date(q.date+'T00:00:00Z').toISOString().slice(0,10)!==q.date)fail('phrase date');
    str(q.topic,200);str(q.english,10000,false);str(q.meaning);str(q.reply);
    if(!Array.isArray(q.drafts)||q.drafts.length>100)fail('drafts');
    for(const d of q.drafts){obj(d,['id','front','back','cardId']);id(d.id);if(drafts.has(d.id))fail('duplicate draft');drafts.add(d.id);str(d.front);str(d.back);if(d.cardId!==null){id(d.cardId);const c=cards.get(d.cardId);if(!c||c.front!==d.front||c.back!==d.back)fail('card link');}}
  }
  return structuredClone(value);
}
export function exportProgress(state,now=new Date()){return JSON.stringify({format:FORMAT,version:1,exportedAt:now.toISOString(),user:state},null,2);}
export function importProgress(text,units,exercises){
  if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Backup exceeds the 4 MiB limit.');
  let v;try{v=JSON.parse(text);}catch{throw Error('This file is not valid JSON.');}
  if(!v||v.format!==FORMAT||v.version!==1||Object.keys(v).sort().join(',')!=='exportedAt,format,user,version'||typeof v.exportedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.exportedAt)||!Number.isFinite(Date.parse(v.exportedAt))||new Date(v.exportedAt).toISOString()!==v.exportedAt)throw Error('This is not an English 11 Speaking Trainer v1 backup.');
  return validateState(v.user,units,exercises);
}
