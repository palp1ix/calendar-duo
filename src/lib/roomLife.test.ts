import {describe,expect,it} from 'vitest';
import {canEnter,catMischief,createPlant,growPlants,isNight,loadHome,newHome,plantCapacity,syncMeetings,toggleItem} from './roomLife';
import {changeLocation,command,createWorld,findPath,nearestFloor,stations,tick,walkable} from './room';
import {nextSpeech,speech} from './roomSpeech';
const completed=(n:number)=>Array.from({length:n},(_,i)=>({id:`meeting-${i}`,status:'completed' as const}));
describe('meeting-driven home',()=>{
  it('uses real local time with no manual mode',()=>{for(const [hour,night] of [[0,true],[6,true],[7,false],[18,false],[19,true],[23,true]] as const)expect(isNight(new Date(2026,9,27,hour))).toBe(night)});
  it('only counts unique completed meetings and never farms refreshes or other statuses',()=>{
    const h=newHome(0);expect(syncMeetings(h,[...completed(1),...completed(1),{id:'pending',status:'accepted'},{id:'cancelled',status:'cancelled'}])).toBe(1);
    expect(syncMeetings(h,completed(1))).toBe(0);expect(h.completedMeetings).toHaveLength(1);
    expect(syncMeetings(h,completed(3))).toBe(2);expect(syncMeetings(h,[])).toBe(0);
  });
  it('locks decor and rooms until their meeting milestones',()=>{
    const h=newHome(0);expect(toggleItem(h,'candles')).toBe(false);expect(canEnter(h,'bedroom')).toBe(false);
    syncMeetings(h,completed(1));expect(toggleItem(h,'candles')).toBe(true);expect(h.items.living).toContain('candles');expect(toggleItem(h,'ghost')).toBe(false);
    syncMeetings(h,completed(2));expect(canEnter(h,'bedroom')).toBe(true);expect(canEnter(h,'greenhouse')).toBe(false);
    syncMeetings(h,completed(3));expect(canEnter(h,'greenhouse')).toBe(true);
  });
  it('creates named individuals and grows only for meetings after planting, including while away',()=>{
    const h=newHome(0);syncMeetings(h,completed(2));
    const p=createPlant(h,'marigold',' Граф Листочек ',0,'one')!;expect(p.name).toBe('Граф Листочек');expect(p.growth).toBe(0);
    growPlants(h);expect(p.growth).toBe(0);syncMeetings(h,completed(3));expect(p.growth).toBeCloseTo(1/3);
    const second=createPlant(h,'marigold','Барон',1,'two')!;expect(second.id).not.toBe(p.id);expect(second.growth).toBe(0);
    const loaded=loadHome(JSON.stringify(h),999999999,completed(4));expect(loaded.plants[0].growth).toBeCloseTo(2/3);expect(loaded.plants[1].growth).toBeCloseTo(1/3);
    syncMeetings(loaded,completed(20));expect(loaded.plants.every(p=>p.growth===1)).toBe(true);
  });
  it('offers a named cactus from the first day and grows it through four meetings',()=>{const h=newHome(0);const cactus=createPlant(h,'cactus','Колючий граф',0,'cactus')!;expect(cactus).toMatchObject({species:'cactus',name:'Колючий граф',growth:0});syncMeetings(h,completed(2));expect(cactus.growth).toBe(.5);syncMeetings(h,completed(4));expect(cactus.growth).toBe(1)});
  it('validates names, species unlocks, IDs and garden capacity',()=>{
    const h=newHome(0);expect(createPlant(h,'fern','Пушистик',0,'a')).toBeNull();expect(createPlant(h,'marigold',' ',0,'a')).toBeNull();expect(createPlant(h,'marigold','x'.repeat(25),0,'a')).toBeNull();
    for(let i=0;i<3;i++)expect(createPlant(h,'marigold',`Цветок ${i}`,0,`${i}`)).not.toBeNull();
    expect(createPlant(h,'marigold','Ещё',0,'3')).toBeNull();syncMeetings(h,completed(3));expect(createPlant(h,'fern','Пушистик',0,'3')).not.toBeNull();expect(createPlant(h,'marigold','Дубликат',0,'3')).toBeNull();expect(plantCapacity(100)).toBe(6);
  });
  it('persists names, items and damage without adding unseen mischief',()=>{
    const h=newHome(0);syncMeetings(h,completed(4));toggleItem(h,'books');createPlant(h,'fern','Кусь',0,'fern');h.location='bedroom';const d=catMischief(h,45000,()=>0);expect(d?.location).toBe('bedroom');expect(catMischief(h,45001,()=>0)).toBeNull();
    const loaded=loadHome(JSON.stringify(h),999999);expect(loaded.items.living).toContain('books');expect(loaded.plants[0].name).toBe('Кусь');expect(loaded.damage).toEqual(h.damage);expect(catMischief(loaded,999999,()=>0)).toBeNull();
  });
  it('never damages the same item twice',()=>{const h=newHome(0);for(let n=1;n<=10;n++)catMischief(h,n*200000,()=>0);expect(h.damage).toHaveLength(2);expect(h.mischief).toBe(2)});
  it('migrates the watering save and ignores manual night overrides and old growth',()=>{
    const legacy={version:1,location:'greenhouse',timeMode:'night',items:{living:['pumpkin'],bedroom:[],greenhouse:[]},plants:[{id:'marigold',growth:1}]};
    const h=loadHome(JSON.stringify(legacy),0,completed(3));expect(h.version).toBe(2);expect(h.location).toBe('greenhouse');expect(h.items.living).toContain('pumpkin');expect(h.plants[0]).toMatchObject({name:'Бархатцы',growth:0});expect('timeMode' in h).toBe(false);
  });
  it('recovers safely from corrupt progress and recalculates stored growth',()=>{
    for(const raw of ['{','null','{}',JSON.stringify({...newHome(0),plants:[{}]}),JSON.stringify({...newHome(0),items:{}})])expect(loadHome(raw,0)).toEqual(newHome(0));
    const h=newHome(0);createPlant(h,'marigold','Малыш',0,'one')!.growth=1;expect(loadHome(JSON.stringify(h),1).plants[0].growth).toBe(0);
  });
  it('keeps activities reachable in every earned room and refuses locked travel',()=>{
    const w=createWorld();changeLocation(w,'bedroom');expect(w.home.location).toBe('living');syncMeetings(w.home,completed(3));
    for(const location of ['living','bedroom','greenhouse'] as const){changeLocation(w,location);expect(w.home.location).toBe(location);for(const a of w.actors)for(const pair of Object.values(stations))for(const target of pair){const goal=nearestFloor(target,location),path=findPath(a,target,location);if(a.x===goal.x&&a.y===goal.y)continue;expect(path.at(-1)).toEqual(goal);expect(path.every(p=>walkable(p,location))).toBe(true)}command(w,0,'wander',{x:240,y:252});tick(w,16,true);expect(w.actors[0]).toMatchObject({x:240,y:252,path:[]})}
  });
  it('avoids consecutive repeated lines in every speech pool',()=>{for(const kind of Object.keys(speech) as (keyof typeof speech)[]){expect(speech[kind].length).toBeGreaterThan(4);expect(nextSpeech(kind,speech[kind][0],()=>0)).not.toBe(speech[kind][0])}});
});
