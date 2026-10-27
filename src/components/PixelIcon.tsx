const colors={leaf:'#6f865a',light:'#a8b783',earth:'#bd825d',gold:'#d8ad62',ink:'#625b46',cream:'#f7edcf',pink:'#c58f8a'};
export default function PixelIcon({name,size=24}:{name:string;size?:number}){
 const r=(x:number,y:number,w:number,h:number,c:keyof typeof colors,key?:number)=><rect key={key} x={x} y={y} width={w} height={h} fill={colors[c]}/>;
 const plant=['marigold','cactus','mint','fern','lavender','monstera'].includes(name);
 let art;
 if(plant)art=<>
  {r(4,12,8,3,'earth')}{r(3,11,10,2,'gold')}{r(7,4,2,7,'leaf')}
  {name==='cactus'?<>{r(5,3,6,8,'leaf')}{r(2,5,3,4,'leaf')}{r(2,3,2,5,'leaf')}{r(11,7,3,3,'leaf')}{r(12,5,2,5,'leaf')}{r(7,4,1,6,'light')}</>:<>
   {r(2,6,5,3,'leaf')}{r(9,4,5,3,'light')}{r(3,4,3,2,'light')}
   {['marigold','lavender'].includes(name)&&<>{r(5,1,6,4,name==='lavender'?'pink':'gold')}{r(7,2,2,2,'cream')}</>}
  </>}
 </>;
 else if(name==='pumpkin')art=<>{r(2,5,12,8,'earth')}{r(4,3,8,12,'gold')}{r(7,1,2,3,'leaf')}{r(4,7,2,2,'ink')}{r(10,7,2,2,'ink')}{r(6,11,4,1,'cream')}</>;
 else if(name==='candles')art=<>{[3,8,12].map((x,i)=><g key={x}>{r(x,7-i%2*3,2,8+i%2*3,'cream')}{r(x,3-i%2*3,2,3,'gold')}</g>)}{r(1,15,14,1,'earth')}</>;
 else if(name==='books')art=<>{r(2,3,11,3,'leaf')}{r(4,4,9,1,'cream')}{r(3,7,12,3,'earth')}{r(5,8,10,1,'cream')}{r(1,11,12,3,'gold')}{r(3,12,10,1,'cream')}</>;
 else if(name==='ghost')art=<>{r(5,1,6,2,'cream')}{r(3,3,10,10,'cream')}{r(3,13,3,2,'cream')}{r(10,13,3,2,'cream')}{r(5,6,2,2,'ink')}{r(10,6,2,2,'ink')}</>;
 else if(name==='cushion')art=<>{r(2,3,12,10,'earth')}{r(3,4,10,8,'gold')}{r(7,7,2,2,'earth')}</>;
 else if(name==='garland')art=<>{r(1,2,14,1,'earth')}{[3,8,13].map(x=><g key={x}>{r(x-2,6,5,2,'ink')}{r(x,5,1,6,'ink')}{r(x-3,5,1,2,'ink')}{r(x+3,5,1,2,'ink')}</g>)}</>;
 else if(name==='lock')art=<>{r(5,2,6,2,'gold')}{r(4,4,2,4,'gold')}{r(10,4,2,4,'gold')}{r(3,7,10,8,'earth')}{r(7,10,2,3,'cream')}</>;
 else if(name==='living'||name==='home')art=<>{r(3,7,10,8,'leaf')}{r(5,5,6,2,'leaf')}{r(7,3,2,2,'leaf')}{r(6,10,4,5,'cream')}</>;
 else if(name==='bedroom')art=<>{r(1,7,14,5,'earth')}{r(1,5,2,9,'ink')}{r(13,10,2,4,'ink')}{r(4,5,4,3,'cream')}{r(8,8,5,3,'light')}</>;
 else if(name==='greenhouse')art=<>{r(2,5,12,10,'leaf')}{r(4,3,8,2,'leaf')}{r(6,1,4,2,'leaf')}{r(4,6,8,7,'cream')}{r(7,5,2,10,'leaf')}{r(3,9,10,1,'leaf')}</>;
 else if(name==='moon')art=<>{r(4,2,7,12,'gold')}{r(2,4,11,8,'gold')}{r(8,2,5,9,'cream')}</>;
 else if(name==='sun'||name==='autumn')art=<>{r(5,5,6,6,'gold')}{r(7,1,2,2,'gold')}{r(7,13,2,2,'gold')}{r(1,7,2,2,'gold')}{r(13,7,2,2,'gold')}</>;
 else if(name==='heart')art=<>{r(2,3,4,3,'pink')}{r(10,3,4,3,'pink')}{r(1,6,14,4,'pink')}{r(3,10,10,2,'pink')}{r(5,12,6,2,'pink')}{r(7,14,2,1,'pink')}</>;
 else if(name==='tea')art=<>{r(2,6,9,7,'earth')}{r(11,7,3,4,'gold')}{r(1,14,13,1,'ink')}{r(4,1,1,3,'gold')}{r(8,2,1,2,'gold')}</>;
 else if(name==='repair')art=<>{r(3,2,3,11,'ink')}{r(1,3,7,3,'gold')}{r(8,8,6,3,'earth')}{r(10,5,2,10,'earth')}</>;
 else if(name==='dance')art=<>{r(5,3,2,9,'ink')}{r(7,2,6,2,'ink')}{r(11,4,2,6,'ink')}{r(2,11,5,3,'earth')}{r(8,9,5,3,'earth')}</>;
 else if(name==='cat')art=<>{r(3,6,10,7,'ink')}{r(3,3,3,4,'ink')}{r(10,3,3,4,'ink')}{r(5,8,2,1,'gold')}{r(10,8,2,1,'gold')}</>;
 else art=<>{r(7,2,2,12,'gold')}{r(2,7,12,2,'gold')}{r(5,5,6,6,'gold')}</>;
 return <svg className="pixel-icon" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">{art}</svg>;
}
