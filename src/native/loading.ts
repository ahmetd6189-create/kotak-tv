import {loadCatalog,xtreamFromM3u,httpUrl,type Catalog,type Entry,type Kind,type PlaylistConfig} from './iptv';
export function mergeCatalog(previous:Entry[],incoming:Entry[],requested:Kind[]){const replace=new Set([...requested,...incoming.map(e=>e.kind)]);return [...previous.filter(e=>!replace.has(e.kind)),...incoming];}
/** Rebuild an Xtream address from secure account data, never store credentials in the browsing cache. */
export function restoreAddress(item:Entry,config:PlaylistConfig):Entry{
 if(item.uri||item.kind==='series')return item;
 const account=config.type==='xtream'?config:xtreamFromM3u(config);if(!account)return item;
 const prefix=`${config.id}-${item.kind}-`;if(!item.id.startsWith(prefix))return item;
 const id=item.id.slice(prefix.length);if(!/^\d+$/.test(id))return item;
 const ext=item.streamFormat||(item.kind==='live'?'ts':undefined);if(!ext||!/^(m3u8|ts|mp4|mkv|avi|mov)$/i.test(ext))return item;
 return {...item,uri:`${httpUrl(account.url).replace(/\/$/,'')}/${item.kind==='live'?'live':item.kind==='episode'?'series':'movie'}/${encodeURIComponent(account.username||'')}/${encodeURIComponent(account.password||'')}/${id}.${ext}`};
}
export async function quickCatalog(config:PlaylistConfig,parent:AbortSignal,onPartial:(catalog:Catalog)=>void|Promise<void>,kinds:('live'|'movie'|'series')[]=['live'],timeoutMs=20000){
 const controller=new AbortController();const abort=()=>controller.abort();parent.addEventListener('abort',abort);if(parent.aborted)abort();
 let timer:ReturnType<typeof setTimeout>;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Liste sunucusu zamanında yanıt vermedi. Mevcut kanallar kullanılabilir; yenileyerek tekrar deneyebilirsin.'));},timeoutMs);});
 try{return await Promise.race([loadCatalog(config,controller.signal,onPartial,{kinds,requestTimeoutMs:12000,categoryTimeoutMs:5000}),deadline]);}finally{clearTimeout(timer!);parent.removeEventListener('abort',abort);}
}
