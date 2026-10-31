/** Private photos live only in this tab's memory. Never persisted to browser storage. */
export class PhotoCache {
 private entries=new Map<string,{blob:Blob;expires:number}>();
 private pending=new Map<string,Promise<Blob>>();
 private controllers=new Set<AbortController>();
 private bytes=0;
 private generation=0;
 private active=0;
 private queue:(()=>void)[]=[];
 constructor(private maxBytes=24*1024*1024,private ttl=15*60000,private maxEntries=32,private concurrency=3){}
 private key(owner:string,path:string){return JSON.stringify([owner,path])}
 private remove(key:string){const entry=this.entries.get(key);if(entry){this.bytes-=entry.blob.size;this.entries.delete(key)}}
 peek(owner:string,path:string){const key=this.key(owner,path),entry=this.entries.get(key);if(!entry)return null;if(entry.expires<=Date.now()){this.remove(key);return null}this.entries.delete(key);this.entries.set(key,entry);return entry.blob}
 put(owner:string,path:string,blob:Blob){
  const key=this.key(owner,path);this.remove(key);
  if(!owner||blob.size>this.maxBytes)return;
  this.entries.set(key,{blob,expires:Date.now()+this.ttl});this.bytes+=blob.size;
  while(this.bytes>this.maxBytes||this.entries.size>this.maxEntries)this.remove(this.entries.keys().next().value!);
 }
 forget(owner:string,path:string){this.remove(this.key(owner,path))}
 get(owner:string,path:string,load:(signal:AbortSignal)=>Promise<Blob>):Promise<Blob>{
  if(!owner)return Promise.reject(new Error('Войдите снова'));
  const cached=this.peek(owner,path);if(cached)return Promise.resolve(cached);
  const key=this.key(owner,path),existing=this.pending.get(key);if(existing)return existing;
  const generation=this.generation,controller=new AbortController();this.controllers.add(controller);
  const task=new Promise<Blob>((resolve,reject)=>{
   const start=()=>{
    if(generation!==this.generation){this.controllers.delete(controller);reject(new Error('Сессия завершена'));return}
    this.active++;
    void load(controller.signal).then(blob=>{
     if(generation!==this.generation)throw new Error('Сессия завершена');
     this.put(owner,path,blob);resolve(blob);
    }).catch(reject).finally(()=>{this.controllers.delete(controller);this.active--;this.queue.shift()?.()});
   };
   if(this.active<this.concurrency)start();else this.queue.push(start);
  });
  this.pending.set(key,task);
  const cleanup=()=>{if(this.pending.get(key)===task)this.pending.delete(key)};
  void task.then(cleanup,cleanup);
  return task;
 }
 clear(){
  this.generation++;
  for(const controller of this.controllers)controller.abort();
  this.entries.clear();this.bytes=0;this.pending.clear();
  const queued=this.queue.splice(0);for(const start of queued)start();
 }
}
export const photoCache=new PhotoCache();
