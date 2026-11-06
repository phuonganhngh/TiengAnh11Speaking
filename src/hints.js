export const HINT_LEVELS=['guided','starters','meaning'];
export function answerSegments(exercise){
 const words=exercise.scaffold?.keywords;
 if(!Array.isArray(words)||!words.length||typeof exercise.model!=='string')throw Error('Invalid keyword scaffold');
 let offset=0;const result=[];
 for(const [blank,text] of words.entries()){
  if(typeof text!=='string'||!text.length)throw Error('Invalid keyword');
  const start=exercise.model.indexOf(text,offset);if(start<0)throw Error(`Invalid keyword position: ${exercise.id}`);
  result.push({text:exercise.model.slice(offset,start),blank:null},{text,blank});offset=start+text.length;
 }
 result.push({text:exercise.model.slice(offset),blank:null});return result;
}
export function starterSegments(exercise){
 const frame=exercise.scaffold?.frame,answers=exercise.scaffold?.frameAnswers;
 if(typeof frame!=='string'||!Array.isArray(answers)||!answers.length||answers.some(x=>typeof x!=='string'||!x.length))throw Error('Invalid starter scaffold');
 const parts=frame.split('…');if(parts.length!==answers.length+1)throw Error('Invalid starter slots');
 const result=[];for(const [i,text] of parts.entries()){result.push({text,blank:null});if(i<answers.length)result.push({text:answers[i],blank:i});}
 return result;
}
