import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HINT_LEVELS,answerSegments,starterSegments} from '../src/hints.js';
import {initialState,validateState,exportProgress,importProgress,STORAGE_KEY} from '../src/progress.js';
import {createStore} from '../src/store.js';
import {savePhrase} from '../src/notebook.js';
import {rateSchedule} from '../src/flashcards.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url)));
const units=read('units'),exercises=read('exercises');

test('every exercise has authored, ordered keyword blanks that reconstruct the exact model',()=>{
 for(const e of exercises){
  assert.equal(e.scaffold.origin,'authored');
  assert.ok(e.scaffold.keywords.length>=2&&e.scaffold.keywords.length<=8,e.id);
  const segments=answerSegments(e),blanks=segments.filter(s=>s.blank!==null);
  assert.equal(segments.map(s=>s.text).join(''),e.model,e.id);
  assert.deepEqual(blanks.map(s=>s.text),e.scaffold.keywords,e.id);
  assert.deepEqual(blanks.map(s=>s.blank),e.scaffold.keywords.map((_,i)=>i));
  assert.ok(segments.some(s=>s.blank===null&&s.text.trim()),e.id);
  const hiddenCharacters=blanks.reduce((n,s)=>n+s.text.length,0);
  assert.ok(hiddenCharacters>0&&hiddenCharacters<e.model.length*0.7,e.id);
  assert.ok(e.scaffold.frame.includes('…'),e.id);
  assert.ok(!e.scaffold.frame.includes(e.model),e.id);
 }
});
test('bad keyword definitions fail rather than silently reveal an unblanked answer',()=>{
 assert.throws(()=>answerSegments({id:'bad',model:'First, stand here.',scaffold:{keywords:['missing']}}));
 assert.throws(()=>answerSegments({id:'bad',model:'First, stand here.',scaffold:{keywords:['']}}));
 assert.throws(()=>answerSegments({id:'bad',model:'First, stand here.',scaffold:{keywords:['stand','First']}}));
});
test('legacy v1 files migrate to meaning-only without mutating or dropping original personal data',()=>{
 const old=initialState(units);delete old.prefs.hintLevel;
 savePhrase(old,{id:'phrase-1',date:'2026-10-29',topic:'',english:'Hello',meaning:'Xin chào',reply:'',drafts:[{id:'draft-1',front:'Xin chào',back:'Hello',cardId:null}]});
 old.cards[0].schedule=rateSchedule(old.cards[0].schedule,'easy');
 const before=structuredClone(old),restored=importProgress(exportProgress(old),units,exercises);
 assert.equal(restored.prefs.hintLevel,'meaning');
 const without=structuredClone(restored);delete without.prefs.hintLevel;
 assert.deepEqual(without,before);assert.deepEqual(old,before);
 const storage={getItem:()=>JSON.stringify(old),setItem:()=>{throw Error('Unexpected migration write');}};
 const store=createStore(units,exercises,storage);assert.equal(store.isSession(),false);assert.equal(store.read().prefs.hintLevel,'meaning');
});
test('support preference survives export/restore and rejects unknown levels',()=>{
 for(const hintLevel of HINT_LEVELS){const state=initialState(units);state.prefs.hintLevel=hintLevel;assert.deepEqual(importProgress(exportProgress(state),units,exercises),state);}
 for(const bad of ['weak','',null,{},1]){const state=initialState(units);state.prefs.hintLevel=bad;assert.throws(()=>validateState(state,units,exercises));}
});
test('changing support reads the latest stored card schedule',async()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(key,value)=>{assert.equal(key,STORAGE_KEY);raw=value;}};
 const a=createStore(units,exercises,storage),b=createStore(units,exercises,storage);
 await a.transaction(s=>savePhrase(s,{id:'p',date:'2026-10-29',topic:'',english:'Hello',meaning:'',reply:'',drafts:[{id:'d',front:'Chào',back:'Hello',cardId:null}]}));
 await b.transaction(s=>s.cards[0].schedule=rateSchedule(s.cards[0].schedule,'easy'));
 const schedule=b.read().cards[0].schedule;
 await a.transaction(s=>s.prefs.hintLevel='guided');
 assert.deepEqual(a.read().cards[0].schedule,schedule);assert.equal(a.read().prefs.hintLevel,'guided');
});

test('every clickable sentence-starter slot restores the exact reviewed model',()=>{
 for(const e of exercises){const segments=starterSegments(e);assert.equal(segments.map(p=>p.text).join(''),e.model,e.id);assert.equal(segments.filter(p=>p.blank!==null).length,e.scaffold.frameAnswers.length,e.id);assert.equal(segments.filter(p=>p.blank===null).map(p=>p.text).join('…'),e.scaffold.frame,e.id);}
 const first=exercises[0];assert.deepEqual(first.scaffold.frameAnswers,['stand','your arms down by your sides','your feet slightly apart']);
});
test('invalid sentence-starter mappings are rejected',()=>{
 for(const scaffold of [{frame:'First, ….',frameAnswers:[]},{frame:'First, ….',frameAnswers:['']},{frame:'First, ….',frameAnswers:null}])assert.throws(()=>starterSegments({id:'bad',scaffold}));
});
