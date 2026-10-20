import type { Entry, Guide, Program } from './iptv';
export function normalized(value:string){return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim();}
export function mediaTitle(name:string){return name.replace(/\bS\d+\s*E\d+\b.*$/i,'').replace(/\b\d+\s*\.\s*(sezon|bolum|bölüm).*$/i,'').replace(/\((?:TR|EN|DE|FHD|HD|4K|\d{4})\)/gi,'').replace(/\b(?:2160p|1080p|720p|4K|FHD|UHD)\b/gi,'').trim();}
export function rankedMedia(entries:Entry[],kind:'movie'|'series',limit=20){
 const seen=new Set<string>();
 return entries.filter(e=>kind==='movie'?e.kind==='movie':e.kind==='series'||e.kind==='episode')
 .filter(e=>typeof e.imdbRating==='number'&&e.imdbRating>=7&&e.imdbRating<=10)
 .sort((a,b)=>(b.imdbRating||0)-(a.imdbRating||0)).filter(e=>{const key=normalized(mediaTitle(e.name));if(seen.has(key))return false;seen.add(key);return true;}).slice(0,limit).map(e=>({...e,name:mediaTitle(e.name)}));
}
export function candidateMedia(entries:Entry[],limit=40){
 const out:Entry[]=[];const seen=new Set<string>();
 for(const kind of ['movie','series'] as const){let count=0;for(const e of entries){if(kind==='movie'?e.kind!=='movie':e.kind!=='series'&&e.kind!=='episode')continue;const key=kind+normalized(mediaTitle(e.name));if(seen.has(key))continue;seen.add(key);out.push(e);if(++count>=limit/2)break;}}
 return out;
}
export function buildVoiceIndex(entries:Entry[]){
 const seen=new Set<string>();return entries.map(entry=>({entry,name:normalized(mediaTitle(entry.name))})).filter(item=>{const key=(item.entry.kind==='episode'?'series':item.entry.kind)+':'+item.name;if(seen.has(key))return false;seen.add(key);return true;});
}
export function matchVoice(index:ReturnType<typeof buildVoiceIndex>,spoken:string){
 const query=normalized(spoken).replace(/\b(?:bana|ac|oynat|izle|istiyorum|lutfen|kanalini|kanali|kanal|filmini|filmi|film|dizisini|dizisi|dizi|adli|adindaki|adi|adini|bul|getir|goster|acarmisin|acar|misin)\b/g,' ').replace(/\s+/g,' ').trim();
 if(!query)return [];
 const tokens=query.split(' ').filter(Boolean);return index.filter(e=>e.name.includes(query)||query.includes(e.name)||tokens.every(t=>e.name.includes(t))||guideKey(e.name)===guideKey(query)).sort((a,b)=>(Number(b.name===query)-Number(a.name===query))||a.name.length-b.name.length).slice(0,30).map(e=>e.entry);
}
export function voiceMatches(entries:Entry[],spoken:string){return matchVoice(buildVoiceIndex(entries),spoken);}
export function guideKey(s:string){return normalized(s).replace(/\b(?:sd|hd|fhd|uhd|4k)\b/g,'').replace(/\s+/g,'').replace(/(?:uhd|fhd|hd|sd|4k)$/,'');}
export function scheduleFor(item:Entry,guide:Guide):Program[]{return guide[`${item.playlistId}:#${item.id}`] || guide[`${item.playlistId}:${item.epgId}`] || guide[`${item.playlistId}:@${guideKey(item.epgId||'')}`] || guide[`${item.playlistId}:@${guideKey(item.name)}`] || [];}
export function programWindow(list:Program[],now:number,window:'now'|'tonight'|'day'){
 if(window==='now')return list.filter(p=>p.start<=now&&p.end>now);
 if(window==='day')return list.filter(p=>p.end>now&&p.start<now+86400000);
 const values=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
 const start=Date.UTC(Number(values.year),Number(values.month)-1,Number(values.day),15); // 18:00 Türkiye
 const end=start+9*3600000; // 03:00 Türkiye
 return list.filter(p=>p.end>Math.max(now,start)&&p.start<end);
}

/** Provider fallback is explicitly attributed by the UI. */
export function catalogScore(item:Entry){const value=item.imdbRating??item.rating;return typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=10?value:0;}
export function displayRanked(entries:Entry[],kind:'movie'|'series',limit=20){const seen=new Set<string>();return entries.filter(e=>kind==='movie'?e.kind==='movie':e.kind==='series'||e.kind==='episode').filter(e=>catalogScore(e)>0).sort((a,b)=>catalogScore(b)-catalogScore(a)).filter(e=>{const key=normalized(mediaTitle(e.name));if(seen.has(key))return false;seen.add(key);return true;}).slice(0,limit).map(e=>({...e,name:mediaTitle(e.name)}));}
export function releaseTime(item:Entry){const value=item.released||item.name.match(/\b(?:19|20)\d{2}\b/)?.[0];if(!value)return 0;const time=Date.parse(value);return Number.isFinite(time)?time:0;}
export function sortedCatalog(entries:Entry[],sort:'imdb'|'release'|'name'|'added'){
 return [...entries].sort((a,b)=>sort==='imdb'?catalogScore(b)-catalogScore(a):sort==='release'?releaseTime(b)-releaseTime(a):sort==='added'?(b.added||0)-(a.added||0):a.name.localeCompare(b.name,'tr'));
}
