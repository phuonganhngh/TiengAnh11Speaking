import {answerSegments,starterSegments} from './hints.js';
import {localDate,speakingActivities,practicePool,activityIdFor,buildPrompt,SUPPORT_LABELS} from './core.js';
import {uid,savePhrase,editCard,deleteCard} from './notebook.js';
import {newSchedule,rateSchedule,dueCards,intervalLabel} from './flashcards.js';
import {MAX_BYTES,exportProgress,importProgress} from './progress.js';
import {createStore} from './store.js';
const bundle=globalThis.ENGLISH11_DATA || await (async()=>{const [units,exercises,book]=await Promise.all(['units','exercises','book'].map(async name=>{const r=await fetch(`data/${name}.json`);if(!r.ok)throw Error(`Could not load ${name}.`);return r.json();}));return {units,exercises,book};})();
const {units,exercises,book}=bundle;
const $=id=>document.getElementById(id);
function node(tag,attrs={},...children){const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(k==='class')n.className=v;else if(k in n)n[k]=v;else n.setAttribute(k,v);}for(const c of children.flat()){if(c!==null&&c!==undefined)n.append(c instanceof Node?c:document.createTextNode(String(c)));}return n;}
let toastTimer;
function toast(text){$('toast').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',6000);}
function safe(fn){return async(...args)=>{try{await fn(...args);}catch(e){toast(e.message);}};}
function button(text,fn,cls=''){return node('button',{type:'button',class:cls,onclick:safe(fn)},text);}
function paragraph(text,cls=''){return node('p',{class:cls},text);}
function field(label,type='text',value='',max=10000){const input=node(type==='textarea'?'textarea':'input',{value,maxLength:max});if(type!=='textarea')input.type=type;return {input,wrap:node('label',{},label,input)};}
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('Unavailable');},setItem(){throw Error('Unavailable');}};}
const store=createStore(units,exercises,storage,text=>{$('storage-status').hidden=false;$('storage-status').textContent=text;});
let state=store.read(),reveals={vi:false,model:false},dialogCleanup=()=>{};
function fresh(){state=store.read();return state;}
async function changePrefs(patch){await store.transaction(s=>Object.assign(s.prefs,patch));fresh();render();}
function closeDialog(){dialogCleanup();dialogCleanup=()=>{};$('dialog').close();}
function openDialog(title){dialogCleanup();dialogCleanup=()=>{};$('dialog-title').textContent=title;$('dialog-body').replaceChildren();if(!$('dialog').open)$('dialog').showModal();$('dialog').scrollTop=0;return $('dialog-body');}
$('close-dialog').onclick=closeDialog;$('dialog').addEventListener('cancel',()=>{dialogCleanup();dialogCleanup=()=>{};});
$('dialog').addEventListener('close',()=>{dialogCleanup();dialogCleanup=()=>{};});
function renderSupport(exercise){
 const hint=node('div',{class:'hint'}),level=state.prefs.hintLevel;
 const group=node('div',{id:'hint-level',class:'support-options',role:'group','aria-label':'Answer support'});
 const plants={guided:'M16 28V15M16 19C5 19 4 9 5 7C14 6 17 12 16 19',starters:'M16 28V9M16 20C7 20 4 13 5 10C13 9 16 14 16 20M16 14C16 6 23 3 28 5C28 12 22 15 16 14',meaning:'M16 29V8M16 23C6 23 2 16 4 12C12 11 16 16 16 23M16 17C16 8 24 4 29 7C28 15 22 19 16 17M16 13C7 13 5 6 8 3C14 3 17 7 16 13'};
 for(const [key,label] of Object.entries(SUPPORT_LABELS)){
  const control=button('',async()=>{reveals.model=false;await changePrefs({hintLevel:key});},'support-option');
  control.id=`support-${key}`;control.dataset.hintLevel=key;control.setAttribute('aria-pressed',key===level);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('class','support-plant');svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',plants[key]);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);
  control.append(svg,node('span',{},label));group.append(control);
 }
 hint.append(paragraph('Answer support','support-label'),node('div',{class:'support-choice'},group),paragraph('VIETNAMESE MEANING HINT','field-label'));
 const meaning=node('p',{id:'meaning-hint',lang:'vi',hidden:level==='meaning'},exercise.hint);
 if(level==='meaning'){
  const toggle=button('Show meaning hint',()=>{meaning.hidden=!meaning.hidden;toggle.textContent=meaning.hidden?'Show meaning hint':'Hide meaning hint';toggle.setAttribute('aria-expanded',!meaning.hidden);});
  toggle.id='meaning-toggle';toggle.setAttribute('aria-controls','meaning-hint');toggle.setAttribute('aria-expanded','false');hint.append(toggle);
 }
 hint.append(meaning);
 if(level!=='meaning'){
  const guided=level==='guided',text=node('p',{id:guided?'guided-answer':'sentence-starters',class:guided?'guided-answer':'sentence-starters'});
  for(const segment of guided?answerSegments(exercise):starterSegments(exercise)){
   if(segment.blank===null){text.append(document.createTextNode(segment.text));continue;}
   let revealed=false;const kind=guided?'keyword':'phrase',mask=guided?'____':'…';
   const blank=button(mask,()=>{revealed=!revealed;blank.textContent=revealed?segment.text:mask;blank.classList.toggle('revealed',revealed);blank.setAttribute('aria-expanded',revealed);blank.setAttribute('aria-label',`${revealed?'Hide':'Reveal'} ${kind} ${segment.blank+1}`);},guided?'keyword-blank':'keyword-blank starter-slot');
   blank.setAttribute('aria-expanded','false');blank.setAttribute('aria-label',`Reveal ${kind} ${segment.blank+1}`);text.append(blank);
  }
  hint.append(node('div',{class:'english-support'},paragraph(guided?'GUIDED ANSWER':'SENTENCE STARTERS','field-label'),text));
 }
 return hint;
}
function render(){
 const p=state.prefs,isPractice=p.section==='practice';$('practice').hidden=!isPractice;$('daily-english').hidden=isPractice;
 for(const [id,active] of [['practice-tab',isPractice],['daily-tab',!isPractice]]){if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
 $('card-count').textContent=state.cards.length;
 $('daily-mode').setAttribute('aria-pressed',p.mode==='daily');$('custom-mode').setAttribute('aria-pressed',p.mode==='custom');
 $('daily-controls').hidden=p.mode!=='daily';$('custom-controls').hidden=p.mode!=='custom';
 $('unit').replaceChildren(...units.map(u=>node('option',{value:u.id,selected:u.id===p.unitId},`${u.id} · ${u.title}`)));
 const activities=speakingActivities(exercises,p.unitId,units);$('activity').replaceChildren(...activities.map(a=>node('option',{value:a.id,selected:a.id===p.activityId},`Speaking ${a.task} · ${a.title} · ${a.exercises.length} questions`)));
 $('custom-summary').textContent=`${p.customIds.length} questions selected`;
 const pool=practicePool(exercises,p),e=pool[p.index];
 $('question').replaceChildren(...pool.map((x,i)=>node('option',{value:i,selected:i===p.index},`${i+1} · ${x.english}`)));
 $('question').disabled=!pool.length;
 const article=$('exercise');article.replaceChildren();
 if(!e){article.append(node('h3',{},'Choose your questions'),paragraph('Open Custom selection and apply the exercises you want to practise.'));}
 else {
  const unit=units.find(u=>u.id===e.unitId);
  article.append(node('div',{class:'exercise-meta'},node('span',{},`${e.unitId} · ${p.mode==='daily'?units.find(u=>u.id===p.unitId).activities.find(a=>a.id===p.activityId).title:'Custom practice'}`),node('span',{},`Question ${p.index+1} of ${pool.length}`)),node('progress',{value:p.index+1,max:pool.length,'aria-label':'Practice position'}),paragraph(e.topic,'topic'),paragraph(`Speaking goal · ${e.goal}`,'goal'),paragraph('ENGLISH QUESTION','field-label'),node('h3',{class:'question',id:'english-question'},e.english));
  const vi=paragraph(e.vietnamese,'reveal');vi.id='vi-question';vi.lang='vi';vi.hidden=!reveals.vi;
  const viButton=button(`${reveals.vi?'Hide':'Show'} Vietnamese question`,()=>{reveals.vi=!reveals.vi;vi.hidden=!reveals.vi;viButton.textContent=`${reveals.vi?'Hide':'Show'} Vietnamese question`;viButton.setAttribute('aria-expanded',reveals.vi);});viButton.setAttribute('aria-expanded',reveals.vi);viButton.setAttribute('aria-controls',vi.id);
  const model=paragraph(e.model,'reveal');model.id='model-answer';model.hidden=!reveals.model;
  const modelButton=button(`${reveals.model?'Hide':'Show'} model answer`,()=>{reveals.model=!reveals.model;model.hidden=!reveals.model;modelButton.textContent=`${reveals.model?'Hide':'Show'} model answer`;modelButton.setAttribute('aria-expanded',reveals.model);});modelButton.setAttribute('aria-expanded',reveals.model);modelButton.setAttribute('aria-controls',model.id);
  const prev=button('← Previous',()=>navigate(p.index-1));prev.disabled=p.index===0;
  const next=button('Next →',()=>navigate(p.index+1),'primary');next.disabled=p.index===pool.length-1;
  article.append(viButton,vi,renderSupport(e),modelButton,model,node('div',{class:'navigate'},prev,next),paragraph(`${e.id} · ${e.source.origin} question · printed p. ${e.source.printedPage} / PDF p. ${e.source.pdfPage} · Speaking ${e.source.task} · Model answer: authored`,'source-line'));
  article.setAttribute('aria-label',`${unit.title} speaking exercise`);
 }
 $('copy-prompt').disabled=!pool.length;
 const currentActivity=activities.find(a=>a.id===p.activityId);
 $('practice-title').textContent=p.mode==='daily'?currentActivity.title:'Your Custom selection';
 $('practice-scope').textContent=`${pool.length} question${pool.length===1?'':'s'} · ${p.mode==='daily'?'Whole Speaking activity':'Exactly your applied selection'}`;
 $('voice-support').textContent=`Voice support: ${SUPPORT_LABELS[p.hintLevel]}`;
 const preview=$('copy-preview');preview.dataset.mode=p.mode;preview.replaceChildren();
 for(const unit of units)for(const a of speakingActivities(exercises,unit.id,units)){
  const rows=pool.filter(x=>activityIdFor(x)===a.id);if(!rows.length)continue;
  preview.append(node('section',{class:'preview-activity'},node('h4',{},`${unit.id} · Speaking ${a.task} · ${a.title}`),node('ol',{},...rows.map(x=>{const li=node('li',{},node('span',{class:'preview-id'},x.id),x.english);li.dataset.exerciseId=x.id;return li;}))));
 }
 if(!isPractice)renderPhrases();
}
async function navigate(index){reveals={vi:false,model:false};await changePrefs({index});}
$('practice-tab').onclick=safe(()=>changePrefs({section:'practice'}));$('daily-tab').onclick=safe(()=>changePrefs({section:'daily'}));
$('daily-mode').onclick=safe(async()=>{reveals={vi:false,model:false};await changePrefs({mode:'daily',index:0});});
$('custom-mode').onclick=()=>openCustom();
$('choose-custom').onclick=()=>openCustom();
$('unit').onchange=safe(async ev=>{reveals={vi:false,model:false};const unitId=ev.target.value;await changePrefs({unitId,activityId:units.find(u=>u.id===unitId).activities[0].id,index:0});});
$('activity').onchange=safe(async ev=>{reveals={vi:false,model:false};await changePrefs({activityId:ev.target.value,index:0});});
$('question').onchange=safe(ev=>navigate(Number(ev.target.value)));
function openCustom(){
 fresh();const selected=new Set(state.prefs.customIds),body=openDialog('Choose activities / questions');
 const search=field('Search by question, activity, topic or ID','search','');body.append(search.wrap);
 const list=node('div');body.append(list);const count=paragraph('','subtle');
 function selectAll(rows,checked){for(const e of rows){if(checked)selected.add(e.id);else selected.delete(e.id);}}
 function updateCheck(check,rows){const n=rows.filter(e=>selected.has(e.id)).length;check.checked=n===rows.length;check.indeterminate=n>0&&n<rows.length;}
 function paint(){list.replaceChildren();const term=search.input.value.toLowerCase();
  for(const u of units){
   const all=exercises.filter(e=>e.unitId===u.id);
   const groups=speakingActivities(exercises,u.id,units).map(a=>({...a,visible:a.exercises.filter(e=>[e.id,e.topic,e.english,a.title].join(' ').toLowerCase().includes(term))})).filter(a=>a.visible.length);
   if(!groups.length)continue;
   const cb=node('input',{type:'checkbox',id:`select-${u.id}`,'aria-label':`${u.id} select all questions`});updateCheck(cb,all);
   cb.onchange=()=>{selectAll(all,cb.checked);paint();$(cb.id).focus();};
   list.append(node('div',{class:'unit-choice'},cb,node('label',{htmlFor:cb.id},`${u.id} · ${u.title}`)));
   for(const activity of groups){
    const ac=node('input',{type:'checkbox',id:`select-${activity.id}`,'aria-label':`${u.id} ${activity.title} select activity`});updateCheck(ac,activity.exercises);
    ac.onchange=()=>{selectAll(activity.exercises,ac.checked);paint();$(ac.id).focus();};
    list.append(node('div',{class:'activity-choice'},ac,node('label',{htmlFor:ac.id},`Speaking ${activity.task} · ${activity.title}`)));
    for(const e of activity.visible){
     const c=node('input',{type:'checkbox',id:`choose-${e.id}`,checked:selected.has(e.id)});
     c.onchange=()=>{if(c.checked)selected.add(e.id);else selected.delete(e.id);updateCheck(cb,all);updateCheck(ac,activity.exercises);count.textContent=`${selected.size} selected`;};
     list.append(node('div',{class:'check-row'},c,node('label',{htmlFor:c.id},`${e.id} · ${e.english}`)));
    }
   }
  }count.textContent=`${selected.size} selected`;
 }
 search.input.oninput=paint;paint();
 body.append(count,node('div',{class:'dialog-actions'},button('Apply selection',async()=>{reveals={vi:false,model:false};await changePrefs({mode:'custom',customIds:exercises.filter(e=>selected.has(e.id)).map(e=>e.id),index:0});closeDialog();},'primary'),button('Cancel',closeDialog)));
}
async function copyPrompt(list){
 const text=buildPrompt(list,units,state.prefs.hintLevel);
 try {if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);toast(`Copied ${list.length} question${list.length===1?'':'s'}.`);}
 catch {const body=openDialog('Copy manually');const area=node('textarea',{readOnly:true,value:text,'aria-label':'Full prompt for manual copying'});body.append(paragraph('Clipboard access is unavailable. Select this prompt and copy it manually.','notice'),area);area.style.minHeight='260px';area.focus();area.select();}
}
$('copy-prompt').onclick=safe(()=>{fresh();render();return copyPrompt(practicePool(exercises,state.prefs));});
$('source-button').onclick=()=>{const body=openDialog('Source & coverage');body.append(paragraph(book.title),paragraph(book.edition),paragraph(`ISBN ${book.isbn}`,'subtle'),paragraph(book.scope),paragraph(book.review,'subtle'));const ul=node('ul');for(const u of units){ul.append(node('li',{},`${u.id} · ${u.title} · ${exercises.filter(e=>e.unitId===u.id).length} exercises · printed ${u.printedPages.join('–')} / PDF ${u.pdfPages.join('–')}`));}body.append(ul);};
function renderPhrases(){
 const container=$('phrases');container.replaceChildren();const term=$('phrase-search').value.toLowerCase();
 const list=state.phrases.filter(p=>[p.date,p.topic,p.english,p.meaning,p.reply].join(' ').toLowerCase().includes(term)).sort((a,b)=>b.date.localeCompare(a.date));
 if(!list.length){container.append(paragraph(state.phrases.length?'No matching phrases.':'A place for English you want to use. Add your first phrase.','panel empty'));return;}
 let date='';for(const p of list){if(p.date!==date){container.append(node('h3',{class:'date-heading'},p.date));date=p.date;}
  container.append(node('article',{class:'panel phrase-card'},button('Edit',()=>openPhrase(p.id),'edit-phrase'),paragraph(p.topic,'eyebrow'),node('h3',{},p.english),node('p',{class:'prewrap',lang:'vi'},p.meaning),paragraph(p.reply,'prewrap subtle')));
 }
}
$('phrase-search').oninput=renderPhrases;$('add-phrase').onclick=()=>openPhrase();
function openPhrase(id){
 fresh();const existing=state.phrases.find(p=>p.id===id),baseline=structuredClone(existing),p=existing?structuredClone(existing):{id:uid(),date:localDate(),topic:'',english:'',meaning:'',reply:'',drafts:[]};
 const body=openDialog(id?'Edit phrase':'Add phrase'),form=node('form');const date=field('Date','date',p.date),topic=field('Topic (optional)','text',p.topic,200),english=field('English phrase/question','textarea',p.english),meaning=field('Meaning / translation (optional)','textarea',p.meaning),reply=field('Reply / follow-up (optional)','textarea',p.reply);english.input.required=true;date.input.required=true;
 const rows=node('div'),note=paragraph('','error');
 function capture(){for(const r of rows.children){const d=p.drafts.find(x=>x.id===r.dataset.draftId);d.front=r.querySelector('[data-face=front]').value;d.back=r.querySelector('[data-face=back]').value;}}
 function paintRows(){rows.replaceChildren();for(const d of p.drafts){const f=field('Front: Vietnamese','textarea',d.front),b=field('Back: English','textarea',d.back);f.input.dataset.face='front';b.input.dataset.face='back';const row=node('div',{class:'draft-row'},node('div',{class:'two-fields'},f.wrap,b.wrap));row.dataset.draftId=d.id;row.append(node('div',{class:'draft-tools'},button('Move up',()=>{capture();const i=p.drafts.findIndex(x=>x.id===d.id);if(i>0)[p.drafts[i-1],p.drafts[i]]=[p.drafts[i],p.drafts[i-1]];paintRows();}),button('Remove',()=>{capture();p.drafts=p.drafts.filter(x=>x.id!==d.id);paintRows();})));rows.append(row);}}
 function addRow(){capture();p.drafts.push({id:uid(),front:'',back:'',cardId:null});paintRows();}
 // The optional empty pair creates no card until both fields are completed.
 if(!p.drafts.length)p.drafts.push({id:uid(),front:'',back:'',cardId:null});paintRows();
 const submit=node('button',{type:'submit',class:'primary'},'Save phrase');
 form.append(node('div',{class:'two-fields'},date.wrap,topic.wrap),english.wrap,meaning.wrap,reply.wrap,node('h3',{},'Create Flashcard (optional)'),paragraph('Complete both faces to create a card when you save.','subtle'),rows,button('Add another flashcard',addRow),note,node('div',{class:'dialog-actions'},submit,button('Cancel',closeDialog)));
 if(id){const remove=button('Delete phrase',()=>{remove.hidden=true;confirm.hidden=false;},'danger'),confirm=node('div',{hidden:true,class:'notice'},paragraph('Delete this phrase? Existing cards will remain.'),button('Confirm delete',async()=>{await store.transaction(s=>{s.phrases=s.phrases.filter(x=>x.id!==id);});fresh();render();closeDialog();},'danger'),button('Keep phrase',()=>{confirm.hidden=true;remove.hidden=false;}));form.append(remove,confirm);}
 form.onsubmit=async ev=>{ev.preventDefault();submit.disabled=true;note.textContent='';try{capture();Object.assign(p,{date:date.input.value,topic:topic.input.value.trim(),english:english.input.value.trim(),meaning:meaning.input.value.trim(),reply:reply.input.value.trim()});const result=await store.transaction(s=>{
   if(id&&!s.phrases.some(q=>q.id===id))throw Error('This phrase was deleted in another tab.');
   // Preserve a concurrent deck edit if the editor did not change that draft.
   if(baseline){const latest=s.phrases.find(q=>q.id===id);for(const d of p.drafts){const before=baseline.drafts.find(x=>x.id===d.id),live=latest?.drafts.find(x=>x.id===d.id);if(before&&live&&d.front===before.front&&d.back===before.back){d.front=live.front;d.back=live.back;d.cardId=live.cardId;}}}
   return savePhrase(s,p);
  });fresh();render();closeDialog();toast(`Phrase saved${store.isSession()?' for this session':''}.${result.skipped?` ${result.skipped} incomplete pair(s) skipped.`:''}`);
 }catch(e){note.textContent=e.message;}finally{submit.disabled=false;}};body.append(form);
}
$('deck-button').onclick=()=>openDeck();
function nextDueText(cards){if(!cards.length)return 'No cards yet.';const next=Math.min(...cards.map(c=>Date.parse(c.schedule.due)));return next<=Date.now()?'Cards are due now.':`Next review: ${new Date(next).toLocaleString()}`;}
function openDeck(){
 fresh();const body=openDialog('Flashcards'),summary=paragraph('','notice'),study=button('Study due cards',()=>openReview(),'primary'),search=field('Search cards','search',''),list=node('div');
 function paint(){fresh();const due=dueCards(state.cards);summary.textContent=`${state.cards.length} total · ${state.cards.filter(c=>c.schedule.stage==='new').length} new · ${due.length} due. ${nextDueText(state.cards)}`;study.disabled=!due.length;
  const term=search.input.value.toLowerCase();list.replaceChildren();const matches=state.cards.filter(c=>`${c.front} ${c.back}`.toLowerCase().includes(term));
  if(!matches.length)list.append(paragraph(state.cards.length?'No matching cards.':'Complete the optional flashcard pairs when saving a Daily English phrase.','empty'));
  for(const c of matches){const controls=node('div',{class:'actions'},button('Edit card',()=>openCard(c.id)));if(Date.parse(c.schedule.due)<=Date.now())controls.append(button('Study',()=>openReview(c.id)));list.append(node('article',{class:'card-list-item'},node('p',{lang:'vi',class:'prewrap'},c.front),paragraph(c.back,'prewrap'),paragraph(`${c.schedule.stage} · due ${new Date(c.schedule.due).toLocaleString()}`,'subtle'),controls));}
 }
 search.input.oninput=paint;body.append(summary,study,paragraph('Anki-style scheduling, not Anki FSRS or Anki sync. Ratings are your judgment.','subtle'),search.wrap,list);paint();const timer=setInterval(paint,15000);dialogCleanup=()=>clearInterval(timer);
}
function openCard(id){
 fresh();const c=state.cards.find(x=>x.id===id);if(!c){toast('This card no longer exists.');return openDeck();}
 const body=openDialog('Edit card'),form=node('form'),front=field('Front: Vietnamese','textarea',c.front),back=field('Back: English','textarea',c.back),error=paragraph('','error');front.input.required=true;back.input.required=true;
 const save=node('button',{type:'submit',class:'primary'},'Save card');form.append(front.wrap,back.wrap,error,node('div',{class:'dialog-actions'},save,button('Back to deck',openDeck)));
 form.onsubmit=async ev=>{ev.preventDefault();save.disabled=true;try{await store.transaction(s=>editCard(s,id,front.input.value,back.input.value));openDeck();toast('Card updated. Schedule preserved.');}catch(e){error.textContent=e.message;}finally{save.disabled=false;}};
 const confirmation=node('div',{hidden:true,class:'notice'});
 const reset=button('Reset schedule',()=>{confirmation.hidden=false;confirmation.replaceChildren(paragraph('Reset this card to a new card due now?'),button('Confirm reset',async()=>{await store.transaction(s=>{const card=s.cards.find(x=>x.id===id);if(!card)throw Error('Card no longer exists.');card.schedule=newSchedule();});openDeck();},'danger'),button('Cancel',()=>confirmation.hidden=true));});
 const remove=button('Delete card',()=>{confirmation.hidden=false;confirmation.replaceChildren(paragraph('Delete this card? Its draft links will be cleared.'),button('Confirm delete',async()=>{await store.transaction(s=>deleteCard(s,id));openDeck();},'danger'),button('Cancel',()=>confirmation.hidden=true));},'danger');
 form.append(node('div',{class:'dialog-actions'},reset,remove),confirmation);body.append(form);
}
function openReview(firstId){
 const body=openDialog('Study due cards');let active=null,showBack=false,busy=false,preferred=firstId;
 const summary=paragraph('','subtle'),face=button('',()=>flip(),'flash-face'),toggle=button('Show answer',()=>flip()),ratings=node('div',{class:'ratings'}),completion=node('div',{class:'notice'}),help=paragraph('Tap the card or use Enter / Space to flip. After revealing, use 1–4 to rate.','subtle');
 const actions=['again','hard','good','easy'];
 async function rate(rating){if(busy||!showBack||!active)return;busy=true;try{const id=active.id;await store.transaction(s=>{const c=s.cards.find(x=>x.id===id);if(!c||Date.parse(c.schedule.due)>Date.now())throw Error('This card changed in another tab. Its latest schedule has been preserved.');c.schedule=rateSchedule(c.schedule,rating);});active=null;showBack=false;paint();if(active)face.focus();}catch(e){toast(e.message);active=null;showBack=false;paint();}finally{busy=false;}}
 function flip(){if(!active||busy)return;showBack=!showBack;paint();}
 function paint(){fresh();const due=dueCards(state.cards);if(active){const latest=state.cards.find(c=>c.id===active.id);if(!latest||Date.parse(latest.schedule.due)>Date.now()){active=null;showBack=false;}else active=latest;}
  if(!active){active=(preferred&&due.find(c=>c.id===preferred))||due[0]||null;preferred=null;showBack=false;}
  summary.textContent=`${due.length} due · Anki-style, not Anki FSRS or Anki sync`;
  const empty=!active;face.hidden=empty;toggle.hidden=empty;help.hidden=empty;completion.hidden=!empty;ratings.hidden=empty||!showBack;
  if(empty){completion.replaceChildren(node('h3',{},'You’re up to date.'),paragraph(nextDueText(state.cards)),paragraph('Leave this window open: learning cards will return when due.','subtle'),button('Back to deck',openDeck));return;}
  face.replaceChildren(node('small',{},showBack?'BACK · ENGLISH':'FRONT · VIETNAMESE'),node('span',{lang:showBack?'en':'vi'},showBack?active.back:active.front));face.setAttribute('aria-label',showBack?'Back English; show front':'Front Vietnamese; show answer');
  toggle.textContent=showBack?'Show front':'Show answer';ratings.replaceChildren(...actions.map((r,i)=>{const next=rateSchedule(active.schedule,r);return button(node('span',{},`${i+1} · ${r[0].toUpperCase()+r.slice(1)}`,node('small',{},intervalLabel(Date.parse(next.due)-Date.now()))),()=>rate(r));}));
 }
 const keydown=ev=>{if(ev.repeat||ev.altKey||ev.ctrlKey||ev.metaKey||['INPUT','TEXTAREA','SELECT'].includes(ev.target.tagName)||!showBack||busy)return;const n=Number(ev.key);if(n>=1&&n<=4){ev.preventDefault();void rate(actions[n-1]);}};
 body.append(summary,face,toggle,ratings,completion,help);document.addEventListener('keydown',keydown);paint();if(active)face.focus();
 const timer=setInterval(()=>{if(!active)paint();else{const current=store.read().cards.find(c=>c.id===active.id);if(!current||current.schedule.due!==active.schedule.due)paint();}},1000);
 dialogCleanup=()=>{clearInterval(timer);document.removeEventListener('keydown',keydown);};
}
function download(){fresh();const content=exportProgress(state),blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a',{href:url,download:`english11-speaking-progress-${localDate()}.json`});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Progress file downloaded.');}
$('export').onclick=safe(download);
$('import').onclick=()=>{$('progress-file').value='';$('progress-file').click();};
$('progress-file').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{
 if(file.size>MAX_BYTES)throw Error('Backup exceeds the 4 MiB limit.');
 const incoming=importProgress(await file.text(),units,exercises),body=openDialog('Restore progress?');
 body.append(paragraph('This replaces your current personal data. The textbook bank stays unchanged.','notice'),paragraph(`${incoming.phrases.length} phrases · ${incoming.cards.length} cards · ${incoming.prefs.customIds.length} Custom questions`),paragraph(`Position: ${incoming.prefs.unitId} · ${units.find(u=>u.id===incoming.prefs.unitId).activities.find(a=>a.id===incoming.prefs.activityId).title} · question ${incoming.prefs.index+1} (${incoming.prefs.mode})`),button('Download current data first',download));
 const error=paragraph('','error'),restore=button('Confirm restore',async()=>{restore.disabled=true;try{await store.restore(incoming);fresh();reveals={vi:false,model:false};render();closeDialog();toast('Progress restored.');}catch(e){error.textContent=e.message;}finally{restore.disabled=false;}},'primary');body.append(error,node('div',{class:'dialog-actions'},restore,button('Cancel',closeDialog)));
 }catch(e){toast(e.message);}finally{ev.target.value='';}};
window.addEventListener('storage',()=>{fresh();render();});
render();
