import {homeUnits, type HomeLife} from '../roomLife';

export type KitchenStyle = 'sage' | 'clay';
export type Kitchen = {stage: number; style: KitchenStyle};
export const kitchenSteps = [
  {name: 'Место для кухни', action: 'Заложить основу', units: 0, note: 'Место выбрано. Заложите основу, затем возведите стены и поставьте шкафчики с чайником.'},
  {name: 'Основа готова', action: 'Построить стены', units: 1, note: 'Каркас уже стоит. Следующий шаг — стены и окно.'},
  {name: 'Стены и окно', action: 'Обустроить кухню', units: 2, note: 'Осталось поставить шкафчики, плиту и чайник.'},
  {name: 'Наша первая кухня', action: '', units: 2, note: 'Можно заварить чай и устроить первый вечер на своей кухне.'},
] as const;
export function kitchenOf(home: HomeLife): Kitchen {
  return home.kitchen ?? {stage: homeUnits(home) >= 3 ? 3 : 0, style: 'sage'};
}
export function advanceKitchen(home: HomeLife, stage: number, style: KitchenStyle): boolean {
  const current = kitchenOf(home);
  if (!Number.isInteger(stage) || stage !== current.stage + 1 || stage > 3 ||
    !['sage', 'clay'].includes(style) || homeUnits(home) < kitchenSteps[current.stage].units ||
    (current.stage > 0 && style !== current.style)) return false;
  home.kitchen = {stage, style};
  return true;
}
