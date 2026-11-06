export const MINUTE = 60000;
export const DAY = 86400000;
export function newSchedule(now = Date.now()) {
  return {stage:'new', step:0, interval:0, ease:2.5, reps:0, lapses:0, due:new Date(now).toISOString()};
}
export function rateSchedule(old, rating, now = Date.now()) {
  if (!['again','hard','good','easy'].includes(rating)) throw Error('Unknown rating');
  const s = {...old, reps:old.reps + 1};
  let delay;
  if (old.stage === 'review') {
    if (rating === 'again') {
      s.stage='relearning'; s.step=0; s.lapses++; s.ease=Math.max(1.3,s.ease-0.2);
      s.interval=Math.max(1,Math.round(old.interval*0.5)); delay=MINUTE;
    } else {
      s.interval=Math.min(36500, Math.max(old.interval+1, Math.round(old.interval * (rating==='hard'?1.2:rating==='easy'?s.ease*1.3:s.ease))));
      if(rating==='hard') s.ease=Math.max(1.3,s.ease-0.15);
      if(rating==='easy') s.ease=Math.min(3.5,s.ease+0.15);
      delay=s.interval*DAY;
    }
  } else {
    if (rating==='again') {s.step=0;s.stage=old.stage==='relearning'?'relearning':'learning';delay=MINUTE;}
    if (rating==='hard') {s.stage=old.stage==='relearning'?'relearning':'learning';delay=(old.step===0?6:10)*MINUTE;}
    if (rating==='good' && old.step===0) {s.stage=old.stage==='relearning'?'relearning':'learning';s.step=1;delay=10*MINUTE;}
    if (rating==='easy' || (rating==='good' && old.step===1)) {
      s.stage='review';s.step=0;s.interval=rating==='easy'?4:old.stage==='relearning'?Math.max(1,old.interval):1;delay=s.interval*DAY;
    }
  }
  s.due=new Date(now+delay).toISOString();return s;
}
export function dueCards(cards, now=Date.now()) {
  return cards.filter(c=>Date.parse(c.schedule.due)<=now).sort((a,b)=>(a.schedule.stage==='new')-(b.schedule.stage==='new') || Date.parse(a.schedule.due)-Date.parse(b.schedule.due) || a.id.localeCompare(b.id));
}
export function intervalLabel(ms) {
  if(ms<3600000) return `${Math.round(ms/MINUTE)} min`;
  if(ms<DAY) return `${Math.round(ms/3600000)} hr`;
  return `${Math.round(ms/DAY)} day${Math.round(ms/DAY)===1?'':'s'}`;
}
