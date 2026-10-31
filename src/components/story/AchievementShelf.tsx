import {useState} from 'react';
import type {Data} from '../../types';
import {duration,storyAchievements} from '../../lib/story';
export default function AchievementShelf({data,now}:{data:Data;now:number}){
 const [filter,setFilter]=useState('Все'),items=storyAchievements(data,now),groups=['Все',...new Set(items.map(a=>a.group))],earned=items.filter(a=>a.unlocked).length;
 return <><div className="section-head"><h2>Полочка достижений</h2><span>{earned} / {items.length}</span></div><p className="muted">Время, забота и ваши маленькие истории. Всё в своём ритме.</p><div className="achievement-filters" role="group" aria-label="Коллекции достижений">{groups.map(g=><button key={g} aria-pressed={filter===g} onClick={()=>setFilter(g)}>{g}</button>)}</div><div className="achievements">{items.filter(a=>filter==='Все'||filter===a.group).map(a=><article className={'achievement '+(!a.unlocked?'locked':'')} key={a.id}><div className="pixel-badge" aria-hidden="true">{a.icon}</div><small>{a.group}</small><h3>{a.title}</h3><p>{a.description}</p><progress aria-label={`Прогресс: ${a.title}`} value={a.value} max={a.target}/><small>{a.unlocked?'Открыто ✓':a.id.startsWith('minutes')?`Осталось ${duration(a.target-a.value)}`:`${Math.floor(a.value)} / ${a.target}`}</small></article>)}</div></>
}
