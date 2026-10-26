export const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
export function dayKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function addDays(d:Date,n:number){const r=new Date(d);r.setDate(r.getDate()+n);return r}
export function at(day:string,time:string){const [h,m]=time.split(':');return new Date(`${day}T${h.padStart(2,'0')}:${m.padStart(2,'0')}:00`)}
export function dateLabel(s:string){return new Date(s).toLocaleDateString('ru',{day:'numeric',month:'long',weekday:'short'})}
export function clock(s:string|Date){return new Date(s).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}
export function countdown(s:string,now=Date.now()){const m=Math.max(0,Math.floor((new Date(s).getTime()-now)/60000));return {days:Math.floor(m/1440),hours:Math.floor(m%1440/60),minutes:m%60}}
export function weekStart(d:Date){return addDays(d,-((d.getDay()+6)%7))}
