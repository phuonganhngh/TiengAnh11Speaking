import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {speakingActivities,activityIdFor,practicePool,buildPrompt,localDate} from '../src/core.js';
import {newSchedule,rateSchedule,dueCards,MINUTE,DAY} from '../src/flashcards.js';
import {uid,savePhrase,editCard,deleteCard} from '../src/notebook.js';
import {initialState,validateState,exportProgress,importProgress,MAX_BYTES,STORAGE_KEY} from '../src/progress.js';
import {createStore} from '../src/store.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url)));
const units=read('units'),exercises=read('exercises');
const initial=()=>initialState(units),now=Date.parse('2026-10-29T01:00:00.000Z');
const phrase=(drafts=[],id=uid())=>({id,date:'2026-10-29',topic:'Test',english:'Could you help me?',meaning:'Bạn giúp tôi được không?',reply:'Of course.',drafts:drafts.map(d=>({id:uid(),front:d[0],back:d[1],cardId:null}))});
const delay=(s,r)=>Date.parse(rateSchedule(s,r,now).due)-now;
test('Daily follows source Speaking activities and Custom follows its explicit selection',()=>{
 assert.equal(exercises.length,87);assert.equal(new Set(exercises.map(e=>e.id)).size,87);
 assert.deepEqual(speakingActivities(exercises,'U1',units).map(a=>a.exercises.length),[4,1,1,1]);
 assert.deepEqual(practicePool(exercises,{mode:'daily',unitId:'U1',activityId:'U1-A1'}).map(e=>e.id),['U1-S01','U1-S02','U1-S03','U1-S04']);
 const prefs={mode:'custom',customIds:['U4-S11','U1-S02']};
 assert.deepEqual(practicePool(exercises,prefs).map(e=>e.id),['U1-S02','U4-S11']);
 assert.equal(activityIdFor(exercises.find(e=>e.id==='U8-S01')),'U8-A1');
});
test('bank has complete provenance, meaningful fields and every dedicated task',()=>{
 for(const e of exercises){for(const k of ['id','unitId','topic','goal','english','vietnamese','hint','model'])assert.ok(e[k].trim());assert.equal(e.source.pdfPage,e.source.printedPage+2);assert.equal(e.modelProvenance.origin,'authored');assert.ok(['source','adapted','authored'].includes(e.source.origin));}
 for(const u of units)for(const n of [1,2,3,4]){if(u.id==='U2'&&n===4)continue;assert.ok(exercises.some(e=>e.unitId===u.id&&e.source.task.startsWith(String(n))),`${u.id} task ${n}`);}
});
test('copy field allowlist excludes secret model and answer metadata at all counts',()=>{
 for(const count of [1,5,10]){const pool=exercises.slice(0,count).map(e=>({...e,model:'FORBIDDEN_MODEL',answerKey:'FORBIDDEN_KEY',scaffold:{keywords:['FORBIDDEN_KEYWORD'],frame:'FORBIDDEN_STARTER',frameAnswers:['FORBIDDEN_PHRASE']}}));const text=buildPrompt(pool,units);assert.equal((text.match(/^Exercise \d+ \| ID:/gm)||[]).length,count);assert.ok(!text.includes('FORBIDDEN'));for(const e of pool){assert.ok(text.includes(e.english));assert.ok(text.includes(e.vietnamese));assert.ok(text.includes(e.hint));}assert.ok(text.includes('Do not advance before that command'));}
 assert.throws(()=>buildPrompt([],units));
});
test('all 39 activity titles map to source tasks without losing or duplicating questions',()=>{
 const groups=units.flatMap(u=>speakingActivities(exercises,u.id,units));assert.equal(groups.length,39);
 assert.deepEqual(groups.flatMap(a=>a.exercises.map(e=>e.id)),exercises.map(e=>e.id));
 for(const u of units)for(const a of speakingActivities(exercises,u.id,units)){
  const metadata=u.activities.find(x=>x.id===a.id);assert.ok(metadata.title);assert.equal(metadata.titleOrigin,'authored');
  assert.ok(a.exercises.every(e=>activityIdFor(e)===a.id));
 }
});
test('browser local date uses local calendar components',()=>{assert.equal(localDate(new Date(2026,0,2,1,0)), '2026-01-02');});
test('new/learning exact intervals and graduation',()=>{
 const s=newSchedule(now);assert.equal(delay(s,'again'),MINUTE);assert.equal(delay(s,'hard'),6*MINUTE);assert.equal(delay(s,'good'),10*MINUTE);assert.equal(delay(s,'easy'),4*DAY);
 const step=rateSchedule(s,'good',now);assert.equal(step.step,1);assert.equal(delay(step,'hard'),10*MINUTE);assert.equal(delay(step,'good'),DAY);assert.equal(rateSchedule(step,'good',now).stage,'review');
 const again=rateSchedule(step,'again',now);assert.equal(again.step,0);assert.equal(delay(again,'hard'),6*MINUTE);
});
test('review growth, ease bounds, lapse and relearning retain reduced interval',()=>{
 const s={...newSchedule(now),stage:'review',interval:10,reps:5};
 assert.equal(delay(s,'hard'),12*DAY);assert.equal(delay(s,'good'),25*DAY);assert.equal(delay(s,'easy'),33*DAY);
 const lapse=rateSchedule(s,'again',now);assert.equal(lapse.lapses,1);assert.equal(lapse.stage,'relearning');assert.equal(lapse.interval,5);assert.equal(delay(lapse,'good'),10*MINUTE);
 const step=rateSchedule(lapse,'good',now);assert.equal(delay(step,'good'),5*DAY);
 assert.equal(rateSchedule({...s,ease:1.3},'hard',now).ease,1.3);assert.equal(rateSchedule({...s,ease:3.5},'easy',now).ease,3.5);
 assert.equal(rateSchedule({...s,interval:36500},'easy',now).interval,36500);assert.throws(()=>rateSchedule(s,'wrong',now));
});
test('due cards exclude future cards and learning/review precede new',()=>{
 const cards=['new','learning','review'].map((stage,i)=>({id:`c${i}`,schedule:{...newSchedule(now),stage}}));cards.push({id:'future',schedule:newSchedule(now+MINUTE)});
 assert.deepEqual(dueCards(cards,now).map(c=>c.id),['c1','c2','c0']);assert.equal(dueCards(cards,now-1).length,0);assert.equal(dueCards(cards,now+MINUTE).length,4);
});
test('phrase Save atomic content: blank/incomplete pairs; duplicates suppressed',()=>{
 const s=initial(),p=phrase([['',''],['dangling',''],['Xin chào','Hello'],[' xin  chào ',' hello ']]);const r=savePhrase(s,p,now);assert.equal(r.skipped,1);assert.equal(s.cards.length,1);assert.equal(s.phrases[0].drafts[2].cardId,s.phrases[0].drafts[3].cardId);validateState(s,units,exercises);savePhrase(s,s.phrases[0],now);assert.equal(s.cards.length,1);
});
test('stable draft IDs survive reorder/removal and source edits preserve ratings',()=>{
 const s=initial(),p=phrase([['Một','One'],['Hai','Two']]);savePhrase(s,p,now);const saved=s.phrases[0],first=s.cards[0];first.schedule=rateSchedule(first.schedule,'easy',now);const old=structuredClone(first);
 const edit=structuredClone(saved);edit.drafts.reverse();edit.drafts[1].front='Số một';savePhrase(s,edit,now+1000);assert.equal(s.cards.find(c=>c.id===old.id).front,'Số một');assert.deepEqual(s.cards.find(c=>c.id===old.id).schedule,old.schedule);assert.equal(s.cards.find(c=>c.id===old.id).createdAt,old.createdAt);
 const remove=structuredClone(s.phrases[0]);remove.drafts=remove.drafts.slice(0,1);savePhrase(s,remove,now);assert.equal(s.cards.length,2);
});
test('cross-source duplicate edits never overwrite another source card',()=>{
 const s=initial();savePhrase(s,phrase([['Chào','Hello']]),now);savePhrase(s,phrase([['Chào','Hello']]),now);assert.equal(s.cards.length,1);
 const edit=structuredClone(s.phrases[1]);edit.drafts[0].back='Hi there';savePhrase(s,edit,now);assert.equal(s.cards.length,2);assert.equal(s.cards.find(c=>c.id===s.phrases[0].drafts[0].cardId).back,'Hello');
});
test('deck edits propagate linked drafts; card deletion clears links without removing phrase',()=>{
 const s=initial();savePhrase(s,phrase([['Chào','Hello']]),now);savePhrase(s,phrase([['Chào','Hello']]),now);const id=s.cards[0].id;editCard(s,id,'Tạm biệt','Goodbye',now);assert.ok(s.phrases.every(p=>p.drafts[0].back==='Goodbye'));savePhrase(s,s.phrases[0],now);assert.equal(s.cards[0].back,'Goodbye');deleteCard(s,id);assert.equal(s.cards.length,0);assert.equal(s.phrases.length,2);assert.ok(s.phrases.every(p=>p.drafts[0].cardId===null));validateState(s,units,exercises);
});
test('snapshot roundtrip includes exact position, links and full schedule',()=>{
 const s=initial();s.prefs={section:'daily',mode:'custom',unitId:'U4',activityId:'U4-A4',index:1,customIds:['U1-S01','U4-S11'],hintLevel:'starters'};savePhrase(s,phrase([['Xin chào','Hello']]),now);s.cards[0].schedule=rateSchedule(s.cards[0].schedule,'again',now);const text=exportProgress(s,new Date(now));assert.deepEqual(importProgress(text,units,exercises),s);
});
test('invalid/foreign/oversized backups and bad IDs, dates, links, lengths rejected',()=>{
 assert.throws(()=>importProgress('{bad',units,exercises));assert.throws(()=>importProgress(JSON.stringify({format:'N2-kaiwa',version:1}),units,exercises));assert.throws(()=>importProgress('x'.repeat(MAX_BYTES+1),units,exercises));
 const mutations=[s=>s.version=2,s=>s.prefs.customIds=['unknown'],s=>s.prefs.index=999,s=>s.phrases[0].date='2026-02-30',s=>s.phrases[0].drafts[0].cardId='missing',s=>s.cards[0].schedule.ease=0,s=>s.cards[0].schedule.due='bad',s=>s.cards[0].front='x'.repeat(10001),s=>s.phrases.push(s.phrases[0]),s=>s.cards[0].schedule.stage='fake',s=>s.bank=[]];
 for(const mutate of mutations){const s=initial();savePhrase(s,phrase([['A','B']]),now);mutate(s);assert.throws(()=>importProgress(exportProgress(s),units,exercises));}
});
const memoryStorage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('preference and phrase writes read latest ratings from shared browser storage',async()=>{
 const storage=memoryStorage(),a=createStore(units,exercises,storage),b=createStore(units,exercises,storage);await a.transaction(s=>savePhrase(s,phrase([['A','B']]),now));await b.transaction(s=>{s.cards[0].schedule=rateSchedule(s.cards[0].schedule,'easy',now);});await a.transaction(s=>s.prefs.section='daily');assert.equal(a.read().cards[0].schedule.interval,4);
 await a.transaction(s=>savePhrase(s,phrase([['C','D']]),now));assert.equal(a.read().cards[0].schedule.interval,4);
});
test('failed durable restore is atomic; normal edits allow truthful session-only export',async()=>{
 const storage=memoryStorage();const store=createStore(units,exercises,storage);await store.transaction(s=>savePhrase(s,phrase([['A','B']]),now));const before=store.read(),replacement=initial();storage.setItem=()=>{throw Error('Quota');};await assert.rejects(store.restore(replacement));assert.deepEqual(store.read(),before);
 await store.transaction(s=>s.prefs.section='daily');assert.equal(store.isSession(),true);assert.equal(store.read().prefs.section,'daily');assert.equal(importProgress(exportProgress(store.read()),units,exercises).cards.length,1);await assert.rejects(store.restore(replacement));
});
test('denied storage still supports session work and export',async()=>{const storage={getItem(){throw Error('Denied');},setItem(){throw Error('Denied');}},notices=[];const s=createStore(units,exercises,storage,x=>notices.push(x));await s.transaction(v=>savePhrase(v,phrase(),now));assert.equal(s.isSession(),true);assert.equal(importProgress(exportProgress(s.read()),units,exercises).phrases.length,1);assert.ok(notices[0].includes('Session only'));});
test('invalid phrase transaction leaves stored snapshot untouched',async()=>{const storage=memoryStorage(),s=createStore(units,exercises,storage);await s.transaction(v=>savePhrase(v,phrase(),now));const before=storage.getItem(STORAGE_KEY);await assert.rejects(s.transaction(v=>{savePhrase(v,phrase([['A','B']]),now);v.phrases[1].date='bad';}));assert.equal(storage.getItem(STORAGE_KEY),before);});

test('deck edits cannot create normalized duplicate pairs',()=>{const s=initial();savePhrase(s,phrase([['A','B'],['C','D']]),now);const before=structuredClone(s);assert.throws(()=>editCard(s,s.cards[1].id,' a ',' b ',now));assert.deepEqual(s,before);});
