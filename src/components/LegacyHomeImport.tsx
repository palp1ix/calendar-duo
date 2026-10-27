import {useState} from 'react';
import Modal from './Modal';
import PixelIcon from './PixelIcon';
import {plantCapacity,type HomeLife} from '../lib/roomLife';
export default function LegacyHomeImport({legacy,home,onImport,onClose}:{legacy:HomeLife;home:HomeLife;onImport:(plants:HomeLife['plants'],items:HomeLife['items'])=>Promise<boolean>;onClose:()=>void}){
 const available=legacy.plants.filter(p=>!home.plants.some(s=>s.id===p.id)),free=plantCapacity(home.completedMeetings.length)-home.plants.length;
 const [ids,setIds]=useState(()=>available.slice(0,free).map(p=>p.id)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <Modal title="Нашли сохранение на этом устройстве" onClose={onClose}><p className="muted">Выбери растения для общего сада. Неперенесённые останутся в локальной копии. Старые поломки не заменят уже починенный дом.</p><div className="legacy-plants">{available.map(p=><label key={p.id}><input type="checkbox" checked={ids.includes(p.id)} onChange={e=>setIds(v=>e.target.checked?[...v,p.id]:v.filter(id=>id!==p.id))}/><PixelIcon name={p.species}/>{p.name}</label>)}</div><p className="muted">Свободных мест: {free}. Выбрано: {ids.length}.</p>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary full" disabled={busy||ids.length>free} onClick={async()=>{setBusy(true);try{if(await onImport(available.filter(p=>ids.includes(p.id)),legacy.items))onClose();else setError('Перенос не подтверждён. Локальная копия сохранена.')}finally{setBusy(false)}}}>{busy?'Переносим…':'Перенести выбранное и украшения'}</button></Modal>;
}
