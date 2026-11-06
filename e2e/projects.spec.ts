import {expect,test} from '@playwright/test';
import {apartment} from './fixtures/apartment';

test('project menu is collapsed, scrolls horizontally and filters by location on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await apartment(page);
 const toggle=page.getByRole('button',{name:/Проекты дома/});
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('group',{name:'Лента проектов'})).toHaveCount(0);
 await toggle.click();
 const list=page.getByRole('group',{name:'Лента проектов'});
 await expect(list.getByRole('button')).toHaveCount(19);
 expect(await list.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
 await page.getByRole('button',{name:'Следующие проекты'}).click();
 await expect.poll(()=>list.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await page.getByRole('group',{name:'Где обустраиваем'}).getByRole('button',{name:'Спальня',exact:true}).click();
 await expect(list.getByRole('button')).toHaveCount(3);
 await list.getByRole('button',{name:/Комната тихих историй/}).click();
 await expect(page.getByRole('button',{name:'Обустроить по проекту'})).toBeDisabled();
 await page.locator('.project-menu').screenshot({path:'test-results/projects-mobile.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await toggle.click();
 await expect(list).toHaveCount(0);
});

test('a decor project places missing items, preserves existing ones and persists',async({page})=>{
 const {shared}=await apartment(page,{completed:4});
 shared.state.items.living=['candles'];
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.getByRole('button',{name:/Проекты дома/}).click();
 await page.getByRole('group',{name:'Лента проектов'}).getByRole('button',{name:/Читальный уголок/}).click();
 await page.getByRole('button',{name:'Обустроить по проекту'}).click();
 await expect(page.getByRole('button',{name:/Проекты дома/})).toHaveAttribute('aria-expanded','false');
 expect(shared.state.items.living).toEqual(['candles','books','cushion']);
 expect(shared.operations.size).toBe(2);
 await page.reload();
 await page.getByRole('button',{name:/Проекты дома/}).click();
 await page.getByRole('group',{name:'Лента проектов'}).getByRole('button',{name:/Читальный уголок/}).click();
 await expect(page.getByRole('button',{name:'Уже обустроено'})).toBeDisabled();
});

test('herb garden opens the outdoor nursery with mint preselected',async({page})=>{
 await apartment(page,{completed:3});
 await page.getByRole('button',{name:/Проекты дома/}).click();
 await page.getByRole('group',{name:'Где обустраиваем'}).getByRole('button',{name:'Оранжерея',exact:true}).click();
 await page.getByRole('group',{name:'Лента проектов'}).getByRole('button',{name:/Травы для чая/}).click();
 await page.getByRole('button',{name:'Выбрать имя и посадить'}).click();
 const nursery=page.getByRole('dialog');
 await expect(nursery).toBeVisible();
 await expect(nursery.getByRole('button',{name:/Мята/})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByText('Отдельная теплица во дворе · выращиваем растения под стеклом')).toBeVisible();
});

test('new entertainment furniture is placed, interactive and retained on reload',async({page})=>{
 const {shared}=await apartment(page,{completed:7});
 async function place(name:RegExp){
  await page.getByRole('button',{name:/Проекты дома/}).click();
  await page.getByRole('group',{name:'Лента проектов'}).getByRole('button',{name}).click();
  await page.getByRole('button',{name:'Обустроить по проекту'}).click();
  await expect(page.getByRole('button',{name:/Проекты дома/})).toHaveAttribute('aria-expanded','false');
 }
 await place(/Вечер с PlayStation/);
 await expect(page.getByRole('button',{name:'Большой телевизор',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Играть на PlayStation',exact:true}).click();
 await expect(page.locator('.actor-speech')).toContainText('Геймпады готовы');
 await place(/Чизбургерный автомат/);
 await page.getByRole('button',{name:'Взять чизбургер',exact:true}).click();
 await expect(page.locator('.actor-speech')).toContainText('горячий чизбургер');
 await page.locator('.room-scene').screenshot({path:'test-results/entertainment-room.png'});
 await place(/Огромная кровать/);
 await expect(page.getByRole('button',{name:'Огромная кровать',exact:true})).toBeVisible();
 expect(shared.state.items.bedroom).toContain('king-bed');
 await page.locator('.room-scene').screenshot({path:'test-results/king-bed.png'});
 await page.reload();
 await page.getByRole('group',{name:'Комнаты'}).getByRole('button',{name:'Спальня',exact:true}).click();
 await expect(page.getByRole('button',{name:'Огромная кровать',exact:true})).toBeVisible();
 expect(shared.state.items.living).toEqual(expect.arrayContaining(['television','playstation','burger-machine']));
});

test('sakura, lemon and maple grow in the greenhouse and survive reload',async({page})=>{
 const {shared,meetings}=await apartment(page,{completed:7});
 for(const [project,name] of [[/Сакура под стеклом/,'Наша сакура'],[/Лимонный сад/,'Наш лимон'],[/Красный клён/,'Наш клён']] as const){
  await page.getByRole('button',{name:/Проекты дома/}).click();
  await page.getByRole('group',{name:'Лента проектов'}).getByRole('button',{name:project}).click();
  await page.getByRole('button',{name:'Выбрать имя и посадить'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('textbox').fill(name);
  await dialog.getByRole('button',{name:/Посадить/}).click();
  await expect(dialog).toHaveCount(0);
 }
 expect(shared.state.plants.map(p=>p.species)).toEqual(['sakura','lemon-tree','japanese-maple']);
 meetings.push(...Array.from({length:6},(_,i)=>({id:`tree-growth-${i}`,status:'completed'})));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.reload();
 await page.getByRole('group',{name:'Комнаты'}).getByRole('button',{name:'Оранжерея',exact:true}).click();
 await expect(page.getByText('Отдельная теплица во дворе · выращиваем растения под стеклом')).toBeVisible();
 await page.locator('.room-scene').screenshot({path:'test-results/orangery-trees.png'});
 expect(shared.state.plants).toHaveLength(3);
});
