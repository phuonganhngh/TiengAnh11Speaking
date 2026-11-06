import {newSchedule} from './flashcards.js';
export function uid(){return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
export function normalized(front,back){return [front,back].map(s=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase()).join('\u0000');}
export function savePhrase(state,input,now=Date.now()) {
  const p=structuredClone(input);let skipped=0;
  if(!p.english.trim())throw Error('English phrase/question is required.');
  if(!p.id)p.id=uid();
  const old=state.phrases.find(x=>x.id===p.id);
  // Draft IDs, not visual row positions, retain ownership through reorder/removal.
  const draftIds=new Set();
  p.drafts=p.drafts.map(d=>{const x={...d,id:d.id||uid(),front:d.front.trim(),back:d.back.trim(),cardId:d.cardId||null};if(draftIds.has(x.id))throw Error('Duplicate draft ID');draftIds.add(x.id);return x;});
  for(const d of p.drafts){
    if(!d.front || !d.back){if(d.front||d.back)skipped++;d.cardId=null;continue;}
    const previous=old?.drafts.find(x=>x.id===d.id);
    let linked=state.cards.find(c=>c.id===previous?.cardId);
    const key=normalized(d.front,d.back);
    if(linked && normalized(linked.front,linked.back)===key){d.cardId=linked.id;d.front=linked.front;d.back=linked.back;continue;}
    const shared=linked && state.phrases.filter(q=>q.id!==p.id).concat(p).some(q=>q.drafts.some(x=>x.cardId===linked.id && !(q.id===p.id && x.id===d.id)));
    const same=state.cards.find(c=>normalized(c.front,c.back)===key);
    if(same){d.cardId=same.id;d.front=same.front;d.back=same.back;continue;}
    if(linked&&!shared){linked.front=d.front;linked.back=d.back;linked.updatedAt=new Date(now).toISOString();d.cardId=linked.id;}
    else {const card={id:uid(),front:d.front,back:d.back,createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),schedule:newSchedule(now)};state.cards.push(card);d.cardId=card.id;}
  }
  if(old)state.phrases[state.phrases.indexOf(old)]=p;else state.phrases.push(p);
  return {id:p.id,skipped};
}
export function editCard(state,id,front,back,now=Date.now()){
  if(!front.trim()||!back.trim())throw Error('Both card faces are required.');
  const c=state.cards.find(x=>x.id===id);if(!c)throw Error('Card no longer exists.');
  if(state.cards.some(x=>x.id!==id&&normalized(x.front,x.back)===normalized(front,back)))throw Error('An identical card already exists. Keep this card or use different text.');
  c.front=front.trim();c.back=back.trim();c.updatedAt=new Date(now).toISOString();
  for(const p of state.phrases)for(const d of p.drafts)if(d.cardId===id){d.front=c.front;d.back=c.back;}
}
export function deleteCard(state,id){state.cards=state.cards.filter(c=>c.id!==id);for(const p of state.phrases)for(const d of p.drafts)if(d.cardId===id)d.cardId=null;}
