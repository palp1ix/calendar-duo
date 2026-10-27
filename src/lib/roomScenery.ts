import type {RoomWorld} from './room';
import {seeds, type ItemId} from './roomLife';

export function drawScenery(ctx: CanvasRenderingContext2D, w: RoomWorld, reduced: boolean) {
  const room = w.home.location;
  const rect = (x: number, y: number, width: number, height: number, color: string) => {ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), width, height)};
  const box = (x: number, y: number, width: number, height: number, color: string) => {rect(x,y,width,height,'#806953');rect(x+2,y+2,width-4,height-4,color)};
  if (room !== 'living') {
    rect(0,0,480,300,'#e7d9bf');rect(15,22,450,263,'#c8b89c');box(8,15,456,260,room==='bedroom'?'#e3d3c4':'#cbd2b7');
    rect(13,100,446,169,room==='bedroom'?'#c7a885':'#b6ad88');
    for(let y=102;y<268;y+=18){rect(13,y,446,1,'#aa9374');for(let x=(y%36?22:52);x<458;x+=63)rect(x,y,1,18,'#aa9374')}
    if(room==='bedroom') {
      // The bed shares the living room sofa footprint; the aisle stays clear.
      rect(144,173,178,76,'#c2b2a4');rect(150,178,166,65,'#d9c4ad');
      box(154,105,160,64,'#957c70');box(159,111,150,50,'#b27e70');
      box(166,114,60,18,'#f1ddc0');box(238,114,60,18,'#f1ddc0');
      rect(159,137,150,25,'#a9ad89');for(let x=164;x<307;x+=12)rect(x,138,2,24,'#c3c19e');rect(158,166,6,5,'#745c49');rect(302,166,6,5,'#745c49');
      box(26,145,84,61,'#aa8a68');rect(29,148,78,21,'#b99b78');rect(29,173,78,28,'#b99b78');rect(62,158,12,2,'#765e47');rect(62,185,12,2,'#765e47');
      box(43,40,51,65,'#b79b7e');rect(48,45,41,55,'#bec8bc');rect(52,50,4,42,'#dce1cd');
      box(376,141,64,49,'#a98b67');rect(379,144,58,19,'#c2a17a');rect(400,152,13,2,'#82694f');box(389,121,31,19,'#dfc59c');rect(395,125,19,10,'#a8ad85');
      rect(331,116,3,46,'#897554');box(319,101,27,19,'#efd9a7');rect(321,159,22,4,'#897554');
      box(300,32,35,40,'#f0dec5');rect(305,37,25,30,'#b18269');rect(313,44,9,15,'#dbb47b');
    } else {
      // Glass roof, potting benches and a central raised bed.
      for(let x=25;x<455;x+=50){box(x,24,Math.min(43,454-x),65,'#c6d0b6');rect(x+4,28,Math.min(35,446-x),57,'#dce0c3')}
      rect(14,91,444,6,'#8e9b7d');
      box(24,120,111,51,'#ac9972');rect(21,116,117,7,'#cfb88e');rect(28,144,103,3,'#827c59');
      box(151,118,162,48,'#a78b66');rect(156,123,152,37,'#695c46');
      box(375,115,65,76,'#a98f67');rect(379,121,57,3,'#d5c599');rect(379,159,57,3,'#d5c599');
      for(let i=0;i<5;i++){const x=35+i*19;box(x,100,13,16,'#b97f5d');rect(x+5,86,3,16,'#69845a');rect(x-1,90,8,4,'#90a06c')}
      for(let i=0;i<3;i++){rect(382+i*18,140,13,17,'#bc8660');rect(386+i*18,127,3,14,'#6e8758');rect(381+i*18,130,12,4,'#8b9a62')}
      rect(170,207,136,30,'#a8b18d');rect(175,211,126,22,'#c8c6a3');
      box(325,70,20,23,'#97aa9a');rect(344,75,10,4,'#97aa9a');rect(331,64,8,5,'#7a8d79');
    }
    box(179,25,88,61,'#d4bda0');
  }
  // The same autumn view follows the player through every room.
  rect(184,29,78,51,w.night?'#414f65':'#d2d6c5');
  rect(184,63,78,17,w.night?'#59634f':'#c6b287');
  for(const [x,y,c] of [[193,46,'#b67d49'],[238,42,'#c89a50'],[215,57,'#a87047']] as const){rect(x+5,y+8,3,24,'#826a51');rect(x,y,17,16,w.night?'#6e7157':c);rect(x-4,y+7,24,9,w.night?'#727555':c)}
  if(w.night){rect(247,34,8,8,'#f6dda2');rect(244,32,7,7,'#414f65');for(const [x,y] of [[191,35],[213,42],[235,32]])rect(x,y,1,2,'#f6e5ba')}
  else {rect(247,34,7,7,'#f8e2a2');for(let i=0;i<5;i++){const t=reduced?i*7:(w.time/260+i*11)%43;rect(188+(i*17)%67,34+t,3,2,i%2?'#c69456':'#b88153')}}
  rect(223,28,3,54,'#f1e2c9');rect(182,53,82,3,'#f1e2c9');rect(174,83,100,5,'#a78d6c');
  if(room==='greenhouse') {
    w.home.plants.forEach((p,i)=>{
      const x=171+(i%3)*54,y=i<3?145:162,height=4+p.growth*29;
      rect(x-10,y,20,13,'#bd8460');rect(x-12,y,24,3,'#d9a17a');rect(x-6,y-2,12,2,'#66583d');
      if(p.species==='cactus'&&p.growth>0){rect(x-4,y-height,9,height,'#6b9367');rect(x-2,y-height+2,2,height-2,'#92ac79');if(p.growth>=.3){rect(x-11,y-height+8,8,5,'#6b9367');rect(x-12,y-height+3,4,10,'#6b9367');rect(x+5,y-height+13,8,4,'#6b9367');rect(x+10,y-height+7,4,10,'#6b9367')}for(let sy=y-height+5;sy<y-2;sy+=6)rect(x+5,sy,2,1,'#e5d6a7')}
      if(p.species!=='cactus'&&p.growth>0){rect(x-1,y-height,3,height,'#6c8757');rect(x-9,y-height+5,9,4,'#8ca168');rect(x+2,y-height+1,8,4,'#6d915b')}
      if(p.species!=='cactus'&&p.growth>=.3){rect(x-12,y-height+14,11,5,'#829c63');rect(x+2,y-height+11,12,5,'#688a53')}
      if(p.growth>=.65){const c=p.species==='cactus'?'#d49aaf':seeds.find(s=>s.id===p.species)!.color;rect(x-5,y-height-5,12,8,c);rect(x-2,y-height-8,6,14,c);rect(x,y-height-3,3,3,'#e9c27b')}
      if(p.growth>=1){rect(x-13,y-height-7,4,3,'#ead69a');rect(x+10,y-height+2,3,3,'#ead69a')} 
    });
  }
  // Night tints the whole location while practical lights remain warm.
  if(w.night){rect(13,17,446,252,w.lamp?'#28394b40':'#1b2a466b');if(w.lamp){ctx.fillStyle='#f9d59828';ctx.beginPath();ctx.ellipse(332,143,49,55,0,0,Math.PI*2);ctx.fill()}}
}

