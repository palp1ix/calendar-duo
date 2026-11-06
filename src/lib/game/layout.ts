import type {HomeLife} from '../roomLife';
import {kitchenOf} from './construction';

export type Furnishing = {id: string; label: string; x: number; y: number; w: number; h: number; color: number; kind?: string};
export function plantSpot(home:HomeLife,index:number){
  const plant=home.plants[index],tree=['sakura','lemon-tree','japanese-maple'].includes(plant.species);
  if(home.plants.length<=6)return {x:45+(index%3)*54+(index>=3?180:0),y:tree?221:146};
  // The dev showcase displays every species; normal gardens retain six slots.
  const before=home.plants.slice(0,index).filter(p=>['sakura','lemon-tree','japanese-maple'].includes(p.species)===tree).length;
  return tree?{x:55+before*160,y:250}:{x:40+(before%5)*83+(before>=5?40:0),y:before<5?130:154};
}
export function furnishings(home: HomeLife): Furnishing[] {
  const kitchen = kitchenOf(home), complete = kitchen.stage === 3;
  const sofa = {id: 'sofa', label: complete ? 'Диван' : 'Наш первый матрас', x: 154, y: 111, w: 160, h: 55, color: 0x91a17e};
  const window = {id: 'window', label: 'Окно', x: 174, y: 23, w: 100, h: 65, color: 0xc0d3c5};
  const lamp = {id: 'lamp', label: 'Торшер', x: 319, y: 101, w: 28, h: 63, color: 0xe8cb91};
  if (home.location === 'bedroom') return [
    {...sofa, label:home.items.bedroom.includes('king-bed')?'Огромная кровать':'Кровать', x:home.items.bedroom.includes('king-bed')?142:sofa.x,w:home.items.bedroom.includes('king-bed')?190:sofa.w,h:home.items.bedroom.includes('king-bed')?90:sofa.h,color: 0xb78278}, window, lamp,
    {id:'study0',label:'Комод',x:26,y:145,w:84,h:61,color:0xbb9972},
    {id:'study1',label:'Книга у кровати',x:376,y:121,w:64,h:69,color:0xbd9c78},
  ];
  if (home.location === 'greenhouse') return [
    {id:'plant',label:'Грядка с растениями',x:151,y:118,w:162,h:48,color:0x716249},
    {id:'plant-left',label:'Стол садовода',x:24,y:116,w:111,h:55,color:0xac9972},
    {id:'plant-right',label:'Полка с растениями',x:375,y:115,w:65,h:76,color:0xac9972},
    ...home.plants.flatMap((p,i)=>['sakura','lemon-tree','japanese-maple'].includes(p.species)?[{id:`plant-tree-${p.id}`,label:p.name,x:plantSpot(home,i).x-7,y:plantSpot(home,i).y,w:27,h:20,color:0xaf8561,kind:'tree'}]:[]),
  ];
  const objects: Furnishing[] = [sofa, window, lamp];
  if (complete) objects.push(
    {id:'tea',label:'Чайник',x:24,y:86,w:111,h:45,color:kitchen.style==='clay'?0xc58e76:0x9ba780},
    {id:'tv',label:'Телевизор',x:326,y:190,w:66,h:40,color:0x687b70},
    {id:'study0',label:'Левый рабочий стол',x:27,y:147,w:82,h:43,color:0xb38c62},
    {id:'study1',label:'Правый рабочий стол',x:373,y:136,w:65,h:40,color:0xb38c62},
    {id:'plant',label:'Кактус',x:124,y:100,w:27,h:61,color:0x7d965d},
    {id:'table',label:'Столик',x:182,y:190,w:102,h:35,color:0xb38c62},
  );
  if(home.items.living.includes('television')){
    const old=objects.findIndex(f=>f.id==='tv');if(old>=0)objects.splice(old,1);
    objects.push({id:'tv',label:'Большой телевизор',x:326,y:180,w:112,h:66,color:0x687b70});
  }
  if(home.items.living.includes('playstation'))objects.push({id:'playstation',label:'Играть на PlayStation',x:402,y:248,w:36,h:18,color:0xe8e5d8});
  if(home.items.living.includes('burger-machine'))objects.push({id:'burger-machine',label:'Взять чизбургер',x:410,y:30,w:40,h:78,color:0xb97c56});
  return objects;
}
