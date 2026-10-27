import * as api from './api';
import type {HomeLife,Location} from './roomLife';
export type HomeSnapshot={revision:number;state:HomeLife};
export type HomeOperation={kind:'plant'|'place'|'repair'|'import';location?:Location;species?:string;name?:string;target?:string;placed?:boolean;plants?:HomeLife['plants'];items?:HomeLife['items']};
let location:Location|null='living';
export function setHomeLocation(value:Location|null){location=value}
export function newerHome(current:HomeSnapshot|null,incoming:HomeSnapshot|null){return incoming&&(!current||incoming.revision>=current.revision)?incoming:current}
export async function getHome():Promise<HomeSnapshot>{
 const value=await api.request('/rest/v1/rpc/get_home',{method:'POST',body:JSON.stringify({location})});
 if(!value||!Number.isFinite(value.revision)||!value.state)throw new Error('Не удалось загрузить общий дом.');return value;
}
export async function changeHome(id:string,payload:HomeOperation):Promise<HomeSnapshot>{const value=await api.request('/rest/v1/rpc/change_home',{method:'POST',body:JSON.stringify({operation_id:id,payload})});if(!value||!Number.isFinite(value.revision)||!value.state)throw new Error('Не удалось подтвердить изменение дома. Повтори действие.');return value}
