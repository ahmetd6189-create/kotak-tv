import {toByteArray,fromByteArray} from 'base64-js';
import {gunzipSync,strFromU8,strToU8} from 'fflate';
import {providerApi,xtreamFromM3u,httpUrl,type Entry,type PlaylistConfig,type Guide,type Program} from './iptv';
import {guideKey} from './catalog-tools';
export function accountFor(config:PlaylistConfig){return config.type==='xtream'?config:xtreamFromM3u(config);}
export function streamId(item:Entry){return item.providerId||item.id.match(/-(?:live|movie|episode)-(\d+)$/)?.[1]||item.uri?.match(/\/(\d+)\.[a-z0-9]+(?:[?#]|$)/i)?.[1];}
const format=(value:unknown)=>typeof value==='string'&&/^(mp4|mkv|avi|mov|m3u8|ts|webm)$/i.test(value)?value.toLowerCase():undefined;
const playbackCache=new WeakMap<PlaylistConfig,Map<string,Entry>>();
export async function resolvePlayback(item:Entry,config?:PlaylistConfig,signal?:AbortSignal):Promise<Entry>{
 if(signal?.aborted)throw new Error('İşlem iptal edildi.');
 if(item.kind!=='movie'||!config)return item;
 if(item.uri&&item.playbackResolved)return item;const account=accountFor(config),id=streamId(item);if(!account||!id)return item;
 const cached=playbackCache.get(config)?.get(id);if(cached)return {...item,uri:cached.uri,streamFormat:cached.streamFormat,playbackResolved:true};
 const result=await providerApi(account,'get_vod_info',signal,{vod_id:id},1500) as {movie_data?:Record<string,unknown>;info?:Record<string,unknown>};
 const row=result.movie_data||{},info=result.info||{};const ext=format(row.container_extension)||format(info.container_extension)||item.streamFormat||format(item.uri?.match(/\.([a-z0-9]+)(?:[?#]|$)/i)?.[1]);
 const direct=typeof row.direct_source==='string'&&/^https?:\/\//i.test(row.direct_source)?httpUrl(row.direct_source):undefined;
 const uri=direct||(ext?`${httpUrl(account.url).replace(/\/$/,'')}/movie/${encodeURIComponent(account.username||'')}/${encodeURIComponent(account.password||'')}/${id}.${ext}`:item.uri);
 const resolved={...item,uri,streamFormat:ext,playbackResolved:true};let cache=playbackCache.get(config);if(!cache){cache=new Map();playbackCache.set(config,cache);}cache.set(id,resolved);if(cache.size>200)cache.delete(cache.keys().next().value!);return resolved;
}
export function movieSourceCandidates(item:Entry){
 const uri=item.uri;if(!uri)return [];
 // Provider metadata has priority; alternate containers are tried only for provider VOD routes.
 const candidates=[uri];if(item.kind==='movie'&&/\/movie\/.+\/\d+\.(mp4|mkv)(?:[?#]|$)/i.test(uri))candidates.push(uri.replace(/\.(mp4|mkv)(?=[?#]|$)/i,(_,ext)=>ext.toLowerCase()==='mp4'?'.mkv':'.mp4'));
 return candidates;
}
export function decodeEpgText(value:unknown){
 const text=typeof value==='string'?value:'';if(!text)return '';
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(text)||text.length%4!==0)return text;
 try{const decoded=strFromU8(toByteArray(text));return /[\u0000-\u0008\u000e-\u001f\ufffd]/.test(decoded)||fromByteArray(strToU8(decoded))!==text?text:decoded;}catch{return text;}
}
function epgTime(value:unknown){
 if(typeof value==='number'||typeof value==='string'&&/^\d{9,13}$/.test(value)){const n=Number(value);return n<1e12?n*1000:n;}
 if(typeof value!=='string')return NaN;
 const s=value.trim().replace(' ','T');return Date.parse(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)?s:s+'+03:00');
}
export function parseProviderEpg(result:unknown,now=Date.now()):Program[]{
 const data=result as {epg_listings?:unknown};const rows=Array.isArray(result)?result:Array.isArray(data?.epg_listings)?data.epg_listings:[];
 return rows.map((r:any)=>({title:decodeEpgText(r.title)||'Program',description:decodeEpgText(r.description),start:epgTime(r.start_timestamp??r.start),end:epgTime(r.stop_timestamp??r.end_timestamp??r.end??r.stop)})).filter(p=>Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.end>Math.max(now,p.start)&&p.start<now+86400000).sort((a,b)=>a.start-b.start);
}
export function scopeChannelGuide(item:Entry,programs:Program[]):Guide{const keys=[`${item.playlistId}:#${item.id}`,`${item.playlistId}:@${guideKey(item.name)}`];if(item.epgId)keys.push(`${item.playlistId}:${item.epgId}`,`${item.playlistId}:@${guideKey(item.epgId)}`);return Object.fromEntries(keys.map(k=>[k,programs]));}
const epgCache=new Map<string,{at:number;programs:Program[]}>();
let activeGuideRequests=0;
const guideWaiters:(()=>void)[]=[];
async function guideSlot(signal?:AbortSignal){if(activeGuideRequests>=3)await new Promise<void>((resolve,reject)=>{const ready=()=>{signal?.removeEventListener('abort',cancel);resolve();};const cancel=()=>{const i=guideWaiters.indexOf(ready);if(i>=0)guideWaiters.splice(i,1);reject(new Error('İşlem iptal edildi.'));};if(signal?.aborted){cancel();return;}guideWaiters.push(ready);signal?.addEventListener('abort',cancel,{once:true});});else activeGuideRequests++;return ()=>{const next=guideWaiters.shift();if(next)next();else activeGuideRequests--;};}
export async function loadChannelGuide(config:PlaylistConfig,item:Entry,signal?:AbortSignal,now=Date.now()):Promise<Guide>{
 const account=accountFor(config),id=streamId(item);if(!account||!id)return {};
 const key=`${config.id}:${id}`,cached=epgCache.get(key);if(cached&&now-cached.at<(cached.programs.length?5*60000:60000))return scopeChannelGuide(item,cached.programs);
 const release=await guideSlot(signal);try{
 let programs:Program[]=[];
 for(const action of ['get_simple_data_table','get_short_epg']){
  try{const response=await providerApi(account,action,signal,{stream_id:id,limit:'60'},4500);programs=parseProviderEpg(response,now);if(programs.length)break;}catch{if(signal?.aborted)throw new Error('İşlem iptal edildi.');}
 }
 if(!signal?.aborted)epgCache.set(key,{at:now,programs});if(epgCache.size>500)epgCache.delete(epgCache.keys().next().value!);return programs.length?scopeChannelGuide(item,programs):{};
 }finally{release();}
}
export async function requestGuideText(url:string,signal?:AbortSignal,timeoutMs=12000):Promise<string>{
 const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort);if(signal?.aborted)abort();
 let timer:ReturnType<typeof setTimeout>;const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('EPG sunucusu zamanında yanıt vermedi.'));},timeoutMs);});
 try{return await Promise.race([deadline,(async()=>{const response=await fetch(httpUrl(url),{signal:controller.signal});if(!response.ok)throw new Error(`EPG HTTP ${response.status}`);if(Number(response.headers.get('content-length'))>32*1024*1024)throw new Error('EPG dosyası çok büyük.');let data:Uint8Array<ArrayBufferLike>=new Uint8Array(await response.arrayBuffer());if(data.length>32*1024*1024)throw new Error('EPG dosyası çok büyük.');if(data[0]===31&&data[1]===139){const size=new DataView(data.buffer,data.byteOffset,data.byteLength).getUint32(data.length-4,true);if(size>64*1024*1024)throw new Error('Açılmış EPG verisi çok büyük.');data=gunzipSync(data);if(data.length>64*1024*1024)throw new Error('EPG verisi çok büyük.');}if(controller.signal.aborted)throw new Error('İşlem iptal edildi.');return strFromU8(data).replace(/^\uFEFF/,'');})()]);}finally{clearTimeout(timer!);signal?.removeEventListener('abort',abort);}
}

