import {useState} from 'react';
import Modal from './Modal';
import {plantCapacity, seeds, type HomeLife, type PlantId} from '../lib/roomLife';
export default function PlantNursery({home,onCreate,onClose}:{home:HomeLife;onCreate:(species:PlantId,name:string)=>boolean;onClose:()=>void}){
  const [species,setSpecies]=useState<PlantId>('marigold'),[name,setName]=useState(''),[error,setError]=useState('');
  const count=home.completedMeetings.length,selected=seeds.find(s=>s.id===species)!,full=home.plants.length>=plantCapacity(count);
  return <Modal title="Посадим что-нибудь наше" onClose={onClose}><form className="plant-nursery" onSubmit={e=>{e.preventDefault();if(onCreate(species,name))onClose();else setError('Не удалось посадить. Проверь имя и свободные места в саду.')}}>
    <p className="nursery-intro">Выбери растение, придумай ему имя. Каждая ваша встреча подарит ему новые листья.</p>
    <div className="nursery-list" role="group" aria-label="Каталог растений" tabIndex={0}>{seeds.map(s=>{const locked=count<s.unlock;return <button key={s.id} type="button" disabled={locked} aria-pressed={s.id===species} onClick={()=>setSpecies(s.id)}><span>{s.icon}</span><div><b>{s.name}</b><p>{s.note}</p><small>{locked?`◇ Откроется за ${s.unlock} встреч`:`${s.meetings} встречи до полного роста`}</small></div><i>{locked?'◇':s.id===species?'✓':'＋'}</i></button>})}</div>
    <label>Имя растения<input name="plant-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={24} placeholder="Например, Граф Листочек" autoComplete="off"/></label>
    <div className="nursery-summary"><span>{selected.icon} {selected.name}</span><small>{home.plants.length} / {plantCapacity(count)} мест занято</small></div>
    {full&&<p className="form-error">В саду пока нет мест. Новое место открывается каждые 3 встречи, до 6 мест.</p>}
    {error&&<p role="alert" className="form-error">{error}</p>}
    <button className="primary full" disabled={full||!name.trim()}>Посадить «{name.trim()||'…'}»</button>
  </form></Modal>;
}
