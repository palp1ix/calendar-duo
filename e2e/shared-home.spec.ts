import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {homeMock} from './fixtures/sharedHome';
const one='11111111-1111-4111-8111-111111111111',two='22222222-2222-4222-8222-222222222222';
const completed=()=>Array.from({length:6},(_,i)=>({id:`meeting-${i}`,status:'completed',proposer:one,start_at:'2026-10-01T12:00:00Z',end_at:'2026-10-01T13:00:00Z',place:'Прогулка',description:'',message:'',version:1,countered:false,cozy:false,created_at:'2026-10-01T10:00:00Z'}));
async function connect(context:BrowserContext,id:string,server:ReturnType<typeof homeMock>,meetings:Record<string,unknown>[],drop?:{next:boolean}){
 await context.addInitScript(id=>localStorage.setItem('ustime.session',JSON.stringify({access_token:id,refresh_token:'mock',expires_at:Date.now()/1000+3600,user:{id}})),id);
 await context.route('**/*.supabase.co/**',async route=>{const req=route.request(),table=new URL(req.url()).pathname.split('/').at(-1);let result:unknown=[];
  try{if(table==='get_home')result=server.snapshot();else if(table==='change_home'){result=server.change(req.postDataJSON());if(drop?.next){drop.next=false;await route.abort('failed');return}}
  else if(table==='profiles')result=[{id:one,slot:1,name:'Саша',hair:'#000000',outfit:'#76896a',hairstyle:'short',travel:35,prep:10,return_buffer:0,together_until:null},{id:two,slot:2,name:'Маша',hair:'#f2d784',outfit:'#bd8271',hairstyle:'bob',travel:20,prep:10,return_buffer:0,together_until:null}];else if(table==='meetings')result=meetings;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)})}catch(error){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:String(error)})})}
 });
 const page=await context.newPage();await page.clock.install();await page.goto('./');await expect(page.getByRole('heading',{name:/Хорошо, что есть/})).toBeVisible();return page;
}
async function room(page:Page,name:string){await page.getByRole('group',{name:'Комнаты'}).getByRole('button',{name:new RegExp(name)}).click()}
async function plant(page:Page,name:string){await page.getByRole('button',{name:'Посадить растение',exact:true}).click();await page.getByRole('dialog').getByLabel('Имя растения').fill(name);await page.getByRole('dialog').getByRole('button',{name:`Посадить «${name}»`}).click()}

test('two mobile apps share plants, decor, damage and repairs without reload',async({browser})=>{
 const meetings=completed(),server=homeMock(meetings),a=await browser.newContext({viewport:{width:390,height:844}}),b=await browser.newContext({viewport:{width:320,height:850}});
 const first=await connect(a,one,server,meetings),second=await connect(b,two,server,meetings);
 let navigations=0;first.on('framenavigated',()=>navigations++);second.on('framenavigated',()=>navigations++);
 await room(first,'Оранжерея');await room(second,'Оранжерея');
 await second.getByRole('button',{name:'Посадить растение',exact:true}).click();await second.getByRole('dialog').getByLabel('Имя растения').fill('Черновик не теряется');
 await plant(first,'Наш Листочек');await expect(first.getByRole('progressbar',{name:'Рост: Наш Листочек'})).toBeVisible();
 await second.clock.fastForward(8500);
 await expect(second.getByRole('dialog').getByLabel('Имя растения')).toHaveValue('Черновик не теряется');
 await second.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).click();
 await second.locator('.workshop-toolbar').getByRole('button',{name:/Оранжерея/}).click();
 await expect(second.getByRole('progressbar',{name:'Рост: Наш Листочек'})).toBeVisible();
 await room(first,'Гостиная');await room(second,'Гостиная');
 await first.getByRole('button',{name:/Украшения/}).click();await second.getByRole('button',{name:/Украшения/}).click();
 await first.getByRole('button',{name:/Стопка книг/}).click();await second.clock.fastForward(8500);
 await expect(second.getByRole('button',{name:/Стопка книг/})).toHaveAttribute('aria-pressed','true');
 await room(first,'Спальня');await expect(second.getByRole('group',{name:'Комнаты'}).getByRole('button',{name:/Гостиная/})).toHaveAttribute('aria-pressed','true');
 server.damage('living');await second.clock.fastForward(8500);await second.getByRole('button',{name:'Починить (1)',exact:true}).click();await second.getByRole('button',{name:'Починить',exact:true}).click();
 await first.clock.fastForward(8500);await expect(first.locator('.cat-journal')).toContainText('Всё починено');expect(server.state.damage).toHaveLength(0);
 // iOS-style suspension: no polling while hidden, immediate refresh on foreground.
 await second.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));
 await room(first,'Оранжерея');await plant(first,'После возвращения');
 await second.clock.fastForward(8500);await second.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});
 await second.locator('.workshop-toolbar').getByRole('button',{name:/Оранжерея/}).click();
 await expect(second.getByRole('progressbar',{name:'Рост: После возвращения'})).toBeVisible();
 expect(navigations).toBe(0);await first.screenshot({path:'test-results/shared-home-mobile.png',fullPage:true});await a.close();await b.close();
});

test('lost planting response retries the same operation and preserves the name',async({browser})=>{
 const meetings=completed(),server=homeMock(meetings),drop={next:false},context=await browser.newContext({viewport:{width:390,height:844}}),page=await connect(context,one,server,meetings,drop);
 await room(page,'Оранжерея');drop.next=true;await plant(page,'Единственный');
 await expect(page.getByRole('dialog').getByLabel('Имя растения')).toHaveValue('Единственный');expect(server.state.plants).toHaveLength(1);
 await page.getByRole('dialog').getByRole('button',{name:'Посадить «Единственный»'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(server.state.plants).toHaveLength(1);expect(server.operations.size).toBe(1);await expect(page.getByRole('progressbar',{name:'Рост: Единственный'})).toBeVisible();await context.close();
});
