import {newHome,syncMeetings,createPlant,toggleItem,growPlants,type HomeLife,type Location,type PlantId,type ItemId} from '../../src/lib/roomLife';
import type {Meeting} from '../../src/types';
export function homeMock(meetings:Record<string,unknown>[]){
 const state=newHome(),operations=new Map<string,string>();let revision=0;
 const snapshot=()=>{syncMeetings(state,meetings as Pick<Meeting,'id'|'status'>[]);return {revision,state:structuredClone(state)}};
 function change(body:{operation_id:string;payload:any}){
  const key=JSON.stringify(body.payload),seen=operations.get(body.operation_id);if(seen){if(seen!==key)throw new Error('Operation ID already used');return snapshot()}
  snapshot();const p=body.payload,location=(p.location||'living') as Location;state.location=location;
  if(p.kind==='plant'){if(!createPlant(state,p.species as PlantId,p.name,Date.now(),body.operation_id))throw new Error('Посадка недоступна')}
  else if(p.kind==='place'){const items=state.items[location];if(items.includes(p.target)!==p.placed&&!toggleItem(state,p.target as ItemId))throw new Error('Украшение закрыто')}
  else if(p.kind==='repair'){state.damage=state.damage.filter(d=>!(d.id===p.target&&d.location===location));state.lastEvent='Всё починено. Кошка смотрит с неодобрением и строит планы.'}
  else if(p.kind==='import'){for(const plant of p.plants as HomeLife['plants'])if(!state.plants.some(s=>s.id===plant.id))state.plants.push(plant);growPlants(state)}
  state.location='living';operations.set(body.operation_id,key);revision++;return snapshot();
 }
 function damage(location:Location='living'){state.damage.push({id:crypto.randomUUID(),location,target:'sofa',text:'Кошка подрала диван. Теперь это её дизайнерская работа.'});state.mischief++;state.lastEvent=state.damage.at(-1)!.text;revision++}
 return {state,operations,snapshot,change,damage};
}
