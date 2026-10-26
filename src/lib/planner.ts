import type {Schedule,Meeting,Profile} from '../types';
import {at,dayKey,addDays} from './time';
const dayNumber=(s:string)=>Math.round(Date.parse(s+'T00:00:00Z')/86400000);
export function occurs(s:Schedule,day:string){
 if(day<s.day || (s.until_day&&day>s.until_day)||s.exceptions.includes(day))return false;
 if(!s.weekdays.length)return day===s.day;
 const wd=new Date(day+'T12:00:00').getDay();
 const anchor=dayNumber(s.day)-((new Date(s.day+'T12:00:00').getDay()+6)%7);
 return s.weekdays.includes(wd)&& Math.floor((dayNumber(day)-anchor)/7)%s.interval_weeks===0;
}
export function stateAt(events:Schedule[],owner:string,day:string,t:number){
 const active=events.filter(s=>s.owner===owner&&occurs(s,day)&&at(day,s.start_time).getTime()<=t&&at(day,s.end_time).getTime()>t);
 if(active.some(s=>s.state==='unavailable'))return 'unavailable';
 if(active.some(s=>s.state==='unknown'))return 'unknown';
 return active.some(s=>s.state==='available')?'available':'unknown';
}
export type Suggestion={start:string;end:string;explanation:string};
export function suggest(events:Schedule[],meetings:Meeting[],profiles:Profile[],date:Date,duration=90,now=Date.now()):Suggestion[]{
 if(profiles.length!==2)return [];
 const result:Suggestion[]=[];
 for(let n=0;n<7;n++){
 const day=dayKey(addDays(date,n));let lastEnd=0;
 for(let min=8*60;min+duration<=23*60;min+=15){
 const start=at(day,`${Math.floor(min/60)}:${String(min%60).padStart(2,'0')}`).getTime();const end=start+duration*60000;
 if(start<=now||start<lastEnd)continue;
 if(meetings.some(m=>m.status==='accepted'&&Date.parse(m.start_at)<end&&Date.parse(m.end_at||m.start_at)+(!m.end_at?duration*60000:0)>start))continue;
 const ok=profiles.every(p=>{
  const left=start-(p.travel+p.prep)*60000,right=end+p.return_buffer*60000;
  if(meetings.some(m=>m.status==='accepted'&&Date.parse(m.start_at)<right&&Date.parse(m.end_at||m.start_at)+(!m.end_at?duration*60000:0)>left))return false;
  for(let t=left;t<right;t+=60000){if(dayKey(new Date(t))!==day||stateAt(events,p.id,day,t)!=='available')return false;}
  return true;
 });
 if(ok){result.push({start:new Date(start).toISOString(),end:new Date(end).toISOString(),explanation:`Оба отметили свободное время. Учтены дорога и сборы: ${profiles.map(p=>`${p.name} — ${p.travel+p.prep} мин`).join(', ')}. После встречи оставлен буфер на возвращение.`});lastEnd=end;if(result.length>=6)return result;}
 }
 }
 return result;
}
export function canRespond(m:Meeting,uid:string){return ['proposed','counter'].includes(m.status)&&m.proposer!==uid}
export function achievements(meetings:Meeting[],memories:unknown[]){const done=meetings.filter(m=>m.status==='completed');const sorted=[...done].sort((a,b)=>a.start_at.localeCompare(b.start_at));return [done.length>=1,meetings.filter(m=>['accepted','completed'].includes(m.status)).length>=5,sorted.some((m,i)=>i>0&&Date.parse(m.start_at)-Date.parse(sorted[i-1].start_at)>10*86400000),done.some(m=>done.filter(n=>Math.abs(Date.parse(n.start_at)-Date.parse(m.start_at))<7*86400000).length>=3),meetings.some(m=>m.countered&&['accepted','completed'].includes(m.status)),done.some(m=>m.cozy),memories.length>=1]}
