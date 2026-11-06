import {useState} from 'react';
import {homeUnits, type HomeLife} from '../../lib/roomLife';
import {kitchenOf, kitchenSteps, type KitchenStyle} from '../../lib/game/construction';

export function KitchenPreview({style='sage'}:{style?:KitchenStyle}) {
  return <svg viewBox="0 0 160 100" aria-hidden="true" className="kitchen-preview" shapeRendering="crispEdges"><path fill="#eee3ca" d="M8 8h144v84H8z"/><path fill="#b9d5ce" d="M58 16h44v32H58z"/><path stroke="#fff8e7" strokeWidth="4" d="M80 16v32M58 32h44"/><path fill={style==='sage'?'#93a77f':'#c58970'} d="M16 56h128v32H16zM16 16h30v32H16zM114 16h30v32h-30z"/><path fill="#79684f" d="M12 54h136v6H12z"/><path stroke="#eee3ca" strokeWidth="2" d="M48 60v28m32-28v28m32-28v28"/><path fill="#444f47" d="M100 51h32v3h-32z"/><path fill="#d4a75e" d="M28 42h12v12H28zM40 44h4v7h-4z"/></svg>;
}
export type Placement = 'catalog'|'preview'|'confirmed';
export default function KitchenProject({home,busy,demo,placement,onPlacement,style,onStyle,onBuild,onTea,onGarden,onDecor}:{home:HomeLife;busy:boolean;demo:boolean;placement:Placement;onPlacement:(value:Placement)=>void;style:KitchenStyle;onStyle:(value:KitchenStyle)=>void;onBuild:(stage:number,style:KitchenStyle,all:boolean)=>void;onTea:()=>void;onGarden:()=>void;onDecor:()=>void}) {
  const kitchen=kitchenOf(home),step=kitchenSteps[kitchen.stage], [all,setAll]=useState(false);
  const remaining=Math.max(0,step.units*100-Math.floor((home.progressValue??homeUnits(home))*100));
  const choosing=kitchen.stage===0&&placement==='catalog',placing=kitchen.stage===0&&placement==='preview';
  return <section data-stage={kitchen.stage} className="kitchen-project" aria-label="Строительство кухни">
    <div className="kitchen-copy"><small>Мастерская дома</small><h3>{choosing?'Что создадим вместе?':placing?'Примерьте кухню в доме':step.name}</h3><p>{choosing?'Начните с кухни для чаепитий. Встречи и время вместе дают искры — они открывают следующие этапы стройки.':placing?'На сцене появился полупрозрачный эскиз. Нажмите на него, чтобы подтвердить место у стены.':step.note}</p></div>
    <ol className="project-route" aria-label="Путь строительства">{['Выбрать проект','Примерить место','Построить и пользоваться'].map((s,i)=><li key={s} aria-current={(choosing?0:placing?1:2)===i?'step':undefined}><span>{i+1}</span>{s}</li>)}</ol>
    {choosing?<p className="project-start-hint">Откройте «Проекты дома» выше и выберите кухню для примерки. Другие проекты помогут обустроить комнаты и теплицу.</p>:<>
      <div className="project-result"><KitchenPreview style={kitchen.stage? kitchen.style:style}/><div><b>В итоге — ваша кухня для чаепитий</b><span>У стены слева · проход остаётся свободным</span></div></div>
      {kitchen.stage===0&&<fieldset className="kitchen-styles"><legend>Отделка шкафчиков</legend>{(['sage','clay'] as const).map(s=><button key={s} aria-pressed={style===s} onClick={()=>onStyle(s)}><i style={{background:s==='sage'?'#93a77f':'#c58970'}}/>{s==='sage'?'Зелёные · шалфей':'Тёплые · терракота'}</button>)}</fieldset>}
      <div className="kitchen-controls">{placing?<><p className="placement-instruction">Шаг 2: подтвердите эскиз прямо в комнате ↓</p><button className="secondary" onClick={()=>onPlacement('catalog')}>Назад к проектам</button></>:kitchen.stage<3?<>
        <ol className="build-steps" aria-label="Этапы кухни">{['Основа · бесплатно','Стены · от 100 искр','Обустройство · от 200 искр'].map((name,i)=><li key={name} className={kitchen.stage>i?'complete':''} aria-current={kitchen.stage===i?'step':undefined}><span>{kitchen.stage>i?'✓':i+1}</span>{name}</li>)}</ol>
        <fieldset className="build-methods"><legend>Как строить?</legend><label><input type="radio" name="build-method" checked={!all} onChange={()=>setAll(false)}/> По одному этапу</label><label><input type="radio" name="build-method" checked={all} onChange={()=>setAll(true)}/> Все доступные подряд</label></fieldset>
        <small>Искры — порог открытия, они не тратятся. {all?'Стройка остановится, если не хватит искр.':'После этапа увидите, как меняется дом.'}</small>
        <button className="primary" disabled={busy||demo||remaining>0} onClick={()=>onBuild(kitchen.stage+1,kitchen.stage?kitchen.style:style,all)}>{busy?'Строим…':all?'Построить доступные этапы':step.action}</button>
        {demo?<small>Войдите в общий дом, чтобы сохранить постройку</small>:remaining>0&&<small>Ещё {remaining} искр до следующего этапа. Запланируйте встречу или проведите время вместе.</small>}
        {kitchen.stage===0&&<button className="secondary" onClick={()=>onPlacement('preview')}>Вернуться к примерке</button>}
      </>:<><p>Кухня готова. Нажмите на чайник в комнате или пригласите друг друга на чай.</p><button className="primary" onClick={onTea}>Первый чай на кухне</button><button className="secondary" onClick={onGarden}>Дальше — сад в теплице</button></>}</div>
    </>}
  </section>;
}
