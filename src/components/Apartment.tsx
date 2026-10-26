import{useEffect,useRef,useState}from'react';import type{Profile}from'../types';
const lines=['Я проверил диван. Он готов к нашим планам.','Серьёзное лицо. Несерьёзные намерения.','Учусь. Но мысленно уже на свидании.','Чай — это просто повод посидеть рядом.','У этого кактуса личная жизнь стабильнее расписания.'];
export default function Apartment({profiles,onInteract,together=false,celebrate=0}:{profiles:Profile[];onInteract:(kind:string)=>void;together?:boolean;celebrate?:number}){
 const ref=useRef<HTMLCanvasElement>(null);const [bubble,setBubble]=useState('');const [scene,setScene]=useState('home');const timer=useRef<ReturnType<typeof setTimeout>>();
 function say(text:string){setBubble(text);clearTimeout(timer.current);timer.current=setTimeout(()=>setBubble(''),4200)}
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(celebrate)say('Доставка обнимашек. Распишитесь сердечком. ♡')},[celebrate]);
 useEffect(()=>{
 const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d')!;canvas.width=960;canvas.height=600;ctx.scale(2,2);ctx.imageSmoothingEnabled=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let step=0,last=0,id=0;
 function rect(x:number,y:number,w:number,h:number,c:string){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
 function box(x:number,y:number,w:number,h:number,c:string,edge='#655449'){rect(x,y,w,h,edge);rect(x+2,y+2,w-4,h-4,c)}
 function plant(x:number,y:number,big=false){const s=big?1.6:1;rect(x-5*s,y,10*s,12*s,'#b77655');rect(x-7*s,y,14*s,3*s,'#d9a17b');rect(x-1,y-24*s,3,25*s,'#68805a');rect(x-10*s,y-17*s,10*s,6*s,'#81985f');rect(x+1,y-23*s,10*s,7*s,'#526f4b');rect(x-8*s,y-29*s,8*s,8*s,'#6f8a51')}
 function heart(x:number,y:number,c='#d88b7e'){rect(x+2,y,3,2,c);rect(x+7,y,3,2,c);rect(x,y+2,12,4,c);rect(x+2,y+6,8,2,c);rect(x+4,y+8,4,2,c)}
 function char(x:number,y:number,p:Profile|undefined,idx:number){const hair=p?.hair||(idx?'#a16846':'#443e36'),shirt=p?.outfit||(idx?'#bf7e6f':'#71886a');const bob=reduced.matches?0:Math.floor(step/8)%2;const night=new Date().getHours()<7;
 rect(x-8,y+26,20,3,'#b69a75');rect(x-4,y+17,5,10,'#3f4b50');rect(x+4,y+17,5,10,'#3f4b50');rect(x-5,y+25,6,3,'#554639');rect(x+4,y+25,7,3,'#554639');
 rect(x-8,y+5+bob,20,14,shirt);rect(x-10,y+7+bob,3,11,'#e4b995');rect(x+12,y+7+bob,3,11,'#e4b995');
 rect(x-6,y-9+bob,16,16,hair);if(p?.hairstyle==='long'||idx===1)rect(x-8,y-6+bob,20,19,hair);
 rect(x-4,y-6+bob,12,13,'#edc4a3');rect(x-6,y-11+bob,16,6,hair);rect(x-6,y-6+bob,4,7,hair);
 rect(x-1,y-1+bob,2,2,'#4b3d32');rect(x+6,y-1+bob,2,2,'#4b3d32');rect(x,y+4+bob,5,1,'#b56e60');rect(x-3,y+2+bob,2,2,'#e9a693');
 if(night){rect(x+16,y-18,3,2,'#8b8a6b');rect(x+20,y-23,4,2,'#8b8a6b')}
 }
 function draw(){ctx.clearRect(0,0,480,300);rect(0,0,480,300,'#e7d9bf');
 // dollhouse shadow, warm walls and parquet
 rect(15,22,450,263,'#c8b89c');rect(8,15,456,260,'#f0dfbd');rect(8,15,456,81,'#ecdfc6');rect(8,94,456,6,'#ac9271');rect(12,100,448,171,'#d6b58b');
 for(let y=102;y<270;y+=18){rect(12,y,448,1,'#bf9d74');for(let x=(y%36?22:52);x<460;x+=63){rect(x,y+1,1,17,'#c29e77');rect(x+7,y+8,24,1,'#cfad81')}}
 rect(8,15,5,260,'#a68d6e');rect(459,15,5,260,'#a68d6e');rect(8,270,456,5,'#947c60');
 // wallpaper and subtle stars
 for(let y=27;y<88;y+=18)for(let x=25;x<460;x+=24){rect(x,y,1,2,'#d6c7ab')}
 // window with an evening sky, curtains
 box(179,25,88,61,'#c7d5c3','#a18d71');rect(184,29,78,51,'#c4d4cc');rect(184,54,78,26,'#a6bca8');rect(200,56,16,24,'#8ea894');rect(232,46,19,34,'#9bb39c');rect(224,28,3,54,'#f3e9d4');rect(182,53,82,3,'#f3e9d4');rect(174,21,99,4,'#8f785d');rect(176,25,12,60,'#d4ab8b');rect(258,25,12,60,'#d4ab8b');rect(173,83,101,5,'#ad9270');rect(247,35,7,7,'#f8edc6');plant(239,80);
 // left kitchen, cupboards and hanging copper pan
 box(26,32,63,31,'#a5ae8b');rect(57,34,2,27,'#78836a');rect(52,48,2,6,'#6a735c');rect(63,48,2,6,'#6a735c');rect(112,34,3,14,'#736450');rect(105,46,18,15,'#ab795b');rect(109,49,10,9,'#c5946b');
 box(24,91,111,34,'#9ba780');rect(24,86,112,7,'#eee4cc');rect(60,94,2,29,'#748367');rect(99,94,2,29,'#748367');box(35,87,23,4,'#8f9d91');rect(42,79,3,10,'#7f8a80');box(95,86,32,5,'#4b5246');rect(100,87,8,2,'#929785');rect(114,87,8,2,'#929785');rect(70,78,12,9,'#e4b26c');rect(82,80,4,5,'#e4b26c');rect(28,126,104,5,'#b69a75');
 // tiny framed calendar and bookshelf
 box(305,30,31,35,'#f6eddb','#a48766');rect(309,34,23,5,'#bf8470');for(let y=45;y<60;y+=6)for(let x=310;x<330;x+=6)rect(x,y,3,3,'#b5ad91');heart(318,50,'#c18776');
 box(365,25,68,58,'#b39771');rect(369,29,60,22,'#c8ac84');rect(369,55,60,24,'#c8ac84');['#82946c','#cb9471','#e2c69a','#8d9c98','#af7c69'].forEach((c,i)=>{rect(373+i*8,33+(i%2)*3,6,18-(i%2)*3,c)});plant(414,49);rect(378,63,19,11,'#e9d6b0');rect(382,60,11,3,'#c3a980');box(406,61,16,15,'#d7b36a');
 // rug, fringes and central sofa
 rect(150,171,166,75,'#b6b99a');rect(155,175,156,67,'#c8c9a9');rect(161,181,144,55,'#c1c3a0');for(let x=154;x<316;x+=6){rect(x,168,2,4,'#b2b493');rect(x,246,2,4,'#b2b493')}for(let x=164;x<304;x+=12){rect(x,184,4,3,'#dcdbba');rect(x,230,4,3,'#dcdbba')}
 rect(161,143,143,8,'#9d8969');box(160,114,145,44,'#7f916d','#65775d');rect(165,110,135,30,'#99a680');rect(169,115,60,25,'#a4af89');rect(234,115,61,25,'#a4af89');rect(168,140,62,15,'#a3ae86');rect(234,140,63,15,'#a3ae86');box(154,129,15,31,'#82956f','#6c7e60');box(297,129,15,31,'#82956f','#6c7e60');rect(164,159,7,8,'#705e46');rect(296,159,7,8,'#705e46');box(178,123,23,18,'#e2bc8c','#b99a71');rect(276,123,17,31,'#d7aa8b');for(let y=127;y<151;y+=5)rect(277,y,15,1,'#bf9278');
 // coffee table and tea
 rect(194,215,7,10,'#846b50');rect(266,215,7,10,'#846b50');box(187,194,94,24,'#b59166','#8e7253');rect(191,195,86,4,'#d2b386');rect(204,199,10,9,'#f2e4c9');rect(214,200,4,5,'#f2e4c9');rect(207,199,5,2,'#9b7958');rect(252,202,10,9,'#b9c5a0');rect(262,203,4,5,'#b9c5a0');box(227,202,15,10,'#a16d58');rect(229,204,11,1,'#e7c7a0');
 // lamp
 rect(331,116,3,46,'#897554');rect(321,159,22,4,'#897554');rect(319,105,27,15,'#e7c88f');rect(323,101,19,6,'#efd9a7');if(scene==='lamp'){ctx.fillStyle='#ffdc7a33';ctx.beginPath();ctx.arc(332,128,43,0,Math.PI*2);ctx.fill()}
 // desks on either side
 box(27,177,82,13,'#b38c62');rect(31,190,5,38,'#927450');rect(100,190,5,38,'#927450');box(45,147,37,27,'#98b6a4','#5c6c5b');rect(48,150,31,19,'#c2d0b5');rect(60,173,6,4,'#66745e');rect(52,178,25,4,'#e2d5b8');rect(88,171,10,9,'#d6b575');rect(91,163,2,9,'#657758');rect(47,202,39,22,'#b68b72');rect(50,224,4,15,'#8b6f54');rect(79,224,4,15,'#8b6f54');
 box(373,161,65,13,'#b38c62');rect(377,174,5,37,'#927450');rect(430,174,5,37,'#927450');box(388,136,33,24,'#9ba6a7','#5c6c5b');rect(391,139,27,16,'#bdc5af');rect(401,158,6,4,'#66745e');rect(389,164,28,3,'#e0d2b4');rect(382,190,38,22,'#8f9e7c');rect(386,212,4,15,'#8b6f54');rect(413,212,4,15,'#8b6f54');
 plant(137,149,true);plant(438,245,true);
 // foreground TV, cabinet, books, silly duck
 box(315,238,84,25,'#aa8760');rect(319,243,33,16,'#bc9d72');rect(357,243,37,16,'#bc9d72');rect(331,225,55,4,'#5a6556');rect(352,223,9,15,'#5a6556');box(326,190,66,40,'#74876d','#52604e');rect(331,195,56,28,scene==='tv'?'#d4c99b':'#b6c6ad');rect(340,204,20,13,'#96ac94');rect(361,200,19,17,'#a6b89e');if(scene==='tv')heart(354,204);rect(408,253,16,9,'#d3b572');rect(412,248,9,8,'#e3c47e');rect(421,253,5,3,'#b78452');rect(417,250,2,2,'#5a4e3d');
 // characters occupy separate desks unless both explicitly indicate togetherness
 const drift=reduced.matches?0:Math.sin(step/45)*9;
 char(together?211:119+drift,together?174:197,profiles[0],0);char(together?249:347-drift,together?174:177,profiles[1],1);
 if(together||celebrate&&step<80)heart(227,154-Math.floor(step/12)%4);
 // floating dust in sunlight
 if(!reduced.matches)for(let i=0;i<5;i++)rect(186+i*14,91+(step+i*13)%60,1,1,'#f5e9c9');
 }
 function loop(ts:number){if(ts-last>85&&!document.hidden){step++;draw();last=ts}id=requestAnimationFrame(loop)}draw();id=requestAnimationFrame(loop);return()=>cancelAnimationFrame(id);
 },[profiles,together,scene,celebrate]);
 return <div className="apartment"><div className="room-top"><span><i className="live-dot"/> НАША КВАРТИРА</span><span>{together?'Мы отметили: вместе':'Каждый в своём ритме'}</span></div><div className="canvas-wrap"><canvas ref={ref} aria-label="Пиксельная квартира: диван, кухня, два рабочих стола и наши персонажи" onClick={e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*480,y=(e.clientY-r.top)/r.height*300;if(x>310&&y>185){setScene(scene==='tv'?'home':'tv');say('По телевизору: сериал «Когда у нас обоих выходной»')}else if(x>315&&x<350&&y>90&&y<180){setScene(scene==='lamp'?'home':'lamp');say('Уют добавлен. Электричество воображаемое.')}else say(lines[Math.floor(Math.random()*lines.length)])}}/>{bubble&&<div className="speech" role="status">{bubble}</div>}</div><div className="room-bottom"><span>Маленький мир. Только наш.</span><button className="text-button" onClick={()=>say(lines[Math.floor(Math.random()*lines.length)])}>Поговорить с персонажами ↗</button></div><div className="room-actions"><button onClick={()=>onInteract('hug')}><span>♡</span> Обнять</button><button onClick={()=>onInteract('tea')}><span>♧</span> Позвать на чай</button><button onClick={()=>onInteract('poke')}><span>☞</span> Тыкнуть</button></div></div>
}
