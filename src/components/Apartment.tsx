import {useEffect,useRef,useState} from 'react';
import type {Meeting,Profile} from '../types';
import {changeLocation,command,createWorld,findPath,roomHit,tick,type Activity,type Point} from '../lib/room';
import {renderRoom} from '../lib/renderRoom';
import {HOME_KEY,LEGACY_HOME_KEY,canEnter,homeUnits,isNight,loadHome,locations,nextReward,type Location,type ItemId,type PlantId} from '../lib/roomLife';
import {nextSpeech,type SpeechKind} from '../lib/roomSpeech';
import HomeWorkshop,{type WorkshopPanel} from './HomeWorkshop';
import PixelIcon from './PixelIcon';
import LegacyHomeImport from './LegacyHomeImport';
import {changeHome,setHomeLocation,type HomeOperation,type HomeSnapshot} from '../lib/home';
import {userId} from '../lib/api';
import PlantNursery from './PlantNursery';
const noMeetings:Meeting[]=[];
function legacyHome(meetings:Meeting[],demo:boolean){try{const raw=demo?null:localStorage.getItem(HOME_KEY)||localStorage.getItem(LEGACY_HOME_KEY);return raw?loadHome(raw,Date.now(),meetings):null}catch{return null}}
const activities:Record<Activity,string>={wander:'Топает по делам',tea:'Чайный перерыв',sofa:'Отдыхает',study:'Делает вид, что учится',dance:'Дискотека в носках',tv:'Смотрит что-то странное',plant:'Совещание с растениями'};
type Bubble={text:string;actor?:number;point?:Point;pet?:boolean};
const furniture=[{id:'sofa',label:'Диван',x:154,y:111,w:160,h:55},{id:'tea',label:'Чайник',x:26,y:76,w:107,h:52},{id:'tv',label:'Телевизор',x:326,y:190,w:66,h:40},{id:'lamp',label:'Торшер',x:319,y:101,w:28,h:63},{id:'plant',label:'Кактус',x:124,y:100,w:27,h:61},{id:'window',label:'Окно',x:174,y:23,w:100,h:65},{id:'study0',label:'Левый рабочий стол',x:27,y:147,w:82,h:43},{id:'study1',label:'Правый рабочий стол',x:373,y:136,w:65,h:40}];
export default function Apartment({profiles,meetings=noMeetings,onInteract,together=false,celebrate=0,demo=false,sharedHome=null,onHomeChange,refreshHome,connectionError=''}:{connectionError?:string;sharedHome?:HomeSnapshot|null;onHomeChange?:(home:HomeSnapshot)=>void;refreshHome?:()=>Promise<void>;profiles:Profile[];meetings?:Meeting[];onInteract:(kind:string)=>void;together?:boolean;celebrate?:number;demo?:boolean}){
 const [initialWorld]=useState(()=>createWorld(sharedHome?structuredClone(sharedHome.state):undefined));
 const canvasRef=useRef<HTMLCanvasElement>(null),sceneRef=useRef<HTMLDivElement>(null),worldRef=useRef(initialWorld),propsRef=useRef({profiles,together,demo,onHomeChange,refreshHome}),dirty=useRef(true);
 propsRef.current={profiles:[...profiles].sort((a,b)=>a.slot-b.slot),together,demo,onHomeChange,refreshHome};
 const [frame,setFrame]=useState(()=>({actors:initialWorld.actors.map(a=>({...a})),cat:{...initialWorld.cat},selected:0}));
 const [bubble,setBubble]=useState<Bubble|null>(null),[party,setParty]=useState(false),[night,setNight]=useState(initialWorld.night),[pets,setPets]=useState(0);
 const [panel,setPanel]=useState<WorkshopPanel>(null),[nursery,setNursery]=useState(false),[busy,setBusy]=useState(false),[syncError,setSyncError]=useState(''),[localClock,setLocalClock]=useState(()=>new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}));
 const [,rerender]=useState(0),previousSpeech=useRef<Partial<Record<SpeechKind,string>>>({}),speechUntil=useRef(0);
 const bubbleTimer=useRef<ReturnType<typeof setTimeout>>(),partyTimer=useRef<ReturnType<typeof setTimeout>>();
 const revision=useRef(sharedHome?.revision??-1),pending=useRef<{id:string;payload:HomeOperation}|null>(null),working=useRef(false);
 const [legacy]=useState(()=>legacyHome(meetings,demo)),[importOpen,setImportOpen]=useState(false),[imported,setImported]=useState(()=>{try{return localStorage.getItem('ustime.home.imported.'+userId())==='yes'}catch{return false}});
 function applySnapshot(snapshot:HomeSnapshot){if(snapshot.revision<revision.current)return;const w=worldRef.current,oldMischief=w.home.mischief,oldCount=homeUnits(w.home);revision.current=snapshot.revision;w.home={...structuredClone(snapshot.state),location:w.home.location};dirty.current=true;rerender(n=>n+1);setHomeLocation(canEnter(w.home,w.home.location)?w.home.location:null);if(w.home.mischief>oldMischief){say(w.home.lastEvent,undefined,undefined,true);const d=w.home.damage.at(-1);if(d?.location===w.home.location){w.cat.path=findPath(w.cat,{x:d.target==='sofa'?270:156,y:d.target==='sofa'?180:246},w.home.location);w.cat.until=w.time+4000}}else if(homeUnits(w.home)>oldCount){w.heartsUntil=w.time+4500;say('Новое открытие! Ваш дом стал немного уютнее.',w.selected)}}
 async function mutate(payload:HomeOperation){
  if(demo){setSyncError('Войди в дом, чтобы сохранять изменения вместе.');return false}if(working.current)return false;
  if(pending.current&&JSON.stringify(pending.current.payload)!==JSON.stringify(payload)){setSyncError('Сначала повтори неподтверждённое действие. Его данные сохранены.');return false}
  const operation=pending.current||{id:crypto.randomUUID(),payload};pending.current=operation;working.current=true;setBusy(true);setSyncError('');
  try{const snapshot=await changeHome(operation.id,operation.payload);applySnapshot(snapshot);propsRef.current.onHomeChange?.(snapshot);pending.current=null;if(payload.kind==='import'){setImported(true);try{localStorage.setItem('ustime.home.imported.'+userId(),'yes')}catch{}}return true}
  catch(error){const message=error instanceof Error?error.message:'Нет связи. Попробуй ещё раз.';setSyncError(message);const status=(error as {status?:number})?.status;if(status&&status<500)pending.current=null;return false}
  finally{working.current=false;setBusy(false)}
 }
 function say(text:string,actor?:number,point?:Point,pet=false){setBubble({text,actor,point,pet});speechUntil.current=Date.now()+5500;clearTimeout(bubbleTimer.current);bubbleTimer.current=setTimeout(()=>setBubble(null),5500)}
 function speak(kind:SpeechKind,actor?:number,point?:Point,pet=false){const text=nextSpeech(kind,previousSpeech.current[kind]);previousSpeech.current[kind]=text;say(text,actor,point,pet)}
 function goTo(location:Location){const w=worldRef.current;changeLocation(w,location);setBubble(null);setNursery(false);setPanel(null);dirty.current=true;setHomeLocation(canEnter(w.home,location)?location:null);rerender(n=>n+1);if(!demo)void propsRef.current.refreshHome?.()}
 function addItem(id:ItemId){const h=worldRef.current.home;void mutate({kind:'place',location:h.location,target:id,placed:!h.items[h.location].includes(id)})}
 async function plant(species:PlantId,name:string){const w=worldRef.current;if(!canEnter(w.home,'greenhouse')||w.home.location!=='greenhouse')return false;if(await mutate({kind:'plant',location:'greenhouse',species,name:name.trim()})){setPanel('garden');say(`Добро пожаловать домой, ${name.trim()}.`,w.selected);return true}return false}
 function repair(id:string){void mutate({kind:'repair',location:worldRef.current.home.location,target:id})}
 function garden(){goTo('greenhouse');setPanel('garden')}
 function choose(id:number,speakNow=true){worldRef.current.selected=id;dirty.current=true;if(speakNow)speak('person',id)}
 function doActivity(activity:Activity){const w=worldRef.current;command(w,w.selected,activity);dirty.current=true;return w.selected}
 function play(kind:'dance'|'hug'|'tea'|'poke'){
   const w=worldRef.current;if(!canEnter(w.home,w.home.location)||(!demo&&revision.current<0))return;dirty.current=true;
   if(kind==='dance'){w.partyUntil=w.time+8500;for(const a of w.actors)command(w,a.id,'dance');setParty(true);clearTimeout(partyTimer.current);partyTimer.current=setTimeout(()=>setParty(false),8500);speak('dance',w.selected)}
   else if(kind==='hug'){w.heartsUntil=w.time+4300;speak('hug',1-w.selected);onInteract('hug')}
   else if(kind==='tea'){speak('tea',doActivity('tea'));onInteract('tea')}
   else{speak('poke',w.selected);w.heartsUntil=w.time+1600;onInteract('poke')}
 }
 function activate(id:string){
   const w=worldRef.current;if(!canEnter(w.home,w.home.location)||(!demo&&revision.current<0))return;dirty.current=true;
   if(id==='actor0'||id==='actor1'){choose(id==='actor0'?0:1);return}
   if(id==='cat'){w.cat.pets++;setPets(w.cat.pets);w.cat.path=[];w.cat.until=w.time+1200;speak('cat',undefined,undefined,true);return}
   if(id==='lamp'){w.lamp=!w.lamp;say(w.lamp?'Уют: включён. Серьёзность: выключена.':'Режим «счёт за свет нас не найдёт».',undefined,{x:332,y:112});return}
   if(id==='window'){speak(w.night?'night':'autumn',undefined,{x:224,y:47});return}
   if(id==='study0'||id==='study1'){
     if(w.home.location==='bedroom'){say(id==='study0'?'Комод хранит свитера и секреты. В основном свитера.':'Ночная книга. Уже третью неделю на одной странице.',undefined,{x:id==='study0'?68:405,y:145});return}
     choose(id==='study0'?0:1,false);speak('study',doActivity('study'));return;
   }
   if(id==='tv'){w.tv=!w.tv;const a=doActivity('tv');if(w.tv)speak('tv',a);else say('Телевизор отдыхает. Теперь расскажи, как прошёл твой день.',a);return}
   if(id==='sofa'){if(!together&&w.actors[1-w.selected].activity==='sofa')command(w,1-w.selected,'tea');speak(w.home.location==='bedroom'?'bedroom':'sofa',doActivity('sofa'));return}
   if(id==='tea'){speak('tea',doActivity('tea'));return}
   if(id==='plant'){setPanel('garden');speak('plant',doActivity('plant'))}
 }
 useEffect(()=>{if(sharedHome)applySnapshot(sharedHome)},[sharedHome]);
 useEffect(()=>{const w=worldRef.current;if(celebrate){w.heartsUntil=w.time+4200;dirty.current=true;speak('hug',1-w.selected)}},[celebrate]);
 useEffect(()=>{dirty.current=true},[profiles,together]);
 useEffect(()=>{const scene=sceneRef.current;if(!scene)return;const center=()=>{scene.scrollLeft=(scene.scrollWidth-scene.clientWidth)/2};center();const observer=new ResizeObserver(center);observer.observe(scene);return()=>observer.disconnect()},[]);
 useEffect(()=>{
   const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d')!;canvas.width=960;canvas.height=600;ctx.scale(2,2);ctx.imageSmoothingEnabled=false;
   const reduced=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,last=0,snapshot=0,lifeUpdate=0,nextChat=Date.now()+22000;
   const motionChanged=()=>{dirty.current=true};reduced.addEventListener('change',motionChanged);
   const visibility=()=>{last=0;dirty.current=true};document.addEventListener('visibilitychange',visibility);
   function loop(t:number){
     raf=requestAnimationFrame(loop);if(document.hidden||t-last<33)return;const dt=last?Math.min(t-last,100):33;last=t;
     const w=worldRef.current;w.together=propsRef.current.together;
     const hadHearts=w.time<w.heartsUntil,hadParty=w.time<w.partyUntil,hadDestination=!!w.destination&&w.time<w.destination.until;if(canEnter(w.home,w.home.location))tick(w,dt,reduced.matches);
     if(t-lifeUpdate>=1000){
       lifeUpdate=t;const nextNight=isNight();if(w.night!==nextNight){w.night=nextNight;setNight(nextNight)}setLocalClock(new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}));
       if(canEnter(w.home,w.home.location)&&!reduced.matches&&Date.now()>=nextChat&&Date.now()>speechUntil.current){nextChat=Date.now()+22000+Math.random()*14000;if(Math.random()<.35)speak('cat',undefined,undefined,true);else{const a=w.actors[Math.floor(Math.random()*2)],kind=a.activity==='wander'?'person':a.activity==='sofa'?(w.home.location==='bedroom'?'bedroom':'sofa'):a.activity==='tv'?'tv':a.activity;speak(kind,a.id)}}
       dirty.current=true;
     }
     if(hadHearts!==(w.time<w.heartsUntil)||hadParty!==(w.time<w.partyUntil)||hadDestination!==(!!w.destination&&w.time<w.destination.until))dirty.current=true;
     if(!reduced.matches||dirty.current){renderRoom(ctx,w,propsRef.current.profiles,reduced.matches);if(t-snapshot>=90||dirty.current){setFrame({actors:w.actors.map(a=>({...a})),cat:{...w.cat},selected:w.selected});snapshot=t}dirty.current=false}
   }
   raf=requestAnimationFrame(loop);return()=>{setHomeLocation(null);cancelAnimationFrame(raf);reduced.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',visibility);clearTimeout(bubbleTimer.current);clearTimeout(partyTimer.current)};
 },[]);
 const home=worldRef.current.home,count=homeUnits(home),location=locations.find(l=>l.id===home.location)!,reward=nextReward(count),locked=!canEnter(home,home.location),ready=demo||revision.current>=0;
 const speaker=bubble?.actor!==undefined?frame.actors[bubble.actor]:null,anchor=speaker?{x:speaker.x,y:speaker.y-(!speaker.path.length&&speaker.activity==='sofa'?12:0)-50}:bubble?.pet?{x:frame.cat.x,y:frame.cat.y-22}:bubble?.point;
 const visibleFurniture=home.location==='living'?furniture:home.location==='bedroom'?[{id:'sofa',label:'Кровать',x:154,y:105,w:160,h:64},{id:'study0',label:'Комод',x:26,y:145,w:84,h:61},{id:'study1',label:'Книга у кровати',x:376,y:121,w:64,h:69},furniture[3],furniture[5]]:[{id:'plant',label:'Грядка с растениями',x:151,y:118,w:162,h:48},{id:'plant-left',label:'Стол садовода',x:24,y:116,w:111,h:55},{id:'plant-right',label:'Полка с растениями',x:375,y:115,w:65,h:76},furniture[5]];
 const names=propsRef.current.profiles.map(p=>p.name),selectedActor=frame.actors[frame.selected];
 return <div className={'apartment interactive-room '+(night?'night-room ':'')+(demo?'demo-room':'main-game')}>
   <div className="room-top"><div><span className="eyebrow"><i className="live-dot"/> НАШ ЖИВОЙ ДОМ</span><h2>Здесь растёт ваша история</h2></div><span className="room-weather" aria-label="Реальное время суток"><PixelIcon name={night?'moon':'autumn'}/>{night?'Осенняя ночь':'Осенний день'}<small>{localClock} · как за окном</small></span></div>
   <div className="home-progression"><div className="home-level"><PixelIcon name="heart" size={30}/><div><b>Уровень {1+Math.floor(count/3)}</b><small>{Math.floor((home.progressValue??count)*100)} искр близости · {home.completedMeetings.length} встреч</small></div></div><div className="next-reward"><div><b>{reward?<><PixelIcon name={reward.icon}/>Следом: {reward.name}</>:'Все открытия ваши. Продолжайте расти вместе.'}</b><small>{reward?`${Math.floor((home.progressValue??count)*100)}/${reward.unlock*100} искр`:'✧ Дом полон историй'}</small></div><progress aria-label="Прогресс следующей награды" value={reward?(home.progressValue??count):1} max={reward?reward.unlock:1}/></div></div>
   <div className="location-tabs" role="group" aria-label="Комнаты">{locations.map(l=>{const locked=!canEnter(home,l.id);return <button key={l.id} aria-pressed={home.location===l.id} onClick={()=>goTo(l.id)}><span className="location-tab-content"><span className="location-tab-icon" aria-hidden="true"><PixelIcon name={locked?'lock':l.id}/></span><span className="location-tab-label">{l.name}{locked&&<small>{l.unlock*100} искр</small>}</span></span></button>})}</div>
   <div className="location-caption"><span>{location.note}</span><span>♡ Время и забота превращаются в уют</span></div>
   <div className="room-scene"><div className="scene-scroll canvas-wrap" ref={sceneRef} tabIndex={0} role="region" aria-label="Комната, можно прокручивать по горизонтали"><div className="game-stage">
     <canvas ref={canvasRef} aria-label={`Интерактивная пиксельная комната: ${location.name}. Выберите персонажа и нажмите на свободный пол, чтобы ходить.`} onClick={e=>{if(locked||!ready)return;const r=e.currentTarget.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width*480,y:(e.clientY-r.top)/r.height*300};const hit=roomHit(worldRef.current,p);if(hit==='floor'){command(worldRef.current,worldRef.current.selected,'wander',p);setBubble(null);dirty.current=true}else if(hit)activate(hit)}}/>
     <div className="room-hotspots">{!locked&&ready&&visibleFurniture.map(f=><button type="button" key={f.id} className="furniture-hit" aria-label={f.label} style={{left:`${f.x/480*100}%`,top:`${f.y/300*100}%`,width:`${f.w/480*100}%`,height:`${f.h/300*100}%`}} onClick={()=>activate(f.id.startsWith('plant')?'plant':f.id)}><span>{f.label} ↗</span></button>)}{!locked&&ready&&frame.actors.map(a=><button type="button" key={a.id} data-testid={`room-actor-${a.id}`} data-x={Math.round(a.x)} data-y={Math.round(a.y)} data-moving={a.path.length>0} className={'actor-hit '+(a.id===frame.selected?'actor-selected':'')} aria-label={`Персонаж ${names[a.id]||(a.id?'Она':'Я')}: ${a.path.length?'идёт':activities[a.activity]}`} style={{left:`${a.x/480*100}%`,top:`${(a.y-(!a.path.length&&a.activity==='sofa'?12:0))/300*100}%`}} onClick={()=>choose(a.id)}><span>{names[a.id]||(a.id?'Она':'Я')}</span></button>)}{!locked&&ready&&<button type="button" className="cat-hit" aria-label="Погладить недовольную кошку" data-testid="room-cat" style={{left:`${frame.cat.x/480*100}%`,top:`${frame.cat.y/300*100}%`}} onClick={()=>activate('cat')}/>}</div>
     {bubble&&anchor&&<div key={bubble.text} className="actor-speech" role="status" style={{left:`${Math.max(24,Math.min(76,anchor.x/480*100))}%`,top:`${Math.max(19,anchor.y/300*100)}%`}}>{bubble.text}</div>}
   </div></div>
   {(locked||!ready)&&<div className="room-lock" data-testid="room-lock"><div><PixelIcon name="lock" size={40}/><h3>{ready?`${location.name} пока закрыта`:'Открываем общий дом…'}</h3>{ready&&<><p>Соберите {location.unlock*100} искр, чтобы открыть эту комнату.</p><b>Осталось искр: {Math.max(0,Math.ceil((location.unlock-(home.progressValue??count))*100))}</b><small>Время вместе, встречи и дни вашей истории</small></>}</div></div>}
   </div>
   <div className="scene-pan"><button aria-label="Посмотреть левую часть комнаты" onClick={()=>sceneRef.current?.scrollBy({left:-220})}>←</button><span>Проведи по комнате, чтобы осмотреться</span><button aria-label="Посмотреть правую часть комнаты" onClick={()=>sceneRef.current?.scrollBy({left:220})}>→</button></div>
   <div className="room-status"><div className="room-roster">{frame.actors.map(a=><button key={a.id} aria-pressed={a.id===frame.selected} onClick={()=>choose(a.id)}><span className="player-dot" style={{background:propsRef.current.profiles[a.id]?.outfit||(a.id?'#bf7e6f':'#81906b')}}/>{names[a.id]||(a.id?'Она':'Я')}</button>)}</div><span className="current-activity">{selectedActor.path.length?'Топ-топ-топ…':activities[selectedActor.activity]}</span><span className="cat-score">{pets?`Кошку потревожили: ${pets}`:'Кошка недовольна. Как обычно.'}</span></div>
   <div className="room-actions"><button disabled={locked||!ready} onClick={()=>play('hug')}><PixelIcon name="heart"/> Обнять</button><button disabled={locked||!ready} onClick={()=>play('tea')}><PixelIcon name="tea"/> Чаю?</button><button disabled={locked||!ready} className={party?'party-active':''} onClick={()=>play('dance')}><PixelIcon name="dance"/> Дискотека</button><button disabled={locked||!ready} onClick={()=>play('poke')}><PixelIcon name="spark"/> Тык!</button></div>
   <HomeWorkshop home={home} panel={panel} onPanel={setPanel} onItem={addItem} onCreate={()=>setNursery(true)} onGarden={garden} onRepair={repair} busy={busy}/>
   <div className="home-sync" role="status">{demo?'Демо дома. Изменения доступны после входа.':busy?'Сохраняем в общий дом…':syncError||(connectionError?'Нет связи · показываем последнее сохранение':'Общий дом · обновляется автоматически')}{syncError&&pending.current&&<button disabled={busy} onClick={()=>void mutate(pending.current!.payload)}>Повторить действие</button>}</div>
   {legacy&&((legacy.plants.some(p=>!home.plants.some(s=>s.id===p.id)))||(!imported&&Object.values(legacy.items).some(i=>i.length)))&&<button className="legacy-open" onClick={()=>setImportOpen(true)}>Перенести сохранение с этого устройства</button>}
   <p className="room-hint">Дом растёт от встреч, времени рядом и дней вашей истории. Растения подрастают и пока вы заняты своими делами.</p>
   {nursery&&!locked&&home.location==='greenhouse'&&<PlantNursery home={home} onCreate={plant} onClose={()=>setNursery(false)}/>}
   {importOpen&&legacy&&<LegacyHomeImport legacy={legacy} home={home} onClose={()=>setImportOpen(false)} onImport={(plants,items)=>mutate({kind:'import',plants,items})}/>}
 </div>;
}
