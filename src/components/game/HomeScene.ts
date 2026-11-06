import Phaser from 'phaser';
import type {Profile} from '../../types';
import type {RoomWorld} from '../../lib/room';
import {furnishings,plantSpot} from '../../lib/game/layout';
import {kitchenOf} from '../../lib/game/construction';

export type SceneBridge = {
  world: () => RoomWorld;
  profiles: () => Profile[];
  update: (time: number, delta: number) => void;
  tap: (x: number, y: number) => void;
  ready: () => void;
  reduced: () => boolean;
};

/** Phaser owns rendering, timing and pointer coordinates. Domain state stays outside the engine. */
export class HomeScene extends Phaser.Scene {
  private ink!: Phaser.GameObjects.Graphics;
  private bridge: SceneBridge;
  constructor(bridge: SceneBridge) {super('home'); this.bridge = bridge;}
  create() {
    this.ink = this.add.graphics();
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() < 12) this.bridge.tap(pointer.worldX, pointer.worldY);
    });
    this.game.canvas.setAttribute('aria-label', 'Интерактивный дом. Выберите персонажа и место на полу.');
    this.game.canvas.setAttribute('data-engine', 'phaser');
    this.bridge.ready();
  }
  update(time: number, delta: number) {
    this.bridge.update(time, Math.min(delta, 100));
    this.paint();
  }
  private paint() {
    const w = this.bridge.world(), home = w.home, g = this.ink, kitchen = kitchenOf(home);
    const rect = (x:number,y:number,width:number,height:number,color:number,alpha=1) => {
      g.fillStyle(color,alpha); g.fillRect(Math.round(x),Math.round(y),width,height);
    };
    const box = (x:number,y:number,width:number,height:number,color:number) => {
      rect(x,y,width,height,0x806b54);rect(x+2,y+2,width-4,height-4,color);
    };
    g.clear();
    rect(0,0,480,300,0xe9dfc8);
    rect(12,22,456,260,0xc7b698);rect(8,15,456,260,home.location==='greenhouse'?0xd3ddc3:0xf0dfbd);
    rect(13,100,446,169,0xd6b58b);
    for(let y=102;y<270;y+=18){rect(13,y,446,1,0xbf9d74);for(let x=y%36?25:55;x<459;x+=60)rect(x,y,1,18,0xbf9d74)}
    rect(8,94,456,6,0xac9271);rect(8,15,5,260,0xa68d6e);rect(459,15,5,260,0xa68d6e);rect(8,270,456,5,0x947c60);
    if(home.location==='greenhouse'){
      // A freestanding glasshouse: outdoor sky, garden beyond the glass, soil beds.
      rect(0,0,480,300,w.night?0x465b60:0xd5e7dc);
      rect(0,77,480,223,0x9caf83);
      for(let x=0;x<480;x+=35){rect(x,66+(x%3)*5,26,30,0x81986d)}
      rect(16,94,448,180,0xc5c5a2);rect(180,100,116,174,0xd2c6a4);
      rect(20,22,440,73,0xc3ded6,.7);
      for(let x=20;x<=460;x+=55){rect(x,22,4,75,0x7d9c8a);rect(x,96,3,177,0x9aaf98)}
      rect(18,20,445,5,0x7d9c8a);rect(18,92,445,5,0x7d9c8a);
      rect(18,22,4,250,0x7d9c8a);rect(459,22,4,250,0x7d9c8a);rect(18,270,445,5,0x7d9c8a);
      rect(32,174,125,60,0x927657);rect(36,178,117,52,0x695b44);
      rect(319,174,125,60,0x927657);rect(323,178,117,52,0x695b44);
      for(let x=43;x<150;x+=27){rect(x,192,12,6,0x839a61);rect(x+4,187,4,17,0x718850)}
    }
    // The future kitchen occupies actual space from its first visible foundation.
    if(home.location==='living'&&kitchen.stage<3){
      rect(24,32,111,99,0xdbd1b8);
      for(let x=26;x<135;x+=12)rect(x,128,7,2,0xa88c63);
      if(kitchen.stage>=1){
        rect(24,32,5,99,0xb38c62);rect(130,32,5,99,0xb38c62);rect(24,32,111,5,0xb38c62);rect(76,37,4,94,0xb38c62);
        rect(26,125,107,6,0x947b5a);
      }
      if(kitchen.stage>=2){
        rect(29,37,101,85,kitchen.style==='clay'?0xe0b29b:0xc5cfaf);box(43,48,68,48,0xb7cfc5);
        rect(74,50,3,44,0xf2e6cf);rect(45,70,64,3,0xf2e6cf);
      }
      // Moving boxes make the starting room visibly unfinished.
      box(38,187,35,30,0xc3a176);rect(54,189,3,26,0xe6ca9b);
      box(77,202,25,24,0xc9aa80);rect(89,204,2,20,0xe6ca9b);
    }
    for(const f of furnishings(home)) {
      if(f.kind==='tree')continue;
      const {x,y,w:width,h:height}=f;
      if(f.id==='window'){
        box(x,y,width,height,w.night?0x59697b:0xbfd4c6);rect(x+width/2,y+2,3,height-4,0xf3e9d4);rect(x+2,y+height/2,width-4,3,0xf3e9d4);
        rect(x-3,y-3,width+6,4,0x927957);rect(x-2,y,11,height,0xd4ab8b);rect(x+width-9,y,11,height,0xd4ab8b);
        rect(x+70,y+12,7,7,0xf7e7b4);
      } else if(f.id==='lamp'){
        rect(x+12,y+15,3,height-15,0x897554);rect(x+2,y+height-4,width-4,4,0x897554);box(x,y,width,20,f.color);
        if(w.lamp){g.fillStyle(0xffdf93,.14);g.fillCircle(x+14,y+30,38)}
      } else if(f.id==='sofa'&&home.location==='bedroom'){
        box(x,y,width,height,0xab7e72);rect(x-3,y-5,width+6,11,0x92715e);
        rect(x+6,y+8,width-12,height-14,0xe5c3b0);
        box(x+12,y+10,(width-32)/2,20,0xf2e3c4);box(x+width/2+4,y+10,(width-32)/2,20,0xf2e3c4);
        rect(x+6,y+35,width-12,height-41,0xb4bf9c);rect(x+width/2,y+36,2,height-43,0x99ab86);
        rect(x+8,y+height,7,6,0x826b53);rect(x+width-15,y+height,7,6,0x826b53);
      } else if(f.id==='sofa'){
        rect(x-6,y+height+4,width+12,60,0xc5c6a5);
        box(x,y+(home.location==='living'&&kitchen.stage<3?20:0),width,height-(home.location==='living'&&kitchen.stage<3?20:0),f.color);
        rect(x+8,y+25,width-16,26,0xb7c29b);box(x+10,y+8,48,18,0xf2ddba);box(x+width-58,y+8,48,18,0xe9c8a5);
      } else if(f.id.startsWith('plant')){
        box(x,y,width,height,0xac9972);rect(x+4,y+5,width-8,height-10,0x6f6047);
        if(home.location==='living'){rect(x+8,y+22,12,20,0x728b58);rect(x+4,y+31,20,5,0x728b58);rect(x+7,y+43,16,15,0xb77d5c)}
      } else if(f.id==='tv'){
        box(x,y,width,height,0x52604e);rect(x+5,y+5,width-10,height-12,w.tv?(w.gaming?0x91b2b1:0xe0cca1):0xaec2b3);rect(x+29,y+height,6,10,0x52604e);
      } else if(f.id==='playstation'){
        box(x+17,y-15,13,30,0xf1eee4);rect(x+22,y-12,3,25,0x454d50);rect(x+20,y+12,9,2,w.gaming?0x94b8cf:0xa7aaa0);
        box(x,y+6,15,8,0xe8e6d9);rect(x+3,y+8,4,2,0x566059);rect(x+11,y+8,2,2,0x8da28a);
      } else if(f.id==='burger-machine'){
        box(x,y,width,height,0xb87e57);rect(x+3,y+3,width-6,14,0xe6bd72);rect(x+8,y+7,width-16,5,0x76553e);
        box(x+4,y+22,24,34,0x4e5c52);rect(x+8,y+29,16,5,0xe8bc72);rect(x+8,y+35,16,3,0x91a366);rect(x+8,y+39,16,4,0x84583b);rect(x+8,y+43,16,4,0xe8bc72);
        rect(x+31,y+28,4,6,0xa4bc86);rect(x+31,y+39,4,6,0xdab97a);rect(x+8,y+64,23,8,0x4c5145);
      } else if(f.id==='tea'){
        box(x,y,width,height,f.color);rect(x-2,y-4,width+4,7,0xf0e3cb);rect(x+width/2,y+5,2,height-7,0x748367);
        box(x+65,y-9,32,5,0x555c4c);rect(x+18,y-12,15,12,0xdfb373);rect(x+33,y-9,4,6,0xdfb373);
        box(x,y-54,width,27,f.color);rect(x+width/2,y-52,2,23,0x748367);
      } else {
        box(x,y,width,height>40?13:height,f.color);rect(x+4,y+13,4,Math.max(10,height-13),0x927450);rect(x+width-8,y+13,4,Math.max(10,height-13),0x927450);
        if(f.id.startsWith('study'))box(x+18,y-20,34,25,0xadc3af);
      }
    }
    // Earned decorations remain visible after the engine migration.
    home.items[home.location].forEach(item=>{
      if(item==='rug'){rect(158,230,145,27,0xb98c78);rect(162,234,137,19,0xe0c18c);for(let x=166;x<296;x+=16)rect(x,237,8,12,0xb98c78);return}
      if(item==='cushion'){box(215,122,29,23,0xd4a96d);rect(220,127,19,13,0xe7c78f);return}
      if(item==='picture'){box(326,36,58,43,0x927450);rect(330,40,50,35,0xe8dec2);rect(338,58,18,17,0x9bab83);rect(349,50,24,25,0x7b926e);rect(363,44,6,6,0xd8ad62);return}
      if(item==='books'){box(47,174,31,6,0x899e77);box(51,168,28,6,0xb78066);box(49,162,26,6,0xd8bc82);return}
      if(item==='garland'){rect(146,17,198,2,0x75664e);for(let x=153;x<340;x+=31){rect(x,19,1,12,0x75664e);rect(x-7,28,16,4,0x595c4f);rect(x-3,25,7,11,0x595c4f)}return}
      if(item==='lantern'){rect(392,62,2,18,0x7a6b51);box(381,80,25,31,0xd6b576);rect(385,84,17,23,0xf4dfaa);rect(391,83,3,25,0xe6bd76);return}
      if(item==='candles'){for(let i=0;i<3;i++){rect(217+i*9,190-i%2*7,5,12+i%2*7,0xf6e7bd);rect(218+i*9,185-i%2*7,3,4,0xe5b75b)}return}
      if(item==='pumpkin'){rect(346,240,25,16,0xc98b47);rect(350,236,17,24,0xdba456);rect(358,232,4,6,0x768a58);rect(351,244,4,4,0x615d43);rect(362,244,4,4,0x615d43);rect(356,252,7,2,0xf6dfa6);return}
      if(item==='ghost'){rect(91,45,17,25,0xeee6d0);rect(94,41,11,5,0xeee6d0);rect(91,69,5,5,0xeee6d0);rect(103,69,5,5,0xeee6d0);rect(94,51,3,4,0x5f6554);rect(103,51,3,4,0x5f6554)}
    });
    const plants=home.location==='greenhouse'?home.plants.map((plant,i)=>{
      const tree=['sakura','lemon-tree','japanese-maple'].includes(plant.species);
      const {x,y}=plantSpot(home,i);
      return {y:y+(tree?20:15),draw:()=>{
      if(tree){
        const height=14+plant.growth*48,crown=10+plant.growth*27,top=y-height;
        box(x-7,y,27,20,0xaf8561);rect(x+4,top,6,height,0x8c7151);
        const color=plant.species==='sakura'?0xd89ab0:plant.species==='japanese-maple'?0xba7258:0x7b996b;
        rect(x+7-crown/2,top-10,crown,crown*.7,color);rect(x+12-crown/2,top-17,crown-10,crown,color);
        if(plant.growth>.45){for(let n=0;n<3;n++)rect(x-5+n*8,top-5+(n%2)*9,4,4,plant.species==='lemon-tree'?0xe5c15b:0xefc9cf)}
      }else{
        box(x,y,16,15,0xb77d5c);const size=4+plant.growth*25;
        rect(x+7,y-size,3,size,0x657f52);rect(x-2,y-size+4,12,5,0x81985f);rect(x+8,y-size,12,5,0x718e55);
        if(plant.species==='cactus'){rect(x+3,y-size,11,size,0x6c9369);rect(x-3,y-size+8,7,5,0x6c9369);rect(x-3,y-size+3,3,9,0x6c9369)}
        if(plant.growth>.6){
          const petal=plant.species==='lavender'?0xac8bb0:plant.species==='chamomile'?0xf5ebcb:plant.species==='marigold'||plant.species==='sunflower'?0xe0b457:null;
          if(petal!==null){rect(x+2,y-size-5,13,10,petal);rect(x+5,y-size-8,7,16,petal);rect(x+6,y-size-2,5,5,0xb78847)}
          if(plant.species==='pumpkin'){rect(x-1,y-12,18,12,0xd69a4f);rect(x+6,y-15,4,5,0x728b58)}
          if(plant.species==='monstera'){rect(x-5,y-size,13,15,0x527b59);rect(x+10,y-size-5,13,17,0x527b59)}
        }
      }
      }};
    }):[];
    const profiles=this.bridge.profiles();
    const actors=[...w.actors.map(a=>({y:a.y,draw:()=>{
      const p=profiles[a.id],x=a.x,walking=a.path.length>0;
      const step=walking?Math.sin(a.walkPhase*.42)*2:0, seated=!walking&&a.activity==='sofa', y=a.y-32-(seated?12:0);
      if(a.id===w.selected)rect(x-12,a.y+3,25,2,0xf6e5ae);
      rect(x-5,y+21,5,(seated?5:10)+step,0x414f52);rect(x+3,y+21,5,(seated?5:10)-step,0x414f52);
      rect(x-9,y+7,20,16,Phaser.Display.Color.HexStringToColor(p?.outfit||(a.id?'#bf7e6f':'#71886a')).color);
      rect(x-10,y-10,20,p?.hairstyle==='long'?30:17,Phaser.Display.Color.HexStringToColor(p?.hair||(a.id?'#f2d784':'#252324')).color);
      rect(x-6,y-6,13,14,0xedc4a3);rect(x-7,y-10,15,5,Phaser.Display.Color.HexStringToColor(p?.hair||(a.id?'#f2d784':'#252324')).color);
      rect(x-3,y,2,2,0x493e36);rect(x+3,y,2,2,0x493e36);rect(x-1,y+5,4,1,0xb56e60);
      if(w.snack?.actor===a.id&&w.time<w.snack.until){rect(x+10,y+14,12,4,0xe4b567);rect(x+10,y+18,12,2,0x8da565);rect(x+10,y+20,12,3,0x8d6142);rect(x+10,y+23,12,3,0xe4b567)}
      if(a.activity==='tv'&&w.gaming&&!walking){rect(x-6,y+18,14,6,0xebe5d4);rect(x-3,y+20,3,2,0x43534b);rect(x+4,y+20,2,2,0x819c8c)}
      if(a.activity==='tea'&&!walking){rect(x+9,y+18,7,6,0xf1dfbd);rect(x+12,y+12,1,4,0xf9eedb)}
    }})),{y:w.cat.y,draw:()=>{
      const {x,y}=w.cat;rect(x-10,y-12,20,11,0x202023);rect(x+4,y-20,11,12,0x171719);
      rect(x+4,y-23,3,5,0x171719);rect(x+12,y-23,3,5,0x171719);rect(x-13,y-24,3,17,0x202023);
      rect(x+6,y-15,2,2,0xcfbd6e);rect(x+12,y-15,2,2,0xcfbd6e);
    }}];
    [...plants,...actors].sort((a,b)=>a.y-b.y).forEach(entity=>entity.draw());
    if(w.destination&&w.destination.until>w.time){const {x,y}=w.destination;rect(x-5,y,11,2,0xf8eac1);rect(x,y-5,2,11,0xf8eac1)}
    if(w.heartsUntil>w.time)for(const a of w.actors){rect(a.x-4,a.y-49,4,4,0xd88b7e);rect(a.x+2,a.y-49,4,4,0xd88b7e);rect(a.x-2,a.y-45,6,4,0xd88b7e)}
    if(w.partyUntil>w.time)for(let i=0;i<12;i++)rect(145+i*15,135+((this.bridge.reduced()?0:w.time/30)+i*19)%110,3,4,i%2?0xcf957f:0xa1b184);
    for(const d of home.damage.filter(d=>d.location===home.location)){const f=furnishings(home).find(f=>f.id===d.target);if(f){rect(f.x+8,f.y+20,18,2,0x755b46);rect(f.x+12,f.y+24,18,2,0x755b46)}}
    if(w.night)rect(0,0,480,300,0x24314a,.17);
  }
}

export function startHomeGame(parent: HTMLElement, bridge: SceneBridge) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, width: 480, height: 300, backgroundColor: '#e9dfc8',
    pixelArt: true, antialias: false, banner: false, audio: {noAudio: true},
    fps: {target: 30, forceSetTimeOut: false},
    scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
    scene: new HomeScene(bridge),
  });
}
