import {photoCache} from './photoCache';
import {preparePhoto} from './preparePhoto';
import type {Story} from './story';
import {getHome} from './home';
import {disablePush} from './push';
import type {Data,Profile,Schedule} from '../types';
const url=import.meta.env.VITE_SUPABASE_URL as string;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
export const configured=Boolean(url&&key);
type Session={access_token:string;refresh_token:string;expires_at:number;user:{id:string}};
let session:Session|null=(()=>{try{return JSON.parse(localStorage.getItem('ustime.session')||'null')}catch{return null}})();
let refreshing:Promise<void>|null=null;
export const userId=()=>session?.user.id;
export const hasSession=()=>Boolean(session);
function save(s:Session|null){if(!s||s.user.id!==session?.user.id)photoCache.clear();session=s;s?localStorage.setItem('ustime.session',JSON.stringify(s)):localStorage.removeItem('ustime.session')}
async function auth(path:string,body:object){const r=await fetch(`${url}/auth/v1/${path}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.msg||j.error_description||'Не удалось войти. Проверьте пароль.');return j}
export async function login(slot:number,password:string){const s=await auth('token?grant_type=password',{email:`${slot===1?'me':'her'}@ustime.invalid`,password});save({...s,expires_at:Math.floor(Date.now()/1000)+s.expires_in})}
async function token(){if(!session)throw new Error('Войдите снова');if(session.expires_at<Date.now()/1000+90){if(!refreshing)refreshing=(async()=>{try{const s=await auth('token?grant_type=refresh_token',{refresh_token:session!.refresh_token});save({...s,expires_at:Math.floor(Date.now()/1000)+s.expires_in})}catch(e){save(null);throw e}finally{refreshing=null}})();await refreshing}return session!.access_token}
export async function request(path:string,options:RequestInit={}){const t=await token();const r=await fetch(`${url}${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${t}`,'Content-Type':'application/json',Prefer:'return=representation',...options.headers}});if(!r.ok){let j;try{j=await r.json()}catch{}throw Object.assign(new Error(j?.message||j?.msg||`Сервер недоступен (${r.status})`),{status:r.status})}const body=await r.text();return body?JSON.parse(body):null}
export async function logout(){await disablePush();try{await request('/auth/v1/logout',{method:'POST'})}finally{save(null)}}
export async function changePassword(password:string){return request('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})})}
export const insert=(table:string,body:object)=>request(`/rest/v1/${table}`,{method:'POST',body:JSON.stringify(body)});
export const patch=(table:string,id:string,body:object)=>request(`/rest/v1/${table}?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(body)});
export async function load():Promise<Data>{const tables=['profiles','schedules','meetings','memories','interactions','notifications'];const r=await Promise.all(tables.map(t=>request(`/rest/v1/${t}?select=*${t==='notifications'?'&order=created_at.desc&limit=100':''}`)));const details=await request('/rest/v1/schedule_details?select=*') as {id:string;title:string}[];if(!r[0].some((p:Profile)=>p.id===userId()))throw new Error('Этот аккаунт не входит в нашу пару.');return {story:await loadStory(),home:await getHome(),...Object.fromEntries(tables.map((t,i)=>[t,t==='schedules'?r[i].map((s:Schedule)=>({...s,title:details.find(d=>d.id===s.id)?.title||null})):r[i]]))} as Data}
export async function saveSchedule(body:Omit<Schedule,'id'|'title'>,title:string,replacement?:{replaces:string;exception_day:string}){return request('/rest/v1/rpc/save_schedule',{method:'POST',body:JSON.stringify({payload:{...body,...replacement},event_title:title})})}
export async function exceptSchedule(id:string,day:string){return request('/rest/v1/rpc/except_schedule',{method:'POST',body:JSON.stringify({schedule_id:id,exception_day:day})})}
export async function respond(id:string,version:number,action:string,extra:object={}){return request('/rest/v1/rpc/respond_meeting',{method:'POST',body:JSON.stringify({meeting_id:id,expected_version:version,action,...extra})})}
export async function upload(file:File){
 const owner=userId();if(!owner)throw new Error('Войдите снова');
 const blob=await preparePhoto(file);
 const extension=blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png';
 const path=`${owner}/${crypto.randomUUID()}.${extension}`;
 await request(`/storage/v1/object/memories/${path}`,{method:'POST',body:blob,headers:{'Content-Type':blob.type}});
 if(userId()===owner)photoCache.put(owner,path,blob);
 return path;
}
export async function downloadPhoto(path:string,signal?:AbortSignal):Promise<Blob>{
 if(path.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Некорректный путь фото.');
 const t=await token(),encoded=path.split('/').map(encodeURIComponent).join('/');
 const response=await fetch(`${url}/storage/v1/object/authenticated/memories/${encoded}`,{headers:{apikey:key,Authorization:`Bearer ${t}`},signal,cache:'no-store',credentials:'omit'});
 if(!response.ok)throw new Error('Фото временно недоступно.');
 const blob=await response.blob();
 if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||!blob.size)throw new Error('Не удалось прочитать фото.');
 return blob;
}

export async function photoUrl(path:string){const j=await request(`/storage/v1/object/sign/memories/${path}`,{method:'POST',body:JSON.stringify({expiresIn:1800})});return `${url}/storage/v1${j.signedURL}`}
export async function removePhoto(path:string){photoCache.forget(userId()||'',path);await request('/storage/v1/object/memories',{method:'DELETE',body:JSON.stringify({prefixes:[path]})})}

export async function loadStory():Promise<Story|null>{
 try{const value=await storyAction('read');return value&&Array.isArray(value.sessions)&&Array.isArray(value.letters)?{...value,received_at:Date.now()}:null}catch(error){if([404].includes((error as {status:number}).status))return null;throw error}
}
export async function storyAction(action:string,operation_id:string|null=null,payload:object={}):Promise<Story>{return request('/rest/v1/rpc/story_action',{method:'POST',body:JSON.stringify({action,operation_id,payload})})}
