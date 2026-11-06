import {useState} from 'react';
import Apartment from '../Apartment';
import PixelIcon from '../PixelIcon';
import {catalog,locations,newHome,seeds,type Location} from '../../lib/roomLife';
import type {Profile} from '../../types';
import type {HomeSnapshot} from '../../lib/home';

const profiles:Profile[]=[
 {id:'dev-one',slot:1,name:'Саша',hair:'#35302b',outfit:'#76896a',hairstyle:'short',travel:0,prep:0,return_buffer:0,together_until:null},
 {id:'dev-two',slot:2,name:'Маша',hair:'#e6c87f',outfit:'#bd8271',hairstyle:'bob',travel:0,prep:0,return_buffer:0,together_until:null},
];
function finishedHome():HomeSnapshot{
 const home=newHome();
 home.progressUnits=20;home.progressValue=20;home.completedMeetings=Array.from({length:20},(_,i)=>`dev-meeting-${i}`);
 home.kitchen={stage:3,style:'sage'};
 for(const location of locations)home.items[location.id]=catalog.filter(item=>!('location' in item)||item.location===location.id).map(item=>item.id);
 home.plants=seeds.map(seed=>({id:`dev-${seed.id}`,species:seed.id,name:seed.name,plantedAt:Date.now()-180*86400000,baseline:[],growth:1}));
 home.lastEvent='Кошка уже выбрала своё место. На самой большой кровати.';
 return {revision:1,state:home};
}
export default function DevHome(){
 const [home]=useState(finishedHome),[version,setVersion]=useState(0);
 return <main className="dev-home">
  <header className="dev-header"><a className="brand" href={import.meta.env.BASE_URL}>UsTime</a><span>Dev · готовый дом</span><a href={import.meta.env.BASE_URL}>Вернуться в приложение →</a></header>
  <section className="dev-intro"><div><p className="eyebrow">Посмотреть итог</p><h1>Всё, что мы можем построить</h1><p>Готовая кухня, вся техника, огромная кровать и цветущая теплица. Переключайте комнаты и нажимайте на предметы — здесь можно всё осмотреть без входа.</p><small>Тестовый дом · изменения не затрагивают ваш общий дом</small></div><button className="secondary" onClick={()=>setVersion(v=>v+1)}>Начать осмотр заново</button></section>
  <div className="dev-overview">{([{id:'living',icon:'playstation',title:'Гостиная',note:'Телевизор, PlayStation и чизбургерный автомат'},{id:'bedroom',icon:'king-bed',title:'Спальня',note:'Огромная кровать и все украшения'},{id:'greenhouse',icon:'sakura',title:'Теплица',note:'Сакура, лимон, клён и ещё 10 растений'}] as {id:Location;icon:string;title:string;note:string}[]).map(room=><div key={room.id}><PixelIcon name={room.icon} size={36}/><div><b>{room.title}</b><span>{room.note}</span></div></div>)}</div>
  <section className="dev-game" aria-label="Готовый дом для осмотра"><Apartment key={version} profiles={profiles} sharedHome={home} demo together onInteract={()=>{}}/></section>
  <section className="dev-collection"><h2>Вся коллекция уже в доме</h2><p>Все растения взрослые. На этой странице показаны все 13 видов одновременно; в обычной игре действует ограничение мест в теплице.</p><div>{seeds.map(seed=><article key={seed.id}><PixelIcon name={seed.id} size={36}/><b>{seed.name}</b><span>{['sakura','lemon-tree','japanese-maple'].includes(seed.id)?'Взрослое дерево':'Взрослое растение'}</span></article>)}</div></section>
 </main>
}
