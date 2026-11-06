import {kitchenOf} from './game/construction';
import {furnishings} from './game/layout';
import {newHome,isNight,canEnter,type HomeLife,type Location} from './roomLife';
export type Point = { x: number; y: number };
export type Activity = 'wander' | 'tea' | 'sofa' | 'study' | 'dance' | 'tv' | 'plant';
export type Actor = Point & { id: number; path: Point[]; activity: Activity; until: number; facing: number; walkPhase: number };
export type RoomWorld = { home: HomeLife; actors: Actor[]; selected: number; time: number; snack: {actor:number;until:number}|null; tv: boolean; gaming: boolean; lamp: boolean; night: boolean; partyUntil: number; heartsUntil: number; destination: (Point & { until: number }) | null; cat: Point & { path: Point[]; pets: number; until: number; facing: number }; together: boolean };
export const WIDTH = 480, HEIGHT = 300, GRID = 6;
// Feet navigate these footprints. The sprite can visually overlap a chair back.
const obstacles = [
 {x:20,y:90,w:117,h:42}, {x:149,y:105,w:165,h:65},
 {x:20,y:146,w:94,h:92}, {x:372,y:131,w:70,h:96},
 {x:182,y:190,w:102,h:35}, {x:313,y:187,w:89,h:80},
 {x:125,y:119,w:25,h:40}, {x:425,y:216,w:26,h:43}, {x:318,y:100,w:30,h:64},
];
const extraObstacles = {bedroom:[{x:149,y:105,w:165,h:65},{x:20,y:146,w:94,h:65},{x:372,y:131,w:70,h:65},{x:318,y:100,w:30,h:64}],greenhouse:[{x:20,y:110,w:117,h:65},{x:149,y:105,w:165,h:65},{x:372,y:110,w:70,h:85}]};
export function walkable(p:Point,location:Location='living',home?:HomeLife){return p.x>=24&&p.x<=450&&p.y>=138&&p.y<=264&&!(home?furnishings(home).filter(f=>!['window'].includes(f.id)):location==='living'?obstacles:extraObstacles[location]).some(o=>p.x>=o.x-4&&p.x<=o.x+o.w+4&&p.y>=o.y-4&&p.y<=o.y+o.h+4)}
export function nearestFloor(p:Point,location:Location='living',home?:HomeLife):Point{let best={x:126,y:222},distance=Infinity;for(let y=138;y<=264;y+=GRID)for(let x=24;x<=450;x+=GRID){if(!walkable({x,y},location,home))continue;const d=(x-p.x)**2+(y-p.y)**2;if(d<distance){distance=d;best={x,y}}}return best}
const key=(p:Point)=>`${p.x},${p.y}`;
export function findPath(from:Point,to:Point,location:Location='living',home?:HomeLife):Point[]{
 const start=nearestFloor(from,location,home),end=nearestFloor(to,location,home),queue=[start],parents=new Map<string,Point|null>([[key(start),null]]);let head=0;
 while(head<queue.length){const p=queue[head++];if(key(p)===key(end)){const path:Point[]=[];let current:Point|null=p;while(current){path.unshift(current);current=parents.get(key(current))||null}return path.slice(1)}
 for(const [dx,dy]of [[GRID,0],[-GRID,0],[0,GRID],[0,-GRID]]){const n={x:p.x+dx,y:p.y+dy};if(walkable(n,location,home)&&!parents.has(key(n))){parents.set(key(n),p);queue.push(n)}}}
 return [];
}
export const stations:Record<Exclude<Activity,'wander'>,[Point,Point]>={
 tea:[{x:150,y:180},{x:138,y:186}], sofa:[{x:210,y:180},{x:264,y:180}],
 study:[{x:126,y:222},{x:354,y:174}],dance:[{x:210,y:246},{x:270,y:246}],
 tv:[{x:294,y:240},{x:300,y:252}],plant:[{x:144,y:180},{x:156,y:180}],
};
export function createWorld(home=newHome()):RoomWorld{return{home,actors:[{id:0,x:126,y:222,path:[],activity:'study',until:2200,facing:1,walkPhase:0},{id:1,x:354,y:174,path:[],activity:'study',until:3800,facing:-1,walkPhase:0}],selected:0,time:0,snack:null,tv:false,gaming:false,lamp:true,night:isNight(),partyUntil:0,heartsUntil:0,destination:null,cat:{x:162,y:252,path:[],pets:0,until:3500,facing:1},together:false}}
export function command(world:RoomWorld,id:number,activity:Activity,target?:Point){const a=world.actors[id];const goal=nearestFloor(target||stations[activity as Exclude<Activity,'wander'>]?.[id]||{x:162,y:246},world.home.location,world.home);a.path=findPath(a,goal,world.home.location,world.home);a.activity=activity;a.until=world.time+9000;if(target)world.destination={...goal,until:world.time+1800};}
function advance(a:Point&{path:Point[]},distance:number){let moved=0;while(distance>0&&a.path.length){const p=a.path[0],dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy);if(d<=distance){a.x=p.x;a.y=p.y;a.path.shift();distance-=d;moved+=d}else{a.x+=dx/d*distance;a.y+=dy/d*distance;moved+=distance;distance=0}}return moved}
export function tick(world:RoomWorld,dt:number,reduced=false,random=Math.random){world.time+=dt;
 for(const a of world.actors){if(a.path.length){a.facing=a.path[0].x<a.x?-1:1;if(reduced){const end=a.path[a.path.length-1];a.x=end.x;a.y=end.y;a.path=[]}else {a.walkPhase+=advance(a,dt*.042);if(!a.path.length)a.until=Math.max(a.until,world.time+4500)}}
 else if(!reduced&&world.time>=a.until){const options:Activity[]=world.home.location==='living'&&kitchenOf(world.home).stage<3?['wander','sofa']:world.home.location==='greenhouse'?['plant','tea','sofa']:world.home.location==='bedroom'?['study','sofa','tea']:['tea','study','sofa','plant','tv'];let activity=options[Math.floor(random()*options.length)];if(activity==='sofa'&&!world.together&&world.actors.some(b=>b.id!==a.id&&b.activity==='sofa'))activity='tea';command(world,a.id,activity);a.until=world.time+10000+random()*6000}
 }
 if(!reduced){if(world.cat.path.length)world.cat.facing=world.cat.path[0].x<world.cat.x?-1:1;advance(world.cat,dt*.024);if(!world.cat.path.length&&world.time>world.cat.until){world.cat.path=findPath(world.cat,{x:150+random()*145,y:246+random()*12},world.home.location,world.home);world.cat.until=world.time+5000+random()*3000}}
}
export function roomHit(world:RoomWorld,p:Point):'actor0'|'actor1'|'cat'|'sofa'|'tea'|'tv'|'lamp'|'plant'|'window'|'study0'|'study1'|'playstation'|'burger-machine'|'floor'|null{
 for(const a of [...world.actors].reverse()){const seated=!a.path.length&&a.activity==='sofa';const feet=a.y-(seated?12:0);if(Math.abs(p.x-a.x)<15&&p.y>feet-43&&p.y<feet+5)return a.id===0?'actor0':'actor1'}
 if(Math.abs(p.x-world.cat.x)<13&&p.y>world.cat.y-18&&p.y<world.cat.y+5)return'cat';
 const object=furnishings(world.home).find(f=>p.x>=f.x&&p.x<=f.x+f.w&&p.y>=f.y&&p.y<=f.y+f.h);
 if(object){if(object.id==='table')return null;return (object.id.startsWith('plant')?'plant':object.id) as 'sofa'|'tea'|'tv'|'lamp'|'plant'|'window'|'study0'|'study1'|'playstation'|'burger-machine'}
 return walkable(p,world.home.location,world.home)?'floor':null;
}

export function changeLocation(world:RoomWorld,location:Location){world.home.location=location;world.destination=null;world.actors.forEach((a,i)=>{Object.assign(a,nearestFloor({x:i?354:126,y:222},location,world.home));a.path=[];a.activity='wander';a.until=world.time+5000});Object.assign(world.cat,nearestFloor({x:240,y:252},location,world.home));world.cat.path=[];}
