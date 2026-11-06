import {test,expect} from '@playwright/test';

test('finished dev home is available without login and never calls the backend',async({page})=>{
 const backend:string[]=[];
 await page.route('**/*.supabase.co/**',async route=>{backend.push(route.request().url());await route.abort()});
 await page.addInitScript(()=>localStorage.setItem('ustime.home.v2','real-home-sentinel'));
 await page.goto('./dev-home.html');
 await expect(page).toHaveTitle('UsTime — готовый дом · Dev');
 await expect(page.locator('canvas[data-engine="phaser"]')).toBeVisible();
 await expect(page.getByRole('button',{name:'Большой телевизор',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Играть на PlayStation',exact:true}).click();
 await expect(page.locator('.actor-speech')).toContainText('Геймпады готовы');
 await page.getByRole('button',{name:'Взять чизбургер',exact:true}).click();
 await expect(page.locator('.actor-speech')).toContainText('горячий чизбургер');
 await page.locator('.room-scene').screenshot({path:'test-results/dev-finished-living.png'});
 await page.getByRole('group',{name:'Комнаты'}).getByRole('button',{name:'Спальня',exact:true}).click();
 await expect(page.getByRole('button',{name:'Огромная кровать',exact:true})).toBeVisible();
 await page.getByRole('group',{name:'Комнаты'}).getByRole('button',{name:'Оранжерея',exact:true}).click();
 for(const name of ['Сакура','Лимонное дерево','Японский клён'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
 await page.locator('.room-scene').screenshot({path:'test-results/dev-finished-greenhouse.png'});
 await expect(page.locator('.dev-collection article')).toHaveCount(13);
 await page.getByRole('button',{name:'Грядка с растениями',exact:true}).click();
 await expect(page.locator('.garden-plant')).toHaveCount(13);
 for(const bar of await page.locator('.garden-plant progress').all())await expect(bar).toHaveAttribute('value','1');
 await page.getByRole('button',{name:'Начать осмотр заново'}).click();
 await expect(page.getByRole('button',{name:'Большой телевизор',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('ustime.home.v2'))).toBe('real-home-sentinel');
 expect(backend).toEqual([]);
});

test('dev showcase fits a phone and supports fullscreen',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./dev-home.html');
 await expect(page.locator('canvas[data-engine="phaser"]')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Играть на весь экран'}).click();
 await expect(page.getByRole('dialog',{name:'Наш дом — игровой режим'})).toBeVisible();
 await page.getByRole('button',{name:'Выйти из полного экрана'}).click();
 await expect(page.getByRole('dialog',{name:'Наш дом — игровой режим'})).toHaveCount(0);
});
