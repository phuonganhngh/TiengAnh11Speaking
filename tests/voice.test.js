import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPrompt,voicePattern,SUPPORT_LABELS} from '../src/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url)));
const units=read('units'),exercises=read('exercises');

test('each selected mode creates distinct self-contained Voice instructions at every copy count',()=>{
 for(const level of Object.keys(SUPPORT_LABELS))for(const count of [1,5,10]){
  const list=exercises.slice(0,count),prompt=buildPrompt(list,units,level);
  assert.ok(prompt.includes(`Answer support: ${SUPPORT_LABELS[level]}`));
  assert.equal((prompt.match(/^Exercise \d+ \| ID:/gm)||[]).length,count);
  for(const e of list){assert.ok(prompt.includes(e.english));assert.ok(prompt.includes(e.vietnamese));assert.ok(prompt.includes(e.hint));assert.ok(!prompt.includes(e.model));}
  assert.ok(prompt.includes('Do not advance before that command'));
  assert.ok(prompt.includes('paste a newly copied prompt'));
  assert.ok(prompt.includes('Assess pronunciation only when actual audio is available'));
 }
});
test('guided pattern leaves every learner keyword empty and supports cumulative spoken turns',()=>{
 const pattern=voicePattern(exercises[0],'guided');
 assert.equal(pattern,'First, stand with your [GAP 1] down by your [GAP 2] and your [GAP 3] slightly [GAP 4].');
 for(const word of ['arms','sides','feet','apart'])assert.ok(!pattern.includes(word));
 const prompt=buildPrompt([exercises[0]],units,'guided');
 for(const instruction of ['retain my actual words','Stop and wait after EVERY gap','stay on the same gap','Now say the whole answer on your own','never read the markers aloud'])assert.ok(prompt.includes(instruction));
});
test('sentence starter pattern leaves all phrase content empty and uses independent completion',()=>{
 assert.equal(voicePattern(exercises[0],'starters'),'First, [GAP 1] with [GAP 2] and [GAP 3].');
 const prompt=buildPrompt([exercises[0]],units,'starters');assert.ok(prompt.includes('Do not run cumulative word-by-word repetition'));assert.ok(!prompt.includes('Guided speaking pattern:'));
});
test('meaning-only copies no English pattern or unsolicited repetition directions',()=>{
 const prompt=buildPrompt([exercises[0]],units,'meaning');assert.ok(prompt.includes('Use independent speaking'));assert.ok(!prompt.includes('[GAP'));assert.ok(!prompt.includes('Guided speaking pattern:'));assert.ok(!prompt.includes('Sentence starter pattern:'));assert.equal(voicePattern(exercises[0],'meaning'),'');
});
test('all authored patterns include empty slots; copying never serializes answer keys or extra metadata',()=>{
 for(const e of exercises)for(const level of ['guided','starters']){
  const prompt=buildPrompt([{...e,answerKey:'SECRET_KEY',modelProvenance:{note:'SECRET_NOTE'}}],units,level);
  assert.ok(voicePattern(e,level).includes('[GAP 1]'),e.id);assert.ok(!prompt.includes(e.model),e.id);assert.ok(!prompt.includes('SECRET_'),e.id);assert.ok(!prompt.includes('frameAnswers'));assert.ok(!prompt.includes('keywords:'));
 }
 assert.throws(()=>buildPrompt([exercises[0]],units,'unknown'));
});
