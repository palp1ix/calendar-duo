import {useEffect,useRef,useState} from 'react';
import type {Meeting,Profile} from '../types';
import {changeLocation,command,createWorld,findPath,roomHit,tick,type Activity,type Point} from '../lib/room';
import ProjectMenu from './game/ProjectMenu';
import type {HomeProject} from '../lib/game/projects';
import {furnishings} from '../lib/game/layout';
import KitchenProject,{KitchenPreview,type Placement} from './game/KitchenProject';
import {useGameFullscreen} from './game/useGameFullscreen';
import {kitchenOf,type KitchenStyle} from '../lib/game/construction';
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
export default function Apartment({profiles,meetings=noMeetings,onInteract,together=false,celebrate=0,demo=false,sharedHome=null,onHomeChange,refreshHome,connectionError=''}:{connectionError?:string;sharedHome?:HomeSnapshot|null;onHomeChange?:(home:HomeSnapshot)=>void;refreshHome?:()=>Promise<void>;profiles:Profile[];meetings?:Meeting[];onInteract:(kind:string)=>void;together?:boolean;celebrate?:number;demo?:boolean}){
 const [gardenSpecies,setGardenSpecies]=useState<PlantId|undefined>();
 const [placement,setPlacement]=useState<Placement>('catalog'),[kitchenStyle,setKitchenStyle]=useState<KitchenStyle>('sage');
 const [initialWorld]=useState(()=>createWorld(sharedHome?structuredClone(sharedHome.state):undefined));
 const gameRoot=useRef<HTMLDivElement>(null),phaserHost=useRef<HTMLDivElement>(null),sceneRef=useRef<HTMLDivElement>(null),worldRef=useRef(initialWorld),propsRef=useRef({profiles,together,demo,onHomeChange,refreshHome}),dirty=useRef(true);
 const fullscreen=useGameFullscreen(gameRoot),[engineError,setEngineError]=useState('');
 const activateRef=useRef<(id:string)=>void>(()=>{});
 propsRef.current={profiles:[...profiles].sort((a,b)=>a.slot-b.slot),together,demo,onHomeChange,refreshHome};
 const [frame,setFrame]=useState(()=>({actors:initialWorld.actors.map(a=>({...a})),cat:{...initialWorld.cat},selected:0}));
 const [bubble,setBubble]=useState<Bubble|null>(null),[party,setParty]=useState(false),[night,setNight]=useState(initialWorld.night),[pets,setPets]=useState(0);
 const [panel,setPanel]=useState<WorkshopPanel>(null),[nursery,setNursery]=useState(false),[busy,setBusy]=useState(false),[syncError,setSyncError]=useState(''),[localClock,setLocalClock]=useState(()=>new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}));
 const [,rerender]=useState(0),previousSpeech=useRef<Partial<Record<SpeechKind,string>>>({}),speechUntil=useRef(0);
 const bubbleTimer=useRef<ReturnType<typeof setTimeout>>(),partyTimer=useRef<ReturnType<typeof setTimeout>>();
 const revision=useRef(sharedHome?.revision??-1),pending=useRef<{id:string;payload:HomeOperation}|null>(null),working=useRef(false);
 const [legacy]=useState(()=>legacyHome(meetings,demo)),[importOpen,setImportOpen]=useState(false),[imported,setImported]=useState(()=>{try{return localStorage.getItem('ustime.home.imported.'+userId())==='yes'}catch{return false}});
 function applySnapshot(snapshot:HomeSnapshot){if(snapshot.revision<revision.current)return;const w=worldRef.current,oldMischief=w.home.mischief,oldCount=homeUnits(w.home),oldStage=kitchenOf(w.home).stage;revision.current=snapshot.revision;w.home={...structuredClone(snapshot.state),location:w.home.location};if(kitchenOf(w.home).stage!==oldStage)changeLocation(w,w.home.location);dirty.current=true;rerender(n=>n+1);setHomeLocation(canEnter(w.home,w.home.location)?w.home.location:null);if(w.home.mischief>oldMischief){say(w.home.lastEvent,undefined,undefined,true);const d=w.home.damage.at(-1);if(d?.location===w.home.location){w.cat.path=findPath(w.cat,{x:d.target==='sofa'?270:156,y:d.target==='sofa'?180:246},w.home.location,w.home);w.cat.until=w.time+4000}}else if(homeUnits(w.home)>oldCount){w.heartsUntil=w.time+4500;say('Новое открытие! Ваш дом стал немного уютнее.',w.selected)}}
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
   if(id==='tv'){w.gaming=false;w.tv=!w.tv;const a=doActivity('tv');if(w.tv)speak('tv',a);else say('Телевизор отдыхает. Теперь расскажи, как прошёл твой день.',a);return}
   if(id==='playstation'){w.tv=true;w.gaming=true;doActivity('tv');say('Геймпады готовы. Сегодня проходим игру вместе.',w.selected);return}
   if(id==='burger-machine'){w.snack={actor:w.selected,until:w.time+12000};command(w,w.selected,'wander',{x:396,y:138});say('Автомат выдал горячий чизбургер. С двойным сыром, как мы любим.',w.selected);return}
   if(id==='sofa'){if(!together&&w.actors[1-w.selected].activity==='sofa')command(w,1-w.selected,'tea');speak(w.home.location==='bedroom'?'bedroom':'sofa',doActivity('sofa'));return}
   if(id==='tea'){speak('tea',doActivity('tea'));return}
   if(id==='plant'){if(w.home.location!=='greenhouse'){garden();return}setPanel('garden');speak('plant',doActivity('plant'))}
 }
 activateRef.current=activate;
 useEffect(()=>{if(sharedHome)applySnapshot(sharedHome)},[sharedHome]);
 useEffect(()=>{const w=worldRef.current;if(celebrate){w.heartsUntil=w.time+4200;dirty.current=true;speak('hug',1-w.selected)}},[celebrate]);
 useEffect(()=>{dirty.current=true},[profiles,together]);
 useEffect(()=>{const scene=sceneRef.current;if(!scene)return;const center=()=>{scene.scrollLeft=(scene.scrollWidth-scene.clientWidth)/2};center();const observer=new ResizeObserver(center);observer.observe(scene);return()=>observer.disconnect()},[]);
 useEffect(()=>{
   const host=phaserHost.current;if(!host)return;let cancelled=false;let game:import('phaser').Game|undefined;
   const reduced=matchMedia('(prefers-reduced-motion: reduce)');let snapshot=0,lifeUpdate=0,nextChat=Date.now()+22000;
   const motionChanged=()=>{dirty.current=true};reduced.addEventListener('change',motionChanged);
   const visibility=()=>{dirty.current=true};document.addEventListener('visibilitychange',visibility);
   function loop(t:number,dt:number){
     if(document.hidden)return;
     const w=worldRef.current;w.together=propsRef.current.together;
     const hadHearts=w.time<w.heartsUntil,hadParty=w.time<w.partyUntil,hadDestination=!!w.destination&&w.time<w.destination.until;if(canEnter(w.home,w.home.location))tick(w,dt,reduced.matches);
     if(t-lifeUpdate>=1000){
       lifeUpdate=t;const nextNight=isNight();if(w.night!==nextNight){w.night=nextNight;setNight(nextNight)}setLocalClock(new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}));
       if(canEnter(w.home,w.home.location)&&!reduced.matches&&Date.now()>=nextChat&&Date.now()>speechUntil.current){nextChat=Date.now()+22000+Math.random()*14000;if(Math.random()<.35)speak('cat',undefined,undefined,true);else{const a=w.actors[Math.floor(Math.random()*2)],kind=a.activity==='wander'?'person':a.activity==='sofa'?(w.home.location==='bedroom'?'bedroom':'sofa'):a.activity==='tv'?'tv':a.activity;speak(kind,a.id)}}
       dirty.current=true;
     }
     if(hadHearts!==(w.time<w.heartsUntil)||hadParty!==(w.time<w.partyUntil)||hadDestination!==(!!w.destination&&w.time<w.destination.until))dirty.current=true;
     if(!reduced.matches||dirty.current){if(t-snapshot>=90||dirty.current){setFrame({actors:w.actors.map(a=>({...a})),cat:{...w.cat},selected:w.selected});snapshot=t}dirty.current=false}
   }
   void import('./game/HomeScene').then(({startHomeGame})=>{
     if(cancelled)return;
     game=startHomeGame(host,{world:()=>worldRef.current,profiles:()=>propsRef.current.profiles,update:loop,reduced:()=>reduced.matches,ready:()=>setEngineError(''),tap:(x,y)=>{
       const w=worldRef.current;if(!canEnter(w.home,w.home.location)||(!propsRef.current.demo&&revision.current<0))return;
       const p={x,y},hit=roomHit(w,p);
       if(hit==='floor'){command(w,w.selected,'wander',p);setBubble(null);dirty.current=true;}
       else if(hit)activateRef.current(hit);
     }});
   }).catch(()=>{if(!cancelled)setEngineError('Не удалось загрузить игру. Проверьте соединение и обновите страницу.');});
   return()=>{cancelled=true;game?.destroy(true);setHomeLocation(null);reduced.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',visibility);clearTimeout(bubbleTimer.current);clearTimeout(partyTimer.current)};
 },[]);
 const home=worldRef.current.home,count=homeUnits(home),location=locations.find(l=>l.id===home.location)!,reward=nextReward(count),locked=!canEnter(home,home.location),ready=demo||revision.current>=0;
 const speaker=bubble?.actor!==undefined?frame.actors[bubble.actor]:null,anchor=speaker?{x:speaker.x,y:speaker.y-(!speaker.path.length&&speaker.activity==='sofa'?12:0)-50}:bubble?.pet?{x:frame.cat.x,y:frame.cat.y-22}:bubble?.point;
 const visibleFurniture=furnishings(home).filter(f=>f.id!=='table');
 const names=propsRef.current.profiles.map(p=>p.name),selectedActor=frame.actors[frame.selected];
 async function chooseProject(project:HomeProject){
   if(working.current)return false;
   goTo(project.location);
   if(project.kind==='kitchen'){if(kitchenOf(worldRef.current.home).stage===0){setPlacement('preview');requestAnimationFrame(()=>{if(sceneRef.current){sceneRef.current.scrollLeft=0;sceneRef.current.scrollIntoView({block:'center'})}})}return true}
   if(project.kind==='garden'){setNursery(true);setGardenSpecies(project.species);return true}
   for(const target of project.items){if(worldRef.current.home.items[project.location].includes(target))continue;if(!await mutate({kind:'place',location:project.location,target,placed:true}))return false}
   say(`«${project.name}» готов. Можно устраиваться поудобнее.`,worldRef.current.selected);return true;
 }
 async function build(stage:number,style:KitchenStyle,all=false){goTo('living');for(let next=stage;next<=3;next++){if(homeUnits(worldRef.current.home)<[0,0,1,2][next])break;if(!await mutate({kind:'build',stage:next,style}))break;say(next===3?'Наша кухня готова. Пора заварить первый чай!':'Ещё один шаг к нашему дому.',worldRef.current.selected);if(!all)break}}
 return <div ref={gameRoot} role={fullscreen.expanded?'dialog':undefined} aria-modal={fullscreen.expanded||undefined} aria-label={fullscreen.expanded?'Наш дом — игровой режим':undefined} className={(fullscreen.expanded?'game-expanded ':'')+'apartment interactive-room '+(night?'night-room ':'')+(demo?'demo-room':'main-game')}>
   <div className="room-top"><div><span className="eyebrow"><i className="live-dot"/> НАШ ЖИВОЙ ДОМ</span><h2>Дом, который мы строим</h2></div><span className="room-weather" aria-label="Реальное время суток"><PixelIcon name={night?'moon':'autumn'}/>{night?'Осенняя ночь':'Осенний день'}<small>{localClock} · как за окном</small></span></div>
   <div className="game-display-controls"><button className="secondary game-expand" onClick={()=>fullscreen.expanded?fullscreen.exit():void fullscreen.enter()}>{fullscreen.expanded?'Выйти из полного экрана':'Играть на весь экран'}</button>{fullscreen.hint&&<small role="status">{fullscreen.hint}</small>}</div><div className="rotate-hint">Поверните телефон горизонтально — так весь дом будет перед вами.</div>
   <div className="home-progression"><div className="home-level"><PixelIcon name="heart" size={30}/><div><b>Уровень {1+Math.floor(count/3)}</b><small>{Math.floor((home.progressValue??count)*100)} искр близости · {home.completedMeetings.length} встреч</small></div></div><div className="next-reward"><div><b>{reward?<><PixelIcon name={reward.icon}/>Следом: {reward.name}</>:'Все открытия ваши. Продолжайте расти вместе.'}</b><small>{reward?`${Math.floor((home.progressValue??count)*100)}/${reward.unlock*100} искр`:'✧ Дом полон историй'}</small></div><progress aria-label="Прогресс следующей награды" value={reward?(home.progressValue??count):1} max={reward?reward.unlock:1}/></div></div>
   <ProjectMenu home={home} busy={busy||!ready} demo={demo} onChoose={chooseProject}/>
   {home.location==='living'?<KitchenProject home={home} busy={busy||!ready} demo={demo} placement={placement} style={kitchenStyle} onStyle={setKitchenStyle} onPlacement={value=>{setPlacement(value);if(value==='preview'){goTo('living');requestAnimationFrame(()=>{if(sceneRef.current){sceneRef.current.scrollLeft=0;sceneRef.current.scrollIntoView({block:'center',behavior:'instant'})}})}}} onBuild={(stage,style,all)=>void build(stage,style,all)} onTea={()=>{goTo('living');play('tea')}} onGarden={garden} onDecor={()=>{setPanel('decor');requestAnimationFrame(()=>gameRoot.current?.querySelector('.home-workshop')?.scrollIntoView({block:'center'}))}}/>:<section className="location-guide"><PixelIcon name={home.location==='greenhouse'?'fern':'bedroom'} size={40}/><div><h3>{home.location==='greenhouse'?'Сад под стеклом, во дворе':'Спальня для тихих вечеров'}</h3><p>{home.location==='greenhouse'?'Выберите растение, дайте ему имя и посадите в теплице. Оно растёт со временем, а совместные минуты ускоряют рост.':'Обустраивайте комнату украшениями и отдыхайте вместе. Нажмите на кровать, чтобы устроиться поудобнее.'}</p><button className="secondary" disabled={locked||busy} onClick={()=>home.location==='greenhouse'?setNursery(true):setPanel('decor')}>{home.location==='greenhouse'?'Выбрать растение':'Выбрать украшения'}</button></div></section>}
   <div className="location-tabs" role="group" aria-label="Комнаты">{locations.map(l=>{const locked=!canEnter(home,l.id);return <button key={l.id} aria-pressed={home.location===l.id} onClick={()=>goTo(l.id)}><span className="location-tab-content"><span className="location-tab-icon" aria-hidden="true"><PixelIcon name={locked?'lock':l.id}/></span><span className="location-tab-label">{l.name}{locked&&<small>{l.unlock*100} искр</small>}</span></span></button>})}</div>
   <div className="location-caption"><span>{location.note}</span><span>♡ Время и забота превращаются в уют</span></div>
   <div className="room-scene"><div className="scene-scroll canvas-wrap" ref={sceneRef} tabIndex={0} role="region" aria-label="Комната, можно прокручивать по горизонтали"><div className="game-stage">
     <div ref={phaserHost} className="phaser-host" />
     {placement==='preview'&&kitchenOf(home).stage===0&&home.location==='living'&&<button className="construction-ghost" aria-label="Подтвердить место кухни у левой стены" onClick={()=>{setPlacement('confirmed');gameRoot.current?.querySelector('.kitchen-project')?.scrollIntoView({block:'center',behavior:'instant'})}}><KitchenPreview style={kitchenStyle}/><span>Кухня здесь</span><small>Нажмите, чтобы выбрать место</small></button>}
     {placement==='confirmed'&&kitchenOf(home).stage===0&&home.location==='living'&&<div className="placement-confirmed" role="status">Место кухни выбрано · выберите способ стройки выше</div>}
     {engineError&&<p className="engine-error" role="alert">{engineError}</p>}
     <div className="room-hotspots">{!locked&&ready&&visibleFurniture.map(f=><button type="button" key={f.id} className="furniture-hit" aria-label={f.label} style={{left:`${f.x/480*100}%`,top:`${f.y/300*100}%`,width:`${f.w/480*100}%`,height:`${f.h/300*100}%`}} onClick={()=>activate(f.id.startsWith('plant')?'plant':f.id)}><span>{f.label} ↗</span></button>)}{!locked&&ready&&frame.actors.map(a=><button type="button" key={a.id} data-testid={`room-actor-${a.id}`} data-x={Math.round(a.x)} data-y={Math.round(a.y)} data-moving={a.path.length>0} className={'actor-hit '+(a.id===frame.selected?'actor-selected':'')} aria-label={`Персонаж ${names[a.id]||(a.id?'Она':'Я')}: ${a.path.length?'идёт':activities[a.activity]}`} style={{left:`${a.x/480*100}%`,top:`${(a.y-(!a.path.length&&a.activity==='sofa'?12:0))/300*100}%`}} onClick={()=>choose(a.id)}><span>{names[a.id]||(a.id?'Она':'Я')}</span></button>)}{!locked&&ready&&<button type="button" className="cat-hit" aria-label="Погладить недовольную кошку" data-testid="room-cat" style={{left:`${frame.cat.x/480*100}%`,top:`${frame.cat.y/300*100}%`}} onClick={()=>activate('cat')}/>}</div>
     {bubble&&anchor&&<div key={bubble.text} className="actor-speech" role="status" style={{left:`${Math.max(24,Math.min(76,anchor.x/480*100))}%`,top:`${Math.max(19,anchor.y/300*100)}%`}}>{bubble.text}</div>}
   </div></div>
   {(locked||!ready)&&<div className="room-lock" data-testid="room-lock"><div><PixelIcon name="lock" size={40}/><h3>{ready?`${location.name} пока закрыта`:'Открываем общий дом…'}</h3>{ready&&<><p>Соберите {location.unlock*100} искр, чтобы открыть эту комнату.</p><b>Осталось искр: {Math.max(0,Math.ceil((location.unlock-(home.progressValue??count))*100))}</b><small>Время вместе, встречи и дни вашей истории</small></>}</div></div>}
   </div>
   <div className="scene-pan"><button aria-label="Посмотреть левую часть комнаты" onClick={()=>sceneRef.current?.scrollBy({left:-220})}>←</button><span>Проведи по комнате, чтобы осмотреться</span><button aria-label="Посмотреть правую часть комнаты" onClick={()=>sceneRef.current?.scrollBy({left:220})}>→</button></div>
   <div className="room-status"><div className="room-roster">{frame.actors.map(a=><button key={a.id} aria-pressed={a.id===frame.selected} onClick={()=>choose(a.id)}><span className="player-dot" style={{background:propsRef.current.profiles[a.id]?.outfit||(a.id?'#bf7e6f':'#81906b')}}/>{names[a.id]||(a.id?'Она':'Я')}</button>)}</div><span className="current-activity">{selectedActor.path.length?'Топ-топ-топ…':activities[selectedActor.activity]}</span><span className="cat-score">{pets?`Кошку потревожили: ${pets}`:'Кошка недовольна. Как обычно.'}</span></div>
   <div className="room-actions"><button disabled={locked||!ready} onClick={()=>play('hug')}><PixelIcon name="heart"/> Обнять</button><button disabled={locked||!ready} onClick={()=>play('tea')}><PixelIcon name="tea"/> Чаю?</button><button disabled={locked||!ready} className={party?'party-active':''} onClick={()=>play('dance')}><PixelIcon name="dance"/> Дискотека</button><button disabled={locked||!ready} onClick={()=>play('poke')}><PixelIcon name="spark"/> Тык!</button></div>
   <HomeWorkshop home={home} panel={panel} onPanel={setPanel} onItem={addItem} onCreate={()=>setNursery(true)} onGarden={garden} onRepair={repair} busy={busy}/>
   <div className={'home-sync'+(syncError?' home-sync-error':'')} role="status">{demo?'Демо дома. Изменения доступны после входа.':busy?'Сохраняем в общий дом…':syncError||(connectionError?'Нет связи · показываем последнее сохранение':'Общий дом · обновляется автоматически')}{syncError&&pending.current&&<button disabled={busy} onClick={()=>void mutate(pending.current!.payload)}>Повторить действие</button>}</div>
   {legacy&&!home.resetAt&&((legacy.plants.some(p=>!home.plants.some(s=>s.id===p.id)))||(!imported&&Object.values(legacy.items).some(i=>i.length)))&&<button className="legacy-open" onClick={()=>setImportOpen(true)}>Перенести сохранение с этого устройства</button>}
   <p className="room-hint">Дом растёт от встреч, времени рядом и дней вашей истории. Растения подрастают и пока вы заняты своими делами.</p>
   {nursery&&!locked&&home.location==='greenhouse'&&<PlantNursery initialSpecies={gardenSpecies} home={home} onCreate={plant} onClose={()=>setNursery(false)}/>}
   {importOpen&&legacy&&<LegacyHomeImport legacy={legacy} home={home} onClose={()=>setImportOpen(false)} onImport={(plants,items)=>mutate({kind:'import',plants,items})}/>}
 </div>;
}
