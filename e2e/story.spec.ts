import {test,expect,type Page} from '@playwright/test';
import {homeMock} from './fixtures/sharedHome';
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('https://fonts.gstatic.com/**',route=>route.abort())});
const uid='11111111-1111-4111-8111-111111111111',partner='22222222-2222-4222-8222-222222222222';
async function setup(page:Page,options:{active?:boolean;pending?:boolean}={}){
 const story={since:null as string|null,server_now:new Date().toISOString(),sessions:[] as any[],letters:[{id:'received',author:partner,body:'Ты — мой любимый человек.',created_at:new Date().toISOString(),opened_at:null as string|null}]};
 if(options.active||options.pending)story.sessions.push({id:'session',proposer:partner,requested_at:new Date().toISOString(),started_at:options.active?new Date(Date.now()-89*60000).toISOString():null,ends_at:options.active?new Date(Date.now()+11*3600000).toISOString():null});
 const shared=homeMock([]);const home=shared.snapshot();home.state.plants=[{id:'mint',name:'Мята',species:'mint',plantedAt:Date.now()-3600000,baseline:[],growth:0}];
 const calls:string[]=[];
 await page.addInitScript(uid=>localStorage.setItem('ustime.session',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600,user:{id:uid}})),uid);
 await page.route('**/*.supabase.co/**',async route=>{const req=route.request(),table=new URL(req.url()).pathname.split('/').at(-1);let result:any=[];
 if(table==='profiles')result=[{id:uid,slot:1,name:'Саша',hair:'#000000',outfit:'#76896a',hairstyle:'short',travel:35,prep:10,return_buffer:0,together_until:null},{id:partner,slot:2,name:'Маша',hair:'#f2d784',outfit:'#bd8271',hairstyle:'bob',travel:20,prep:10,return_buffer:0,together_until:null}];
 if(table==='get_home')result=home;
 if(table==='story_action'){
 const {action,operation_id,payload}=req.postDataJSON();calls.push(action);
 if(action==='start')story.sessions.push({id:operation_id,proposer:uid,requested_at:new Date().toISOString(),started_at:null,ends_at:null});
 if(action==='accept'){const s=story.sessions.find(s=>s.id===operation_id);s.started_at=new Date().toISOString();s.ends_at=new Date(Date.now()+12*3600000).toISOString()}
 if(action==='stop'){const s=story.sessions.find(s=>s.id===operation_id);if(s.started_at)s.ends_at=new Date().toISOString();else s.cancelled_at=new Date().toISOString()}
 if(action==='since')story.since=payload.since;
 if(action==='letter')story.letters.push({id:operation_id,author:uid,body:payload.body,created_at:new Date().toISOString(),opened_at:null});
 if(action==='open')story.letters.find(l=>l.id===operation_id)!.opened_at=new Date().toISOString();
 result={...story,server_now:new Date().toISOString()};
 }
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto('./');await expect(page.getByRole('heading',{name:/Хорошо, что есть/})).toBeVisible();return{story,calls};
}
test('starts only after partner confirmation, ends and persists, leaves and opens letters',async({page})=>{
 const {story}=await setup(page,{pending:true});
 await expect(page.getByRole('heading',{name:'Ждём второго «да»'})).toBeVisible();
 await page.getByRole('button',{name:'Да, мы вместе ♡',exact:true}).click();
 await expect(page.locator('.together-card')).toContainText('МЫ СЕЙЧАС ВМЕСТЕ');
 await page.reload();await expect(page.locator('.together-card')).toContainText('МЫ СЕЙЧАС ВМЕСТЕ');
 await page.getByRole('button',{name:'Мы разошлись · сохранить время'}).click();await expect(page.getByRole('heading',{name:'Побудем рядом?'})).toBeVisible();
 await page.getByRole('button',{name:'✉ Оставить записку'}).click();await page.getByLabel('Твоя записка').fill('Встретим первый снег вместе?');await page.getByRole('button',{name:'Оставить под подушкой'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(story.letters).toHaveLength(2);await expect(page.getByText('Ждёт партнёра',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Тебе записка/}).click();await expect(page.getByRole('dialog')).toContainText('Ты — мой любимый человек.');expect(story.letters[0].opened_at).toBeTruthy();
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:/Прочитать снова/})).toBeVisible();
});
test('live time opens decor before completion, achievements and mobile layout',async({page})=>{
 await page.clock.install();await page.setViewportSize({width:320,height:850});await setup(page,{active:true});
 await expect(page.locator('.home-level')).toContainText('0 встреч');
 await page.getByRole('button',{name:/Украшения/}).click();await expect(page.getByRole('button',{name:/Тёплые свечи/})).toBeDisabled();
 await page.clock.fastForward(61000);await expect(page.getByRole('button',{name:/Тёплые свечи/})).toBeEnabled();
 await expect(page.locator('.home-level')).toContainText('0 встреч');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/story-mobile.png',fullPage:true});
 await page.locator('.bottom-nav').getByRole('button',{name:/Достижения/}).click();await expect(page.locator('.achievement')).toHaveCount(30);
 await page.getByRole('button',{name:'Время вместе',exact:true}).click();await expect(page.locator('.achievement')).toHaveCount(5);await expect(page.locator('.achievement').first()).toContainText('Открыто');
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/story-achievements-desktop.png',fullPage:true});
});
test('own invitation waits; date is shared and persists after reload',async({page})=>{
 const {story}=await setup(page);await page.getByRole('button',{name:'Мы сейчас вместе',exact:true}).click();await expect(page.getByRole('heading',{name:'Ждём второго «да»'})).toBeVisible();await expect(page.getByRole('button',{name:'Да, мы вместе ♡',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Выбрать нашу дату'}).click();await page.getByLabel('Наша дата').fill('2026-09-01');await page.getByRole('button',{name:'Сохранить нашу дату'}).click();expect(story.since).toBe('2026-09-01');await page.reload();await expect(page.locator('.story-age')).toContainText('сентября');
 await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:'test-results/story-home-desktop.png',fullPage:true});
});
