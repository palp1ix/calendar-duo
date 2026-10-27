import {useState} from 'react';
import Modal from './Modal';
import PixelIcon from './PixelIcon';
import {canEnter,plantCapacity,seeds,type HomeLife,type PlantId} from '../lib/roomLife';
export default function PlantNursery({home,onCreate,onClose}:{home:HomeLife;onCreate:(species:PlantId,name:string)=>Promise<boolean>;onClose:()=>void}){
 const [species,setSpecies]=useState<PlantId>('marigold'),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const count=home.completedMeetings.length,selected=seeds.find(s=>s.id===species)!,full=home.plants.length>=plantCapacity(count),allowed=canEnter(home,'greenhouse')&&home.location==='greenhouse';
 return <Modal title="Посадим что-нибудь наше" onClose={onClose}><form className="plant-nursery" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{if(await onCreate(species,name))onClose();else setError('Не удалось подтвердить посадку. Имя сохранено — попробуй ещё раз.')}finally{setBusy(false)}}}>
  <p className="nursery-intro">Маленький житель вашей оранжереи. Выбери вид и придумай ему имя.</p>
  <div className="nursery-list catalog-strip" role="group" aria-label="Каталог растений" tabIndex={0}>{seeds.map(s=>{const locked=count<s.unlock;return <button key={s.id} type="button" disabled={locked||busy} aria-pressed={s.id===species} onClick={()=>setSpecies(s.id)}><span className="catalog-art"><PixelIcon name={s.id} size={48}/>{locked&&<PixelIcon name="lock" size={18}/>}</span><b>{s.name}</b><p>{s.note}</p><small>{locked?`Откроется за ${s.unlock} встреч`:`Встреч до полного роста: ${s.meetings}`}</small><i>{locked?'Закрыто':s.id===species?'Выбрано':'Выбрать'}</i></button>})}</div>
  <label>Имя растения<input name="plant-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={24} placeholder="Например, Граф Листочек" autoComplete="off" disabled={busy}/></label>
  <div className="nursery-summary"><span><PixelIcon name={selected.id}/>{selected.name}</span><small>{home.plants.length} / {plantCapacity(count)} мест занято</small></div>
  {full&&<p className="form-error">В саду пока нет мест. Новое место открывается каждые 3 встречи, до 6 мест.</p>}{!allowed&&<p className="form-error">Посадка доступна только в открытой оранжерее.</p>}{error&&<p role="alert" className="form-error">{error}</p>}
  <button className="primary full" disabled={busy||full||!allowed||!name.trim()}>{busy?'Сажаем…':`Посадить «${name.trim()||'…'}»`}</button>
 </form></Modal>;
}