export function drawDecor(ctx: CanvasRenderingContext2D, w: RoomWorld, reduced: boolean) {
  const r=(x:number,y:number,width:number,height:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),width,height)};
  const damaged=(target:string)=>w.home.damage.some(d=>d.location===w.home.location&&d.target===target);
  const positions: Record<ItemId, [number, number]> = {pumpkin:[348,255],ghost:[290,54],garland:[62,24],candles:[122,216],books:[80,254],cushion:[280,143]};
  for(const id of w.home.items[w.home.location]) {
    const [x,y]=positions[id],broken=damaged(id);
    if(broken){r(x-6,y-2,8,3,'#a77756');r(x+5,y+2,6,3,'#c89e6a');r(x,y-5,4,3,'#6d6353');continue}
    if(id==='pumpkin'){if(w.night){ctx.fillStyle='#f6a44530';ctx.beginPath();ctx.arc(x,y-8,25,0,Math.PI*2);ctx.fill()}r(x-12,y-17,24,15,'#c77c3e');r(x-9,y-20,18,21,'#df9349');r(x-2,y-24,4,5,'#68764d');r(x-7,y-14,4,4,w.night?'#ffe2a1':'#72573c');r(x+3,y-14,4,4,w.night?'#ffe2a1':'#72573c');r(x-5,y-6,10,3,w.night?'#ffe2a1':'#72573c')}
    if(id==='ghost'){const dy=reduced?0:Math.sin(w.time/700)*2;r(x,y-28,1,25,'#9c987e');r(x-7,y-5+dy,14,16,'#f5ebd2');r(x-4,y-8+dy,8,4,'#f5ebd2');r(x-4,y+dy,2,3,'#665f57');r(x+3,y+dy,2,3,'#665f57');r(x-7,y+11+dy,4,3,'#f5ebd2');r(x+3,y+11+dy,4,3,'#f5ebd2')}
    if(id==='garland'){r(x,y,90,1,'#8d775e');for(let i=0;i<5;i++){const bx=x+5+i*18,by=y+5+(i%2)*4;r(bx,by,3,6,'#53504b');r(bx-5,by,13,2,'#53504b');r(bx-7,by-2,3,3,'#53504b');r(bx+6,by-2,3,3,'#53504b')}}
    if(id==='candles'){for(let i=0;i<3;i++){const cy=y-i%2*5;r(x+i*7,cy-14,5,15,'#e8d6b1');r(x+i*7+1,cy-19,3,5,'#f1c56b');r(x+i*7+2,cy-17,1,3,'#fff0bd')}}
    if(id==='books'){['#8b9c77','#b07c66','#d0b480'].forEach((c,i)=>{r(x-12+i%2*3,y-i*5,24,4,c);r(x-10+i%2*3,y-i*5+1,19,2,'#eee0ba')})}
    if(id==='cushion'){r(x-11,y-17,22,15,'#c88c57');r(x-8,y-15,16,11,'#dcab70');r(x-2,y-12,4,4,'#b6794b')}
  }
  if(damaged('sofa'))for(let i=0;i<4;i++)r(260+i*4,141-i*2,2,13,'#665848');
  if(damaged('pot')){r(140,253,18,5,'#746047');r(131,256,6,3,'#8f7452');r(150,249,12,5,'#ba805b');r(157,246,5,5,'#d39b70');r(164,256,5,2,'#6c8454')}
}
