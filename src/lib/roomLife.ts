import type {Meeting} from '../types';
export type Location = 'living' | 'bedroom' | 'greenhouse';
export const locations: {id: Location; name: string; icon: string; note: string; unlock: number}[] = [
  {id: 'living', name: 'Гостиная', icon: '⌂', note: 'Чай, плед и немного хаоса', unlock: 0},
  {id: 'bedroom', name: 'Спальня', icon: '☾', note: 'Ещё пять минуточек', unlock: 2},
  {id: 'greenhouse', name: 'Оранжерея', icon: '❧', note: 'Маленькие зелёные победы', unlock: 3},
];
export const catalog = [
  {id: 'candles', name: 'Тёплые свечи', icon: '🕯', note: 'Для длинных осенних вечеров', unlock: 1},
  {id: 'cushion', name: 'Осенняя подушка', icon: '🍂', note: 'Мягкое место с кошачьими когтями', unlock: 2},
  {id: 'pumpkin', name: 'Тыква-фонарь', icon: '🎃', note: 'Светится с наступлением ночи', unlock: 3},
  {id: 'books', name: 'Стопка книг', icon: '📚', note: 'Почитать или сбросить на пол', unlock: 4},
  {id: 'ghost', name: 'Привидение', icon: '👻', note: 'Пугает только кошку. Иногда.', unlock: 5},
  {id: 'garland', name: 'Гирлянда-летучие мыши', icon: '🦇', note: 'Хеллоуин под самым потолком', unlock: 6},
] as const;
export type ItemId = typeof catalog[number]['id'];
export type PlantId = 'marigold' | 'cactus' | 'mint' | 'pumpkin' | 'fern' | 'lavender' | 'monstera';
export const seeds: {id: PlantId; name: string; icon: string; color: string; unlock: number; meetings: number; note: string}[] = [
  {id: 'marigold', name: 'Бархатцы', icon: '🌼', color: '#dc9b42', unlock: 0, meetings: 3, note: 'Маленькое солнце, которое вырастите вместе.'},
  {id: 'cactus', name: 'Кактус', icon: '🌵', color: '#6b9367', unlock: 0, meetings: 4, note: 'Колючий снаружи. Очень ваш внутри.'},
  {id: 'mint', name: 'Мята', icon: '🌱', color: '#87a479', unlock: 1, meetings: 3, note: 'Для чая, долгих разговоров и хороших вечеров.'},
  {id: 'pumpkin', name: 'Тыква', icon: '🎃', color: '#d67d3f', unlock: 2, meetings: 4, note: 'Сначала крошечная. Потом хозяйка всей грядки.'},
  {id: 'fern', name: 'Папоротник', icon: '🌿', color: '#719462', unlock: 3, meetings: 4, note: 'Зелёный свидетель ваших маленьких приключений.'},
  {id: 'lavender', name: 'Лаванда', icon: '🪻', color: '#aa8bb0', unlock: 5, meetings: 5, note: 'Для спокойных дней, когда никуда не надо спешить.'},
  {id: 'monstera', name: 'Монстера', icon: '🪴', color: '#4e7b59', unlock: 8, meetings: 6, note: 'Большие листья. Серьёзные отношения с уютом.'},
];
export type GardenPlant = {id: string; species: PlantId; name: string; plantedAt: number; baseline: string[]; growth: number};
export type Damage = {location: Location; target: 'sofa' | 'pot' | ItemId; text: string};
export type HomeLife = {
  version: 2; location: Location; items: Record<Location, ItemId[]>; plants: GardenPlant[];
  completedMeetings: string[]; damage: Damage[]; mischief: number; nextMischiefAt: number; lastEvent: string;
};
export function newHome(now = Date.now()): HomeLife {
  return {version: 2, location: 'living', items: {living: [], bedroom: [], greenhouse: []}, plants: [], completedMeetings: [],
    damage: [], mischief: 0, nextMischiefAt: now + 45000, lastEvent: 'Кошка недовольна. Пока просто смотрит.'};
}
export function isNight(date = new Date()) {return date.getHours() >= 19 || date.getHours() < 7}
export function plantCapacity(count: number) {return Math.min(6, 3 + Math.floor(count/3))}
export function growPlants(home: HomeLife) {
  for(const plant of home.plants){
    const species=seeds.find(s=>s.id===plant.species)!;
    plant.growth=Math.min(1, home.completedMeetings.filter(id=>!plant.baseline.includes(id)).length/species.meetings);
  }
}
export function syncMeetings(home: HomeLife, meetings: Pick<Meeting,'id'|'status'>[]) {
  const known=new Set(home.completedMeetings), previous=known.size;
  for(const meeting of meetings)if(meeting.status==='completed')known.add(meeting.id);
  home.completedMeetings=[...known]; growPlants(home);
  return known.size-previous;
}
export function createPlant(home: HomeLife, species: PlantId, name: string, now=Date.now(), id:string=crypto.randomUUID()): GardenPlant | null {
  const seed=seeds.find(s=>s.id===species), cleaned=name.trim();
  if(!seed||home.completedMeetings.length<seed.unlock||!cleaned||cleaned.length>24||home.plants.length>=plantCapacity(home.completedMeetings.length)||home.plants.some(p=>p.id===id))return null;
  const plant={id,species,name:cleaned,plantedAt:now,baseline:[...home.completedMeetings],growth:0};home.plants.push(plant);return plant;
}
export function plantStage(growth: number) {
  return growth >= 1 ? 'Взрослое растение' : growth >= .65 ? 'Набирает силу' : growth >= .3 ? 'Первые листья' : growth > 0 ? 'Росток' : 'Семечко';
}
export function toggleItem(home: HomeLife, id: ItemId) {
  const item=catalog.find(i=>i.id===id);
  if(!item||home.completedMeetings.length<item.unlock)return false;
  const items=home.items[home.location],index=items.indexOf(id);
  if(index>=0)items.splice(index,1);else items.push(id);
  home.damage=home.damage.filter(d=>!(d.location===home.location&&d.target===id));return true;
}
export function canEnter(home: HomeLife, location: Location) {return home.completedMeetings.length >= locations.find(l=>l.id===location)!.unlock}
export function nextReward(count: number) {
  return [...catalog.map(i=>({name:i.name,icon:i.icon,unlock:i.unlock})),...locations.filter(l=>l.unlock).map(l=>({name:l.name,icon:l.icon,unlock:l.unlock})),...seeds.filter(s=>s.unlock).map(s=>({name:`Семена: ${s.name}`,icon:s.icon,unlock:s.unlock}))].filter(r=>r.unlock>count).sort((a,b)=>a.unlock-b.unlock)[0];
}
export function catMischief(home: HomeLife, now = Date.now(), random = Math.random): Damage | null {
  if(now<home.nextMischiefAt)return null;
  home.nextMischiefAt=now+60000+random()*60000;
  const targets: Damage[]=[
    {location:home.location,target:'sofa',text:home.location==='bedroom'?'Кошка подрала покрывало. Ей не понравился цвет.':home.location==='greenhouse'?'Кошка подрала бортик грядки. Просто так.':'Кошка подрала диван. Теперь это её дизайнерская работа.'},
    ...(home.location!=='greenhouse'||home.plants.length?[{location:home.location,target:'pot' as const,text:'Кошка опрокинула горшок. Земля теперь тоже декор.'}]:[]),
    ...home.items[home.location].map(target=>({location:home.location,target,text:`Кошка испортила «${catalog.find(i=>i.id===target)!.name}». И даже не извинилась.`})),
  ];
  const available=targets.filter(t=>!home.damage.some(d=>d.location===t.location&&d.target===t.target));
  if(!available.length)return null;
  const damage=available[Math.min(available.length-1,Math.floor(random()*available.length))];
  home.damage.push(damage);home.mischief++;home.lastEvent=damage.text;return damage;
}
export const HOME_KEY='ustime.home.v2', LEGACY_HOME_KEY='ustime.home.v1';
export function loadHome(raw: string | null, now = Date.now(), meetings: Pick<Meeting,'id'|'status'>[]=[]): HomeLife {
  const fallback=newHome(now);syncMeetings(fallback,meetings);
  if(!raw)return fallback;
  try {
    const h=JSON.parse(raw);
    if(h?.version===1){
      // Keep the old house, but replace time/watering progress with meeting progress.
      if(locations.some(l=>l.id===h.location)&&canEnter(fallback,h.location))fallback.location=h.location;
      for(const l of locations)if(Array.isArray(h.items?.[l.id]))fallback.items[l.id]=catalog.filter(i=>i.unlock<=fallback.completedMeetings.length&&h.items[l.id].includes(i.id)).map(i=>i.id);
      if(Array.isArray(h.plants))for(const p of h.plants.slice(0,3))if(seeds.some(s=>s.id===p.id))createPlant(fallback,p.id,seeds.find(s=>s.id===p.id)!.name,now,`legacy-${p.id}`);
      return fallback;
    }
    if(h?.version!==2||!locations.some(l=>l.id===h.location)||!h.items||!locations.every(l=>Array.isArray(h.items[l.id])&&h.items[l.id].length<=catalog.length&&new Set(h.items[l.id]).size===h.items[l.id].length&&h.items[l.id].every((id:unknown)=>catalog.some(i=>i.id===id)))
      ||!Array.isArray(h.completedMeetings)||!h.completedMeetings.every((id:unknown)=>typeof id==='string')||new Set(h.completedMeetings).size!==h.completedMeetings.length
      ||!Array.isArray(h.plants)||h.plants.length>6||new Set(h.plants.map((p:GardenPlant)=>p.id)).size!==h.plants.length
      ||!h.plants.every((p:GardenPlant)=>p&&typeof p.id==='string'&&seeds.some(s=>s.id===p.species)&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=24&&Number.isFinite(p.plantedAt)&&Array.isArray(p.baseline)&&p.baseline.every(id=>typeof id==='string'))
      ||!Array.isArray(h.damage)||!h.damage.every((d:Damage)=>d&&locations.some(l=>l.id===d.location)&&['sofa','pot',...catalog.map(i=>i.id)].includes(d.target)&&typeof d.text==='string')
      ||!Number.isFinite(h.mischief)||!Number.isFinite(h.nextMischiefAt)||typeof h.lastEvent!=='string')return fallback;
    syncMeetings(h,meetings);
    if(!canEnter(h,h.location))h.location='living';
    for(const l of locations)h.items[l.id]=h.items[l.id].filter((id:ItemId)=>catalog.find(i=>i.id===id)!.unlock<=h.completedMeetings.length);
    h.nextMischiefAt=now+45000;return h;
  }catch{return fallback}
}
