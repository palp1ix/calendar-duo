import {seeds} from './roomLife';
import type {HomeSnapshot} from './home';
import type {Data, Meeting} from '../types';
export type TogetherSession={id:string;proposer:string;requested_at:string;cancelled_at?:string|null;started_at:string|null;ends_at:string|null};
export type LoveLetter={id:string;author:string;body:string;created_at:string;opened_at:string|null};
export type Story={since:string|null;server_now:string;received_at?:number;sessions:TogetherSession[];letters:LoveLetter[]};
export function storyDays(since:string|null,now:number){
 if(!since)return 0;
 const today=new Date(now);return Math.max(0,Math.floor((Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate())-Date.parse(since+'T00:00:00Z'))/86400000));
}
export function sharedMinutes(meetings:Meeting[],sessions:TogetherSession[],now:number,after=-Infinity){
 const intervals=[...meetings.filter(m=>m.status==='completed'&&m.end_at).map(m=>[Date.parse(m.start_at),Date.parse(m.end_at!)]),...sessions.filter(s=>s.started_at&&s.ends_at).map(s=>[Date.parse(s.started_at!),Date.parse(s.ends_at!)])].map(([a,b])=>[Math.max(a,after),Math.min(b,now)]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a).sort((a,b)=>a[0]-b[0]);
 let end=-Infinity,total=0;for(const [a,b] of intervals){total+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b)}return total/60000;
}
export function duration(minutes:number){const m=Math.max(0,Math.floor(minutes));return `${Math.floor(m/60)} ч ${m%60} мин`}
export function currentSession(story:Story,now:number){return [...story.sessions].reverse().find(s=>!s.cancelled_at&&(s.started_at?Date.parse(s.ends_at!)>now:Date.parse(s.requested_at)+30*60000>now))}
export function storyProgress(data:Data,now:number){const story=data.story;const minutes=sharedMinutes(data.meetings,story?.sessions||[],now),days=storyDays(story?.since||null,now);return{minutes,days,value:Math.max(data.meetings.filter(m=>m.status==='completed').length,minutes/90,days/14)}}
export type Achievement={id:string;group:string;icon:string;title:string;description:string;value:number;target:number;unlocked:boolean};
export function storyAchievements(data:Data,now:number):Achievement[]{
 const {minutes,days}=storyProgress(data,now),done=data.meetings.filter(m=>m.status==='completed'),letters=data.story?.letters||[],home=data.home?.state;
 const result:Achievement[]=[];
 const add=(id:string,group:string,icon:string,title:string,description:string,value:number,target:number)=>result.push({id,group,icon,title,description,value:Math.min(target,Math.max(0,value)),target,unlocked:value>=target});
 for(const [n,title] of [[7,'Первая неделя'],[30,'Месяц нас'],[100,'Сто дней нашей истории'],[180,'Полгода рядом'],[365,'Наш первый год']] as const)add('days'+n,'Наша история','☀',title,`${n} дней с вашей даты`,days,n);
 for(const [n,title] of [[60,'Первый общий час'],[360,'Шесть часов счастья'],[1440,'Сутки рядом'],[3000,'Пятьдесят часов нас'],[6000,'Сто часов вдвоём']] as const)add('minutes'+n,'Время вместе','♡',title,`${n/60} часов вместе, включая текущую встречу`,minutes,n);
 for(const [n,title] of [[1,'Первая встреча'],[5,'Наши маленькие традиции'],[10,'Десять хороших дней'],[25,'Коллекционеры свиданий']] as const)add('meetings'+n,'Встречи','▦',title,`${n} завершённых встреч`,done.length,n);
 add('cozy','Встречи','⌂','Диванные легенды','Один отмеченный уютный вечер',done.filter(m=>m.cozy).length,1);
 add('diplomat','Встречи','⚑','Дипломат года','Принято встречное предложение',data.meetings.filter(m=>m.countered&&['accepted','completed'].includes(m.status)).length,1);
 for(const [n,title] of [[1,'На долгую память'],[5,'Пять наших «помнишь?»'],[10,'Хранители истории']] as const)add('memories'+n,'Воспоминания','▧',title,`${n} сохранённых воспоминаний`,data.memories.length,n);
 add('photo','Воспоминания','▧','Первый кадр','Воспоминание с фотографией',data.memories.filter(m=>m.photo).length,1);
 for(const [n,title] of [[1,'Маленькая нежность'],[10,'Обнимашки с доставкой'],[50,'Запас тепла']] as const)add('hugs'+n,'Забота','♡',title,`${n} отправленных объятий`,data.interactions.filter(i=>i.kind==='hug').length,n);
 add('tea','Забота','☕','Чай на двоих','Пять приглашений на чай',data.interactions.filter(i=>i.kind==='tea').length,5);
 add('letter','Забота','✉','Слова под подушкой','Первая оставленная записка',letters.length,1);
 add('opened','Забота','✉','Послание нашло тебя','Партнёр открыл записку',letters.filter(l=>l.opened_at).length,1);
 add('both','Забота','✉','Переписка на двоих','Оба оставили хотя бы одну записку',new Set(letters.map(l=>l.author)).size,2);
 add('plant','Дом и сад','❀','Зелёный новосёл','Первое растение с именем',home?.plants.length||0,1);
 add('garden','Дом и сад','❀','Наш маленький сад','Три растения с именами',home?.plants.length||0,3);
 add('bloom','Дом и сад','❀','Первый цветок','Одно полностью выросшее растение',home?.plants.filter(p=>p.growth>=1).length||0,1);
 return result;
}

export function projectHome(data:Data,now:number):HomeSnapshot|null{
 if(!data.home||!data.story)return data.home;
 const home=structuredClone(data.home),{value}=storyProgress(data,now);
 home.state.progressValue=Math.max(home.state.progressValue||0,value);
 home.state.progressUnits=Math.max(home.state.progressUnits||0,Math.floor(value));
 for(const plant of home.state.plants){const seed=seeds.find(s=>s.id===plant.species)!;const minutes=sharedMinutes(data.meetings,data.story.sessions,now,plant.plantedAt),days=Math.max(0,now-plant.plantedAt)/86400000;plant.growth=Math.min(1,Math.max(plant.growth,minutes/(seed.meetings*90)+days/(seed.meetings*7)))}
 return home;
}
