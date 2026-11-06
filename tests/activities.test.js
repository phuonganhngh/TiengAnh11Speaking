import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activityIdFor,practicePool,buildPrompt} from '../src/core.js';
import {initialState,validateState,importProgress,exportProgress,STORAGE_KEY} from '../src/progress.js';
import {createStore} from '../src/store.js';
import {savePhrase} from '../src/notebook.js';
import {rateSchedule} from '../src/flashcards.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url)));
const units=read('units'),exercises=read('exercises');

test('every legacy lesson/index position migrates to its exact exercise inside the source activity',()=>{
 for(const u of units)for(const [position,e] of exercises.filter(e=>e.unitId===u.id).entries()){
  const old=initialState(units);old.prefs.unitId=u.id;delete old.prefs.activityId;old.prefs.lesson=Math.floor(position/10);old.prefs.index=position%10;
  const before=structuredClone(old),next=validateState(old,units,exercises);
  assert.equal(next.prefs.activityId,activityIdFor(e),e.id);
  assert.equal(practicePool(exercises,next.prefs)[next.prefs.index].id,e.id);
  assert.deepEqual(old,before);assert.ok(!Object.hasOwn(next.prefs,'lesson'));
 }
});
test('legacy Custom position, support, phrase links and rated schedules survive migration and restore',()=>{
 const old=initialState(units);Object.assign(old.prefs,{mode:'custom',unitId:'U4',lesson:1,index:2,customIds:['U1-S01','U3-S03','U4-S11'],hintLevel:'guided'});delete old.prefs.activityId;
 savePhrase(old,{id:'phrase-1',date:'2026-10-29',topic:'',english:'Hello',meaning:'Xin chào',reply:'',drafts:[{id:'draft-1',front:'Chào',back:'Hello',cardId:null}]});old.cards[0].schedule=rateSchedule(old.cards[0].schedule,'easy');
 const raw=exportProgress(old),next=importProgress(raw,units,exercises);
 assert.equal(next.prefs.index,2);assert.equal(next.prefs.activityId,'U4-A4');assert.equal(next.prefs.hintLevel,'guided');assert.deepEqual(next.prefs.customIds,old.prefs.customIds);assert.deepEqual(next.phrases,old.phrases);assert.deepEqual(next.cards,old.cards);
 const storage={getItem:()=>JSON.stringify(old),setItem:()=>{throw Error('Unexpected write on load');}};
 const store=createStore(units,exercises,storage);assert.equal(store.isSession(),false);assert.deepEqual(store.read(),next);
});
test('new activity snapshots round-trip and invalid or mixed legacy positions are rejected',()=>{
 const next=initialState(units);Object.assign(next.prefs,{unitId:'U10',activityId:'U10-A3',index:3});assert.deepEqual(importProgress(exportProgress(next),units,exercises),next);
 for(const bad of ['missing','U2-A1',null]){const s=initialState(units);s.prefs.activityId=bad;assert.throws(()=>validateState(s,units,exercises));}
 const mixed=initialState(units);mixed.prefs.lesson=0;assert.throws(()=>validateState(mixed,units,exercises));
 const old=initialState(units);delete old.prefs.activityId;old.prefs.lesson=0;old.prefs.index=999;assert.throws(()=>validateState(old,units,exercises));
});
test('copying an activity keeps every question, its named source task and selected support',()=>{
 const prefs=initialState(units).prefs,pool=practicePool(exercises,prefs);const prompt=buildPrompt(pool,units,'guided');
 assert.equal(pool.length,4);assert.equal((prompt.match(/^Exercise \d+ \| ID:/gm)||[]).length,4);
 assert.equal((prompt.match(/Speaking activity: Star jumps/g)||[]).length,4);
 assert.ok(prompt.includes('Source task: Speaking 1.1; printed page 12; PDF page 14'));
 assert.ok(prompt.includes('Answer support: Guided answer'));assert.ok(!prompt.includes(exercises[0].model));
});
