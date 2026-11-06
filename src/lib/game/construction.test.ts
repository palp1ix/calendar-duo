import {expect,it} from 'vitest';
import {newHome} from '../roomLife';
import {advanceKitchen,kitchenOf} from './construction';

it('starts small and builds sequentially using earned progress, keeping the chosen style',()=>{
  const home=newHome();
  expect(kitchenOf(home).stage).toBe(0);
  expect(advanceKitchen(home,2,'sage')).toBe(false);
  expect(advanceKitchen(home,1,'clay')).toBe(true);
  expect(advanceKitchen(home,1,'clay')).toBe(false);
  expect(advanceKitchen(home,2,'clay')).toBe(false);
  home.progressUnits=1;
  expect(advanceKitchen(home,2,'sage')).toBe(false);
  expect(advanceKitchen(home,2,'clay')).toBe(true);
  expect(advanceKitchen(home,3,'clay')).toBe(false);
  home.progressUnits=2;
  expect(advanceKitchen(home,3,'clay')).toBe(true);
  expect(advanceKitchen(home,4,'clay')).toBe(false);
});
it('preserves a furnished home and its decorations when upgrading',()=>{
  const home=newHome();home.progressUnits=6;home.items.living=['books'];
  expect(kitchenOf(home)).toEqual({stage:3,style:'sage'});
  expect(home.items.living).toEqual(['books']);
  home.kitchen={stage:1,style:'clay'};
  expect(kitchenOf(home)).toEqual({stage:1,style:'clay'});
});
