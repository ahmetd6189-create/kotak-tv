import type { Entry, Guide } from './iptv';
import { readSnapshot, type Snapshot } from './offline';
export interface KeyValueStore { getItem(key: string): Promise<string|null>; setItem(key:string,value:string):Promise<void>; removeItem(key:string):Promise<void>; }
type Manifest = {version:2; savedAt:number; keys:string[]};
type RecordRow = {entry:Entry} | {channel:string; programs:Guide[string]} | {alias:string;target:string};
const pause = () => new Promise<void>(resolve=>setTimeout(resolve,0));
let sequence=0;
export function createCacheStore(store:KeyValueStore,ttlMs=86400000) {
 const queues = new Map<string,Promise<void>>();
 const prefix=(id:string)=>`kotak.cache.v2.${id}`;
 async function manifest(id:string):Promise<Manifest|null> {
  try { const m=JSON.parse(await store.getItem(prefix(id)) || 'null') as Manifest|null;
   return m?.version===2 && Number.isFinite(m.savedAt) && Array.isArray(m.keys) && m.keys.length<=10000 && m.keys.every(k=>typeof k==='string'&&k.startsWith(prefix(id)+'.')) ? m:null;
  }catch{return null;}
 }
 async function read(id:string):Promise<Snapshot|null> {
  const meta=await manifest(id);
  if(!meta) {try{return readSnapshot(await store.getItem(`kotak.cache.${id}`));}catch{return null;}}
  if(meta.savedAt>Date.now()||Date.now()-meta.savedAt>=ttlMs) return null;
  const entries:Entry[]=[];const guide:Guide={};const aliases:{alias:string;target:string}[]=[];
  try {
   for(let i=0;i<meta.keys.length;i+=8){
    const values=await Promise.all(meta.keys.slice(i,i+8).map(k=>store.getItem(k)));
    for(const raw of values){
     if(raw===null)return null;
     for(const row of JSON.parse(raw) as RecordRow[]) {
      if('entry' in row)entries.push(row.entry);
      else if('alias' in row)aliases.push(row);else (guide[row.channel] ||= []).push(...row.programs);
     }
    }
    await pause();
   }
   for(const row of aliases)if(guide[row.target])guide[row.alias]=guide[row.target];
   return {version:1,savedAt:meta.savedAt,entries,guide};
  }catch{return null;}
 }
 async function write(id:string,entries:Entry[],guide?:Guide){
  const old=await manifest(id);
  const prior=guide===undefined?await read(id):null;
  const source=guide??prior?.guide??{};
  const savedAt=Date.now();const generation=`${savedAt}-${++sequence}`;
  const keys:string[]=[];let pieces:string[]=[];let length=2;
  async function flush(){if(!pieces.length)return;const key=`${prefix(id)}.${generation}.${keys.length}`;
   await store.setItem(key,'['+pieces.join(',')+']');keys.push(key);pieces=[];length=2;await pause();
  }
  async function append(row:RecordRow){const text=JSON.stringify(row);if(length+text.length+1>48000)await flush();pieces.push(text);length+=text.length+1;}
  try {
   for(let i=0;i<entries.length;i++){
    const e=entries[i];
    // No uri, headers or logo URL in the browsing cache.
    const entry:Entry={id:e.id,playlistId:e.playlistId,name:e.name.slice(0,512),group:e.group.slice(0,256),logo:'',kind:e.kind,epgId:e.epgId?.slice(0,256),seriesId:e.seriesId?.slice(0,256),imdbRating:e.imdbRating,imdbId:e.imdbId,rating:e.rating,streamFormat:e.streamFormat||e.uri?.match(/\.(m3u8|ts|mp4|mkv)(?:[?#]|$)/i)?.[1]?.toLowerCase()};
    await append({entry});if(i%300===0)await pause();
   }
   let channelCount=0;const sharedPrograms=new Map<Guide[string],string>();
   for(const [channel,programs] of Object.entries(source)){
    const alias=sharedPrograms.get(programs);if(alias){await append({alias:channel,target:alias});continue;}sharedPrograms.set(programs,channel);
    const current=programs.filter(p=>p.end>savedAt&&p.start<savedAt+86400000).map(p=>({...p,title:p.title.slice(0,512)}));
    for(let i=0;i<current.length;i+=50)await append({channel,programs:current.slice(i,i+50)});
    if(++channelCount%100===0)await pause();
   }
   await flush();
   await store.setItem(prefix(id),JSON.stringify({version:2,savedAt,keys}));
  }catch(error){await Promise.all(keys.map(k=>store.removeItem(k).catch(()=>{})));throw error;}
  // Only remove the previous generation after committing the complete new index.
  for(const key of old?.keys||[])await store.removeItem(key).catch(()=>{});
  await store.removeItem(`kotak.cache.${id}`).catch(()=>{});
 }
 function save(id:string,entries:Entry[],guide?:Guide):Promise<void>{
  const task=(queues.get(id)||Promise.resolve()).catch(()=>{}).then(()=>write(id,entries,guide));
  queues.set(id,task);void task.finally(()=>{if(queues.get(id)===task)queues.delete(id);}).catch(()=>{});return task;
 }
 async function remove(id:string){await queues.get(id)?.catch(()=>{});const m=await manifest(id);
  await store.removeItem(prefix(id));for(const key of m?.keys||[])await store.removeItem(key);await store.removeItem(`kotak.cache.${id}`);
 }
 return {save,read,remove};
}
