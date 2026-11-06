import PushSettings from './PushSettings';
import{useEffect,useId,useRef,useState}from'react';import type{Data,Meeting,Profile,Schedule}from'../types';import{dayKey,clock}from'../lib/time';import * as api from'../lib/api';
export type Run=(fn:()=>Promise<unknown>,message?:string)=>Promise<boolean>;
export {default as MeetingForm} from './MeetingComposer';
export {default as ScheduleForm} from './ScheduleComposer';
export function SettingsForm({profile,run}:{profile:Profile;run:Run}){const [busy,setBusy]=useState(false);return <><form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);await run(()=>api.patch('profiles',profile.id,{name:f.get('name'),hair:f.get('hair'),outfit:f.get('outfit'),hairstyle:f.get('hairstyle'),travel:Number(f.get('travel')),prep:Number(f.get('prep')),return_buffer:Number(f.get('return'))}),'Всё по-нашему. Настройки сохранены.');setBusy(false)}}><label>Как тебя называть<input name="name" required maxLength={40} defaultValue={profile.name}/></label><div className="field-row"><label>Волосы<input name="hair" type="color" defaultValue={profile.hair}/></label><label>Одежда<input name="outfit" type="color" defaultValue={profile.outfit}/></label></div><label>Причёска<select name="hairstyle" defaultValue={profile.hairstyle}><option value="short">Короткая</option><option value="bob">Каре</option><option value="long">Длинная</option></select></label><p className="muted">Это постоянные буферы, а не прогноз пробок. Они учитываются в предложениях встреч.</p><label>Дорога до встречи, минут<input name="travel" type="number" min="0" max="240" defaultValue={profile.travel} required/></label><label>Сборы перед выходом, минут<input name="prep" type="number" min="0" max="120" defaultValue={profile.prep} required/></label><label>Буфер после встречи, минут<input name="return" type="number" min="0" max="240" defaultValue={profile.return_buffer} required/></label><button className="primary full" disabled={busy}>Сохранить настройки</button></form><form className="password-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await run(()=>api.changePassword(String(f.get('password'))),'Пароль изменён.')} }><label>Новый пароль<input type="password" name="password" minLength={12} required autoComplete="new-password"/></label><button className="secondary full">Поменять пароль</button></form><PushSettings/></>}
export function MemoryForm({data,run,close}:{data:Data;run:Run;close:()=>void}){
 const [busy,setBusy]=useState(false),[note,setNote]=useState(''),[photo,setPhoto]=useState<File|null>(null),[preview,setPreview]=useState(''),[error,setError]=useState(''),[photoError,setPhotoError]=useState('');
 const [today]=useState(()=>dayKey(new Date())),[date,setDate]=useState(()=>dayKey(new Date()));
 const fileRef=useRef<HTMLInputElement>(null),saving=useRef(false),id=useId();
 const yesterday=dayKey(new Date(new Date(today+'T12:00:00').getTime()-86400000));
 const done=data.meetings.filter(m=>m.status==='completed').sort((a,b)=>b.start_at.localeCompare(a.start_at));
 useEffect(()=>{if(!photo){setPreview('');return}const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url)},[photo]);
 function selectPhoto(file:File|undefined){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5242880||!file.size){setPhotoError('Выберите JPG, PNG или WebP до 5 МБ.');if(fileRef.current)fileRef.current.value='';return}
  setPhotoError('');setPhoto(file);
 }
 return <form className="memory-composer" aria-busy={busy} onSubmit={async e=>{
  e.preventDefault();if(saving.current||!note.trim())return;
  const f=new FormData(e.currentTarget);saving.current=true;setBusy(true);setError('');
  try{
   const ok=await run(async()=>{let path:string|null=null;try{
    if(photo)path=await api.upload(photo);
    await api.insert('memories',{meeting_id:f.get('meeting')||null,memory_date:date,author:api.userId(),note:note.trim(),moment:String(f.get('moment')||'').trim(),label:String(f.get('label')||'').trim(),photo:path});
   }catch(e){if(path)await api.removePhoto(path).catch(()=>{});setError('Не получилось сохранить. Всё осталось в форме — попробуйте ещё раз.');throw e}},'Этот момент теперь с нами.');
   if(ok)close();
  }finally{saving.current=false;setBusy(false)}
 }}>
  <p className="memory-intro">Пара слов о вашем дне — и он останется в истории.</p>
  <fieldset disabled={busy} className="memory-fields">
   <label className="memory-note">Что хочется запомнить<textarea name="note" value={note} onChange={e=>setNote(e.target.value)} required maxLength={2000} rows={4} placeholder="О чём смеялись, куда забрели, что было хорошо…" aria-describedby={id+'-note-hint'}/></label>
   <div className="memory-note-meta" id={id+'-note-hint'}><span>Можно совсем коротко</span><span>{note.length}/2000</span></div>
   <div className="memory-date-row"><label>Дата воспоминания<input type="date" name="memory_date" max={today} value={date} onChange={e=>setDate(e.target.value)} required/></label><div className="memory-date-shortcuts" role="group" aria-label="Быстрый выбор даты"><button type="button" aria-pressed={date===today} onClick={()=>setDate(today)}>Сегодня</button><button type="button" aria-pressed={date===yesterday} onClick={()=>setDate(yesterday)}>Вчера</button></div></div>
   <input className="memory-file-input" ref={fileRef} id={id+'-photo'} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Фото (JPG, PNG, WebP до 5 МБ)" aria-describedby={id+'-photo-hint'} onChange={e=>selectPhoto(e.target.files?.[0])}/>
   {photo?<div className="memory-photo-selection">{preview&&<img src={preview} alt="Выбранное фото воспоминания" onError={()=>{setPhotoError('Не удалось открыть фото. Выберите другой файл.');setPhoto(null);if(fileRef.current)fileRef.current.value=''}}/>}<div><span>Фото добавлено</span><div><button type="button" onClick={()=>fileRef.current?.click()}>Заменить</button><button type="button" onClick={()=>{setPhoto(null);setPhotoError('');if(fileRef.current)fileRef.current.value=''}}>Убрать фото</button></div></div></div>:<button type="button" className="memory-add-photo" onClick={()=>fileRef.current?.click()}><span aria-hidden="true">＋</span><span><b>Добавить фото</b><small>Необязательно · JPG, PNG, WebP до 5 МБ</small></span></button>}
   {photoError&&<p className="form-error" role="alert">{photoError}</p>}
   <details className="memory-extras"><summary>Добавить детали <span>название, любимый момент, встреча</span></summary><div>
    <label>Название этого эпизода<input name="label" maxLength={80} placeholder="Например, побег за булочками"/></label>
    <label>Любимый момент<input name="moment" maxLength={500} placeholder="Одна деталь, которую хочется сберечь"/></label>
    {done.length>0&&<label>Связать со встречей (необязательно)<select name="meeting"><option value="">Без встречи</option>{done.map(m=><option key={m.id} value={m.id}>{new Date(m.start_at).toLocaleDateString('ru')} · {m.place}</option>)}</select></label>}
   </div></details>
  </fieldset>
  <div className="memory-save"><p id={id+'-photo-hint'}>Только для вас двоих ♡</p>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary full" disabled={busy||!note.trim()}>{busy?(photo?'Сохраняем фото и момент…':'Сохраняем момент…'):'Оставить в нашей истории'}</button></div>
 </form>
}
