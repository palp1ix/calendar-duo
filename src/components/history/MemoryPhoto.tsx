import {useEffect,useRef,useState} from 'react';
import {downloadPhoto,userId} from '../../lib/api';
import {photoCache} from '../../lib/photoCache';
export default function MemoryPhoto({path}:{path:string}){
 const owner=userId()||'',container=useRef<HTMLDivElement>(null);
 const [near,setNear]=useState(()=>!!photoCache.peek(owner,path)),[attempt,setAttempt]=useState(0),[url,setUrl]=useState(''),[error,setError]=useState(false);
 useEffect(()=>{
  if(near)return;
  if(!('IntersectionObserver' in window)){setNear(true);return}
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setNear(true);observer.disconnect()}},{rootMargin:'400px'});
  if(container.current)observer.observe(container.current);return()=>observer.disconnect();
 },[near,path]);
 useEffect(()=>{
  if(!near)return;
  let active=true,objectUrl='';setError(false);setUrl('');
  photoCache.get(owner,path,signal=>downloadPhoto(path,signal)).then(blob=>{
   if(!active)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
  }).catch(()=>{if(active)setError(true)});
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[near,path,owner,attempt]);
 function retry(){photoCache.forget(owner,path);setAttempt(n=>n+1);setNear(true)}
 return <div ref={container} className="memory-photo" aria-busy={!url&&!error}>
  {url?<img src={url} alt="Фото из нашего воспоминания" decoding="async" onError={()=>{setUrl('');setError(true);photoCache.forget(owner,path)}}/>:<div className="photo-placeholder">{error?<><span>Фото временно недоступно</span><button className="text-button" onClick={retry}>Загрузить снова</button></>:<span>{near?'Проявляем снимок…':'Наш момент'}</span>}</div>}
 </div>
}
