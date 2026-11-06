import {answerSegments,starterSegments} from './hints.js';
export function localDate(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function activityIdFor(exercise){const task=/^\d+/.exec(exercise.source.task);if(!task)throw Error('Invalid source task');return `${exercise.unitId}-A${Number(task[0])}`;}
export function speakingActivities(exercises,unitId,units){
 const rows=exercises.filter(e=>e.unitId===unitId),metadata=units.find(u=>u.id===unitId)?.activities||[];
 return metadata.map(a=>({...a,exercises:rows.filter(e=>activityIdFor(e)===a.id)}));
}
export function practicePool(exercises,prefs){return prefs.mode==='custom'?exercises.filter(e=>prefs.customIds.includes(e.id)):exercises.filter(e=>e.unitId===prefs.unitId&&activityIdFor(e)===prefs.activityId);}
export const SUPPORT_LABELS={guided:'Guided answer',starters:'Sentence starters',meaning:'Meaning only'};
export function voicePattern(exercise,level){
 if(level==='meaning')return '';
 if(!Object.hasOwn(SUPPORT_LABELS,level))throw Error('Unknown support level');
 return (level==='guided'?answerSegments(exercise):starterSegments(exercise)).map(s=>s.blank===null?s.text:`[GAP ${s.blank+1}]`).join('');
}
export const VOICE = `Act as a natural English conversation partner for a Vietnamese Grade 11 learner practicing Controlled Speaking Level 2.
Follow only the provided exercises, in their exact order.
Ask one exact English Question at a time and wait for my response.
Encourage original English answers based on meaning, rather than word-for-word translation of a complete model sentence.
Do not invent replacement questions, impose a target grammar structure, or reveal a model answer before I attempt a response. Keep explanations short.
When I say “Hint, please,” give a short Vietnamese keyword hint without supplying the full English answer.
When I say “Feedback, please,” give concise Vietnamese explanations and corrections. Evaluate relevance, grammar, vocabulary, naturalness and speaking independence: independent, hint-assisted or repeated. Assess pronunciation only when actual audio is available. Do not claim to assess pronunciation from text or save ratings to the website.
When I say “Repeat, please,” repeat the current exact English question.
When I say “Next question,” advance to the next supplied exercise. Do not advance before that command. Announce completion after the final exercise.
Start with the first English question. Do not read the full exercise list or Vietnamese support text aloud.`;

const MODE_INSTRUCTIONS={
 guided:`Use cumulative spoken completion. Ask the exact question, then give only the first literal chunk up to the next gap. Ask me to repeat that chunk and add the missing word or phrase. After my attempt, retain my actual words and extend by only the next literal chunk. Stop and wait after EVERY gap. If the pattern starts with a gap, give only a short Vietnamese meaning clue and ask me to start the answer myself; do not invent an English opening that fills that gap. Do not recite future chunks, guess my response, or demonstrate the completed answer first. If I am stuck, stay on the same gap and offer a short Vietnamese meaning clue. The patterns have empty numbered markers; never read the markers aloud or assume an answer key. At the end ask: Now say the whole answer on your own.`,
 starters:`Use independent phrase-level completion with the Sentence starter pattern. Give one literal sentence starter, let me complete the phrase, and wait. Do not run cumulative word-by-word repetition. Keep every [GAP] for my own words; never read the markers aloud. Give a short Vietnamese clue only if requested.`,
 meaning:`Use independent speaking. Ask the exact question and wait for my own answer. Give only a short Vietnamese meaning hint if requested; do not supply an English scaffold or unsolicited repetition.`
};
export function buildPrompt(list,units,level='meaning'){
 if(!list.length)throw Error('Choose at least one exercise.');
 if(!Object.hasOwn(SUPPORT_LABELS,level))throw Error('Unknown support level');
 const header=VOICE+`\n\nAnswer support: ${SUPPORT_LABELS[level]}\n${MODE_INSTRUCTIONS[level]}\nTo change support, paste a newly copied prompt. Website buttons do not update this conversation.`;
 return header+'\n\n'+list.map((e,i)=>{
  const unit=units.find(u=>u.id===e.unitId),activity=unit?.activities?.find(a=>a.id===activityIdFor(e));
  const pattern=voicePattern(e,level);
  return `Exercise ${i+1} | ID: ${e.id}\nUnit: ${unit?.title||e.unitId}\nSpeaking activity: ${activity?.title||e.source.task}\nSource task: Speaking ${e.source.task}; printed page ${e.source.printedPage}; PDF page ${e.source.pdfPage}\nTopic: ${e.topic}\nSpeaking goal: ${e.goal}\nEnglish Question: ${e.english}\nVietnamese Question: ${e.vietnamese}\nVietnamese Meaning Hint: ${e.hint}`+(pattern?`\n${level==='guided'?'Guided speaking pattern':'Sentence starter pattern'}: ${pattern}`:'');
 }).join('\n\n');
}
