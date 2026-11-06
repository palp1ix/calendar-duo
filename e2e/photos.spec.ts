import {test,expect,type Page} from '@playwright/test';
import {homeMock} from './fixtures/sharedHome';
const uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=','base64');
async function setup(page:Page,{fail=false,count=12}={}){
 const downloads:string[]=[],uploads:{path:string;bytes:Buffer;type:string}[]=[],memories:any[]=Array.from({length:count},(_,i)=>({id:`memory-${i}`,meeting_id:'m',author:uid,note:'Наш хороший день',moment:'',label:`Момент ${i}`,photo:`${uid}/photo-${i}.png`,created_at:new Date(Date.now()-i*86400000).toISOString()}));
 const meetings=[{id:'m',status:'completed',proposer:uid,start_at:'2026-10-01T12:00:00Z',end_at:'2026-10-01T13:00:00Z',place:'Наша встреча',description:'',message:'',version:1,countered:false,cozy:false,created_at:'2026-10-01T10:00:00Z'}],home=homeMock(meetings);let failNext=fail;
 await page.addInitScript(uid=>localStorage.setItem('ustime.session',JSON.stringify({access_token:'photo-test',refresh_token:'test',expires_at:Date.now()/1000+3600,user:{id:uid}})),uid);
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.route('**/*.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1);let result:any=[];
 if(url.pathname.includes('/object/authenticated/memories/')){downloads.push(url.pathname);expect(req.headers().authorization).toBe('Bearer photo-test');if(failNext){failNext=false;await route.fulfill({status:503,body:'Unavailable'});return}const uploaded=uploads.find(u=>url.pathname.endsWith(u.path));await route.fulfill({status:200,contentType:uploaded?.type||'image/png',body:uploaded?.bytes||pixel});return}
 if(url.pathname.startsWith('/storage/v1/object/memories/')){if(req.method()==='POST')uploads.push({path:url.pathname.split('/memories/')[1],bytes:req.postDataBuffer()!,type:req.headers()['content-type']});await route.fulfill({status:200,contentType:'application/json',body:'{}'});return}
 if(table==='profiles')result=[{id:uid,slot:1,name:'Саша',hair:'#000000',outfit:'#76896a',hairstyle:'short',travel:35,prep:10,return_buffer:0,together_until:null},{id:other,slot:2,name:'Маша',hair:'#000000',outfit:'#bd8271',hairstyle:'long',travel:20,prep:10,return_buffer:0,together_until:null}];
 if(table==='get_home')result=home.snapshot();
 if(table==='story_action')result={since:null,sessions:[],letters:[],server_now:new Date().toISOString()};
 if(table==='meetings')result=meetings;
 if(table==='memories'){if(req.method()==='POST')memories.unshift({...req.postDataJSON(),id:'new',created_at:new Date().toISOString()});result=memories}
 if(url.pathname==='/auth/v1/logout')result={};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto('./');await expect(page.getByRole('heading',{name:/Хорошо, что есть/})).toBeVisible();
 return{downloads,uploads,memories};
}
function history(page:Page){return page.locator('.header nav,.bottom-nav').getByRole('button',{name:/История/}).filter({visible:true}).first().click()}
test('loads nearby photos once, keeps them through navigation and polling, and leaves no disk cache',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {downloads}=await setup(page);await history(page);
 const first=page.locator('.memory-photo img').first();await expect(first).toBeVisible();await expect(first).toHaveJSProperty('complete',true);expect(downloads.length).toBeGreaterThan(0);expect(downloads.length).toBeLessThan(12);
 const paths=new Set(downloads);await page.locator('.bottom-nav').getByRole('button',{name:/Наш дом/}).click();await history(page);await expect(page.locator('.memory-photo img').first()).toBeVisible();
 for(const path of paths)expect(downloads.filter(p=>p===path)).toHaveLength(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('.memory-photo img').first()).toBeVisible();for(const path of paths)expect(downloads.filter(p=>p===path)).toHaveLength(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/history-photos-mobile.png',fullPage:true});
 expect(await page.evaluate(async()=>{const keys=await caches.keys();return(await Promise.all(keys.map(async k=>(await(await caches.open(k)).keys()).map(r=>r.url)))).flat().filter(url=>url.includes('/storage/'))})).toEqual([]);
 // A reload creates a new tab-memory cache and fetches photos again.
 const before=downloads.length;await page.reload();await history(page);await expect(page.locator('.memory-photo img').first()).toBeVisible();expect(downloads.length).toBeGreaterThan(before);
});
test('a failed photo has an actionable retry',async({page})=>{
 await setup(page,{fail:true,count:1});await history(page);await expect(page.getByText('Фото временно недоступно',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Загрузить снова'}).click();await expect(page.locator('.memory-photo img')).toBeVisible();await expect(page.locator('.memory-photo img')).toHaveJSProperty('naturalWidth',1);
});
test('compresses new photos before upload and shows the uploaded image from memory',async({page})=>{
 const {uploads,downloads}=await setup(page,{count:0});
 const source=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=2000;const c=canvas.getContext('2d')!;const gradient=c.createLinearGradient(0,0,3000,2000);gradient.addColorStop(0,'#8fa575');gradient.addColorStop(1,'#e6b894');c.fillStyle=gradient;c.fillRect(0,0,3000,2000);c.fillStyle='#f6f1e3';c.fillRect(500,400,1300,900);return canvas.toDataURL('image/jpeg',.97).split(',')[1]});
 const input=Buffer.from(source,'base64');await history(page);await page.getByRole('button',{name:'+ Воспоминание'}).click();await page.getByLabel('Что хочется запомнить').fill('Сохраним этот день');await page.getByLabel('Фото (JPG, PNG, WebP до 5 МБ)').setInputFiles({name:'large.jpg',mimeType:'image/jpeg',buffer:input});await page.getByRole('button',{name:'Оставить в нашей истории'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(uploads).toHaveLength(1);expect(uploads[0].type).toBe('image/webp');expect(uploads[0].bytes.length).toBeLessThan(input.length);
 const image=page.locator('.memory-photo img');await expect(image).toBeVisible();await expect(image).toHaveJSProperty('naturalWidth',1600);expect(downloads).toHaveLength(0);
});

test('memory composer supports quick dates, photo preview, details and retry on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const {memories}=await setup(page,{count:0});await history(page);
 await page.getByRole('button',{name:'+ Воспоминание'}).click();
 const dialog=page.getByRole('dialog'),save=dialog.getByRole('button',{name:'Оставить в нашей истории'});
 await expect(save).toBeDisabled();
 await dialog.getByLabel('Что хочется запомнить').fill('   ');await expect(save).toBeDisabled();
 await dialog.getByLabel('Что хочется запомнить').fill('  Тёплый вечер у озера  ');
 await dialog.getByRole('button',{name:'Вчера',exact:true}).click();
 const date=await dialog.getByLabel('Дата воспоминания').inputValue();
 await expect(dialog.getByLabel('Название этого эпизода')).not.toBeVisible();
 await dialog.getByLabel('Фото (JPG, PNG, WebP до 5 МБ)').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('text')});
 await expect(dialog.getByRole('alert')).toContainText('Выберите JPG');
 await dialog.getByLabel('Фото (JPG, PNG, WebP до 5 МБ)').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:pixel});
 await expect(dialog.getByAltText('Выбранное фото воспоминания')).toBeVisible();
 await dialog.getByRole('button',{name:'Убрать фото'}).click();
 await expect(dialog.getByAltText('Выбранное фото воспоминания')).toHaveCount(0);
 await dialog.locator('summary').click();
 await dialog.getByLabel('Название этого эпизода').fill('У озера');
 await dialog.getByLabel('Любимый момент').fill('Смотрели на уток');
 await dialog.getByLabel('Связать со встречей').selectOption('m');
 await dialog.locator('summary').click();
 await page.screenshot({path:'/tmp/calendar-duo-memory-mobile.png'});
 let fail=true;
 await page.route('**/rest/v1/memories?*',route=>route.fallback());
 await page.route('**/rest/v1/memories',async route=>{if(fail&&route.request().method()==='POST'){fail=false;await route.fulfill({status:503,json:{message:'Unavailable'}})}else await route.fallback()});
 await save.click();await expect(dialog.getByRole('alert')).toContainText('Всё осталось в форме');
 await expect(dialog.getByLabel('Что хочется запомнить')).toHaveValue('  Тёплый вечер у озера  ');
 await save.click();await expect(dialog).toHaveCount(0);
 expect(memories[0]).toMatchObject({note:'Тёплый вечер у озера',label:'У озера',moment:'Смотрели на уток',memory_date:date,meeting_id:'m',photo:null});
});

test('memory dialog never scrolls horizontally',async({page})=>{
 await setup(page,{count:0});await history(page);await page.getByRole('button',{name:'+ Воспоминание'}).click();
 const dialog=page.getByRole('dialog');
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:844});
  await dialog.locator('summary').click();
  await dialog.getByLabel('Что хочется запомнить').fill('Длинноеслово'.repeat(100));
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  expect(await dialog.getByLabel('Что хочется запомнить').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await dialog.evaluate(el=>{el.scrollLeft=100});
  expect(await dialog.evaluate(el=>el.scrollLeft)).toBe(0);
  await dialog.locator('summary').click();
 }
});
