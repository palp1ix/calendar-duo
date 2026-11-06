import {kitchenOf} from './construction';
import {catalog, locations, type HomeLife, type ItemId, type Location, type PlantId, homeUnits, seeds} from '../roomLife';
export type HomeProject = {id:string;name:string;note:string;result:string;location:Location;icon:string;kind:'kitchen'|'decor'|'garden';items:ItemId[];species?:PlantId;unlock:number};
export const projects:HomeProject[] = [
  {id:'big-screen',name:'Домашний кинотеатр',note:'Включить большой экран и посмотреть что-нибудь вдвоём.',result:'Большой телевизор · нажмите на экран для просмотра',location:'living',icon:'television',kind:'decor',items:['television'],unlock:3},
  {id:'playstation',name:'Вечер с PlayStation',note:'Выбрать кооператив и поделить два геймпада.',result:'PlayStation, два геймпада и большой телевизор',location:'living',icon:'playstation',kind:'decor',items:['television','playstation'],unlock:4},
  {id:'king-bed',name:'Огромная кровать',note:'Места хватит вам двоим. Кошка всё равно займёт середину.',result:'Большая кровать с двумя подушками вместо обычной',location:'bedroom',icon:'king-bed',kind:'decor',items:['king-bed'],unlock:3},
  {id:'burger-machine',name:'Чизбургерный автомат',note:'Перекус рядом, даже когда лень готовить.',result:'Автомат в гостиной · нажмите, чтобы взять чизбургер',location:'living',icon:'burger-machine',kind:'decor',items:['burger-machine'],unlock:5},
  {id:'sakura',name:'Сакура под стеклом',note:'Своё маленькое дерево с розовым цветением.',result:'Именная сакура в кадке · растёт в теплице',location:'greenhouse',icon:'sakura',kind:'garden',items:[],species:'sakura',unlock:3},
  {id:'lemon-tree',name:'Лимонный сад',note:'Яркие лимоны посреди зелёной кроны.',result:'Лимонное дерево в кадке · растёт в теплице',location:'greenhouse',icon:'lemon-tree',kind:'garden',items:[],species:'lemon-tree',unlock:5},
  {id:'japanese-maple',name:'Красный клён',note:'Кусочек осени, который всегда рядом.',result:'Японский клён в кадке · растёт в теплице',location:'greenhouse',icon:'japanese-maple',kind:'garden',items:[],species:'japanese-maple',unlock:7},
  {id:'kitchen',name:'Кухня для двоих',note:'Место для первого чая и длинных разговоров.',result:'Шкафчики, плита и чайник · 3 этапа',location:'living',icon:'tea',kind:'kitchen',items:[],unlock:0},
  {id:'candle-evening',name:'Вечер при свечах',note:'Тёплый свет вместо большого верхнего.',result:'Свечи и мягкая подушка',location:'living',icon:'candles',kind:'decor',items:['candles','cushion'],unlock:2},
  {id:'reading',name:'Читальный уголок',note:'Забраться с книгой и никуда не торопиться.',result:'Книги, подушка и свечи',location:'living',icon:'books',kind:'decor',items:['books','cushion','candles'],unlock:4},
  {id:'autumn',name:'Осенний вечер',note:'Дом готов к дождю, чаю и страшным историям.',result:'Тыква-фонарь, привидение и гирлянда',location:'living',icon:'pumpkin',kind:'decor',items:['pumpkin','ghost','garland'],unlock:6},
  {id:'gallery',name:'Наши маленькие горы',note:'Уголок, который напоминает о прогулках.',result:'Картина с горами и книги',location:'living',icon:'picture',kind:'decor',items:['picture','books'],unlock:7},
  {id:'movie',name:'Киновечер на полу',note:'Разложить подушки и устроиться поближе.',result:'Лоскутный коврик, подушка и свечи',location:'living',icon:'rug',kind:'decor',items:['rug','cushion','candles'],unlock:9},
  {id:'bedtime',name:'Ещё пять минуточек',note:'Мягкий свет и уют рядом с кроватью.',result:'Подушка и свечи в спальне',location:'bedroom',icon:'bedroom',kind:'decor',items:['cushion','candles'],unlock:2},
  {id:'dreams',name:'Комната тихих историй',note:'Почитать перед сном и помечтать о горах.',result:'Книги, картина и бумажный фонарь',location:'bedroom',icon:'lantern',kind:'decor',items:['books','picture','lantern'],unlock:11},
  {id:'flowers',name:'Цветочный сад',note:'Вырастить маленькое солнце под стеклом.',result:'Бархатцы с вашим собственным именем',location:'greenhouse',icon:'marigold',kind:'garden',items:[],species:'marigold',unlock:3},
  {id:'herbs',name:'Травы для чая',note:'Зелёная грядка для вашей будущей кухни.',result:'Именная мята в уличной теплице',location:'greenhouse',icon:'mint',kind:'garden',items:[],species:'mint',unlock:3},
  {id:'desert',name:'Колючий друг',note:'Небольшой сад с большим характером.',result:'Кактус, которому вы дадите имя',location:'greenhouse',icon:'cactus',kind:'garden',items:[],species:'cactus',unlock:3},
  {id:'glass-lights',name:'Огоньки под стеклом',note:'Превратить теплицу в место вечерних прогулок.',result:'Бумажный фонарь и тыква среди грядок',location:'greenhouse',icon:'greenhouse',kind:'decor',items:['lantern','pumpkin'],unlock:11},
];
export function projectUnlock(project:HomeProject){return Math.max(project.unlock,locations.find(l=>l.id===project.location)!.unlock,project.species?seeds.find(s=>s.id===project.species)!.unlock:0,...project.items.map(id=>catalog.find(i=>i.id===id)!.unlock))}
export function projectReady(home:HomeLife,project:HomeProject){return homeUnits(home)>=projectUnlock(project)}
export function projectComplete(home:HomeLife,project:HomeProject){return project.kind==='kitchen'?kitchenOf(home).stage===3:project.kind==='garden'?home.plants.some(p=>p.species===project.species):project.items.every(id=>home.items[project.location].includes(id))}
