import{test,expect,type Page}from'@playwright/test';
const uid='11111111-1111-4111-8111-111111111111',partner='22222222-2222-4222-8222-222222222222';
async function apartment(page:Page,options:{completed?:number;active?:boolean}={}){const meetings:Record<string,unknown>[]=Array.from({length:options.completed||0},(_,i)=>({id:`finished-${i}`,proposer:uid,start_at:'2026-10-01T15:00:00Z',end_at:'2026-10-01T17:00:00Z',place:'Наша прогулка',description:'',message:'',status:'completed',version:1,countered:false,cozy:false,created_at:'2026-10-01T12:00:00Z'}));if(options.active)meetings.push({id:'active-meeting',proposer:uid,start_at:new Date(Date.now()-3600000).toISOString(),end_at:null,place:'Проверочная встреча',description:'',message:'',status:'accepted',version:1,countered:false,cozy:false,created_at:new Date(Date.now()-7200000).toISOString()});const schedules:Record<string,unknown>[]=[],interactions:Record<string,unknown>[]=[];await page.addInitScript(({uid})=>{localStorage.setItem('ustime.session',JSON.stringify({access_token:'ui-test-only',refresh_token:'ui-test-only',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:uid}}))},{uid});await page.route('**/*.supabase.co/**',async route=>{const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1);let result:unknown=[];if(table==='profiles')result=[{id:uid,slot:1,name:'Саша',hair:'#000000',outfit:'#76896a',hairstyle:'short',travel:35,prep:10,return_buffer:0,together_until:null},{id:partner,slot:2,name:'Маша',hair:'#f2d784',outfit:'#bd8271',hairstyle:'bob',travel:20,prep:10,return_buffer:0,together_until:null}];else if(table==='meetings'){if(request.method()==='POST'){meetings.push({...request.postDataJSON(),id:'test-meeting',status:'proposed',version:1,countered:false,cozy:false,created_at:new Date().toISOString()})}result=meetings}else if(table==='respond_meeting'){const body=request.postDataJSON(),m=meetings.find(m=>m.id===body.meeting_id)!;m.status=body.action;m.version=Number(m.version)+1;if(body.new_end)m.end_at=body.new_end;result=m}else if(table==='schedules')result=schedules;else if(table==='save_schedule'){const body=request.postDataJSON();schedules.push({...body.payload,id:'test-schedule',title:body.event_title});result='test-schedule'}else if(table==='schedule_details')result=schedules.map(s=>({id:s.id,title:s.title}));else if(table==='interactions'){if(request.method()==='POST')interactions.push({...request.postDataJSON(),id:'test-hug',created_at:new Date().toISOString()});result=interactions}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)})});await page.goto('./');await expect(page.getByRole('heading',{name:/Хорошо, что есть/})).toBeVisible();return{meetings,schedules,interactions}}
test('walk to floor, exact object hits, anchored speech, cat game and dance',async({page})=>{await page.setViewportSize({width:1440,height:1050});await apartment(page);const actor=page.getByTestId('room-actor-0');await actor.click({force:true});await expect(page.locator('.actor-speech')).toBeVisible();const canvas=page.locator('canvas');const box=(await canvas.boundingBox())!;await canvas.click({position:{x:box.width*222/480,y:box.height*252/300},force:true});await expect(page.locator('.actor-speech')).not.toBeVisible();await expect(actor).toHaveAttribute('data-moving','true');await expect(actor).toHaveAttribute('data-x','222',{timeout:12000});await expect(actor).toHaveAttribute('data-y','252');await actor.click({force:true});await expect(page.locator('.actor-speech')).toBeVisible();const speech=(await page.locator('.actor-speech').boundingBox())!,person=(await actor.boundingBox())!;expect(speech.y+speech.height).toBeLessThan(person.y+15);expect(Math.abs(speech.x+speech.width/2-person.x-person.width/2)).toBeLessThan(55);await page.getByRole('button',{name:'Телевизор',exact:true}).click();await expect(page.locator('.actor-speech')).toBeVisible();for(let n=0;n<3;n++)await page.getByRole('button',{name:'Погладить недовольную кошку'}).click({force:true});await expect(page.locator('.cat-score')).toContainText('3');await expect(page.locator('.actor-speech')).toBeVisible();await page.getByRole('button',{name:'Дискотека',exact:false}).click();await expect(page.locator('.party-active')).toBeVisible();await page.screenshot({path:'test-results/playful-room-desktop.png',fullPage:true});});
test('a quick invitation uses chips, sends real timestamps, and stays proposed',async({page})=>{await page.setViewportSize({width:1440,height:1050});const{meetings}=await apartment(page);await page.getByRole('button',{name:'+ Запланировать встречу'}).click();const modal=page.getByRole('dialog');await modal.getByRole('button',{name:/Завтра/}).click();await modal.getByRole('button',{name:'19:00',exact:true}).click();await modal.getByRole('button',{name:/Спасти пиццу/}).click();await modal.getByRole('button',{name:'Пару часов',exact:true}).click();await expect(modal.locator('.invite-ticket')).toContainText('Завтра в 19:00');await expect(modal.locator('.invite-ticket')).toContainText('Пицца вдвоём');await expect(modal.locator('input[type="datetime-local"]')).toHaveCount(0);await page.screenshot({path:'test-results/quick-invitation-desktop.png',fullPage:true});await modal.getByRole('button',{name:'Всё, зову тебя!'}).click();await expect(modal.getByRole('heading',{name:'Приглашение улетело!'})).toBeVisible();expect(meetings).toHaveLength(1);expect(meetings[0].status).toBe('proposed');expect(Date.parse(String(meetings[0].end_at))-Date.parse(String(meetings[0].start_at))).toBe(7200000);await modal.getByRole('button',{name:'Хорошо, ждём'}).click();await expect(page.getByText('Ждём ответа',{exact:true})).toBeVisible();});
test('mobile 320: quick schedule, recurring weekdays, invitation and touch targets',async({page})=>{await page.setViewportSize({width:320,height:740});const{schedules}=await apartment(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Указать время',exact:true}).click();let modal=page.getByRole('dialog');await modal.getByRole('button',{name:/Свободно/}).click();await modal.getByRole('button',{name:/Завтра/}).click();await modal.getByRole('button',{name:/Вечер/}).click();await modal.locator('.schedule-repeat summary').click();await modal.getByRole('button',{name:'Через неделю',exact:true}).click();await modal.getByRole('group',{name:'Дни повторения'}).getByRole('button',{name:'Пн',exact:true}).click();expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await modal.getByRole('button',{name:'Готово, так и запишем'}).click();await expect(modal).not.toBeVisible();expect(schedules).toHaveLength(1);expect(schedules[0].interval_weeks).toBe(2);expect(schedules[0].state).toBe('available');await page.getByRole('button',{name:'+ Запланировать встречу'}).click();modal=page.getByRole('dialog');await modal.getByRole('button',{name:/Завтра/}).click();await modal.getByRole('button',{name:'19:00',exact:true}).click();await modal.getByRole('button',{name:/Пить чай/}).click();expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'test-results/quick-invitation-mobile.png',fullPage:true});await modal.getByRole('button',{name:'Закрыть',exact:true}).click();await page.screenshot({path:'test-results/playful-room-mobile.png',fullPage:true});});
test('reduced motion keeps walking controls without autonomous animation',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await apartment(page);const actor=page.getByTestId('room-actor-0');const canvas=page.locator('canvas'),box=(await canvas.boundingBox())!;await canvas.click({position:{x:box.width*222/480,y:box.height*252/300},force:true});await expect(actor).toHaveAttribute('data-x','222');await expect(actor).toHaveAttribute('data-y','252');await expect(actor).toHaveAttribute('data-moving','false');await expect(page.locator('.actor-speech')).not.toBeVisible();});


test('large mobile scene, vertical nursery, named plants, earned decor and persistence',async({page})=>{
 await page.setViewportSize({width:320,height:850});await apartment(page,{completed:6});
 const scene=page.getByRole('region',{name:'Комната, можно прокручивать по горизонтали'});
 expect(await page.locator('canvas').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(390);
 const startScroll=await scene.evaluate(el=>el.scrollLeft);
 await page.getByRole('button',{name:'Посмотреть правую часть комнаты'}).click();
 expect(await scene.evaluate(el=>el.scrollLeft)).toBeGreaterThan(startScroll);
 await page.getByRole('button',{name:'Посмотреть левую часть комнаты'}).click();
 await page.getByRole('button',{name:'Посадить растение',exact:false}).click();
 const dialog=page.getByRole('dialog');
 expect(await dialog.getByRole('group',{name:'Каталог растений'}).evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
 await expect(dialog.getByRole('button',{name:/Монстера/})).toBeDisabled();
 await dialog.getByRole('button',{name:/Кактус/}).click();await dialog.getByLabel('Имя растения').fill('Граф Листочек');await page.screenshot({path:'test-results/plant-nursery-mobile.png',fullPage:true});
 await dialog.getByRole('button',{name:'Посадить «Граф Листочек»'}).click();
 await expect(page.getByRole('progressbar',{name:'Рост: Граф Листочек'})).toHaveAttribute('value','0');
 await page.getByRole('button',{name:'Оранжерея',exact:false}).click();
 await page.getByRole('button',{name:'Украшения',exact:false}).click();
 await page.getByRole('button',{name:/Стопка книг/}).click();
 await expect(page.getByRole('button',{name:/Стопка книг/})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/meeting-game-mobile.png',fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Украшения',exact:false}).click();
 await expect(page.getByRole('button',{name:/Стопка книг/})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Наш сад',exact:false}).click();
 await expect(page.getByText('Граф Листочек',{exact:true})).toBeVisible();
 await page.setViewportSize({width:1440,height:1100});
 await page.screenshot({path:'test-results/meeting-game-desktop.png',fullPage:true});
 const game=await page.locator('.game-home').boundingBox(),planning=await page.locator('.home-planning').boundingBox();
 expect(game!.width).toBeGreaterThan(1100);expect(planning!.y).toBeGreaterThan(game!.y+game!.height);
});

test('cat causes visible persistent damage that can be repaired',async({page})=>{
 await page.clock.install();await apartment(page);
 await page.clock.fastForward(46000);
 await expect(page.locator('.cat-journal')).toContainText('Пакостей: 1');
 await expect(page.getByRole('button',{name:'⚒ Починить (1)',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:'⚒ Починить (1)',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'⚒ Починить (1)',exact:true}).click();
 await expect(page.locator('.cat-journal')).toContainText('Всё починено');
 await expect(page.getByRole('button',{name:/Починить/})).toHaveCount(0);
});


test('day and night follow real time in every room and window cannot switch them',async({page})=>{
 await page.clock.install({time:new Date(2026,9,27,18,59,50)});await apartment(page,{completed:3});
 await expect(page.locator('.interactive-room')).not.toHaveClass(/night-room/);
 await expect(page.getByRole('combobox',{name:'Режим времени суток'})).toHaveCount(0);
 await page.getByRole('button',{name:'Окно',exact:true}).click();
 await expect(page.locator('.interactive-room')).not.toHaveClass(/night-room/);
 await page.clock.fastForward(11000);await expect(page.locator('.interactive-room')).toHaveClass(/night-room/);
 await page.getByRole('button',{name:'Оранжерея',exact:false}).click();await expect(page.locator('.interactive-room')).toHaveClass(/night-room/);
 await page.getByRole('button',{name:'Окно',exact:true}).click();await expect(page.locator('.interactive-room')).toHaveClass(/night-room/);
 await page.clock.setSystemTime(new Date(2026,9,28,7,0,0));await page.clock.fastForward(1200);await expect(page.locator('.interactive-room')).not.toHaveClass(/night-room/);
});

test('a real completion unlocks a reward and grows a plant exactly once',async({page})=>{
 await page.clock.install();const {meetings}=await apartment(page,{active:true});
 await page.getByRole('button',{name:'Спальня',exact:false}).isDisabled().then(disabled=>expect(disabled).toBe(true));
 await page.getByRole('button',{name:'Украшения',exact:false}).click();
 await expect(page.getByRole('button',{name:/Тёплые свечи/})).toBeDisabled();
 await page.getByRole('button',{name:'Посадить растение',exact:false}).click();
 await page.getByRole('dialog').getByLabel('Имя растения').fill('Кусь');
 await page.getByRole('dialog').getByRole('button',{name:'Посадить «Кусь»'}).click();
 await expect(page.getByRole('progressbar',{name:'Рост: Кусь'})).toHaveAttribute('value','0');
 await page.clock.fastForward(120000);await expect(page.getByRole('progressbar',{name:'Рост: Кусь'})).toHaveAttribute('value','0');
 await page.getByRole('button',{name:'Встреча состоялась',exact:true}).click();
 await page.getByRole('dialog').getByLabel('Когда закончили').fill('2026-10-27T20:00');
 await page.getByRole('button',{name:'Да, мы встретились',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(meetings[0].status).toBe('completed');
 await expect(page.getByRole('progressbar',{name:'Рост: Кусь'})).toHaveAttribute('value',String(1/3));
 await expect(page.locator('.home-level')).toContainText('100 искр');
 await page.getByRole('button',{name:'Украшения',exact:false}).click();
 await expect(page.getByRole('button',{name:/Тёплые свечи/})).toBeEnabled();
 await page.getByRole('button',{name:/Тёплые свечи/}).click();
 await expect(page.getByRole('button',{name:/Тёплые свечи/})).toHaveAttribute('aria-pressed','true');
 await page.clock.fastForward(16000);await page.reload();await page.getByRole('button',{name:'Наш сад',exact:false}).click();
 await expect(page.getByRole('progressbar',{name:'Рост: Кусь'})).toHaveAttribute('value',String(1/3));
 await expect(page.locator('.home-level')).toContainText('100 искр');
});


test('room icons stay beside centered labels on desktop and mobile',async({page})=>{
 await apartment(page);
 for(const width of [1440,320]){
  await page.setViewportSize({width,height:1000});
  for(const button of await page.getByRole('group',{name:'Комнаты'}).getByRole('button').all()){
   const icon=(await button.locator('.location-tab-icon').boundingBox())!,label=(await button.locator('.location-tab-label').boundingBox())!;
   expect(icon.x+icon.width).toBeLessThanOrEqual(label.x);
   expect(Math.abs(icon.y+icon.height/2-label.y-label.height/2)).toBeLessThan(2);
  }
 }
 await page.locator('.location-tabs').screenshot({path:'test-results/room-buttons-mobile.png'});
});
