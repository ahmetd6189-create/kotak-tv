import {teamName} from './follow-core';
import type {Entry,Guide,Program} from './iptv';
import {buildVoiceIndex,guideKey,matchVoice,normalized,programWindow,scheduleFor} from './catalog-tools';
import {metadataKey,type ImdbInfo} from './imdb';
export type AssistantResult={mode:'search'|'schedule'|'recommend'|'match';entries:Entry[];schedule?:{channel:Entry;programs:Program[]}[];message:string;teamQuery?:string;autoPlay?:Entry;future?:{channel:Entry;program:Program}};
const genres:[RegExp,RegExp][]=[[/macera/,/adventure|macera/],[/aksiyon/,/action|aksiyon/],[/komedi/,/comedy|komedi/],[/korku/,/horror|korku/],[/bilim kurgu/,/sci.?fi|bilim kurgu/],[/dram/,/drama?/],[/gerilim/,/thriller|gerilim/],[/animasyon/,/animation|animasyon/],[/belgesel/,/documentary|belgesel/],[/romantik/,/romance|romantik/]];
export function assistantIntent(spoken:string){const q=normalized(spoken);return /\b(?:mac|macini|maci)\b/.test(q)?'match':/ne var|yayin akisi|program akisi|yayinlari/.test(q)?'schedule':/oner|imdb|en yuksek|en iyi/.test(q)?'recommend':'search';}
export function assistantChannels(entries:Entry[],spoken:string){const q=normalized(spoken);if(assistantIntent(spoken)==='schedule'){const wanted=guideKey(q.replace(/\b(bugun|bu|aksam|yarin|simdi|de|da|te|ta|ne|var|yayin|akisi|program|kanalinda|kanalinin|yayinlari)\b/g,' '));return entries.filter(e=>e.kind==='live'&&wanted&&(guideKey(e.name).includes(wanted)||new RegExp(`^${guideKey(e.name)}(?:de|da|te|ta)$`).test(wanted)));}
 if(assistantIntent(spoken)==='match'){const seen=new Set<string>();return entries.filter(e=>e.kind==='live'&&/spor|sport|bein|s sport|a spor|trt\s*1|tv\s*8|türkiye|turkiye|ulusal/i.test(e.group+' '+e.name)).sort((a,b)=>Number(/bein|trt|s sport/i.test(b.name))-Number(/bein|trt|s sport/i.test(a.name))).filter(e=>{const key=e.playlistId+':'+guideKey(e.name);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,90);}
 return [];
}
function distinctChannels(values:{channel:Entry;programs:Program[]}[]){const seen=new Set<string>();return values.filter(x=>{const signature=guideKey(x.channel.name)+':'+x.programs[0]?.start;if(seen.has(signature))return false;seen.add(signature);return true;});}
export function assistantAnswer(index:ReturnType<typeof buildVoiceIndex>,spoken:string,guide:Guide={},metadata:Record<string,ImdbInfo>={},now=Date.now()):AssistantResult{
 const q=normalized(spoken);if(!q)return {mode:'search',entries:[],message:''};const intent=assistantIntent(spoken);
 if(intent==='schedule'){
  const channels=assistantChannels(index.map(v=>v.entry),spoken).slice(0,15);
  const schedule=distinctChannels(channels.map(channel=>({channel,programs:programWindow(scheduleFor(channel,guide),now,/aksam/.test(q)?'tonight':'day')})));
  return {mode:'schedule',entries:channels,schedule,message:!channels.length?'Bu kanal listende bulunamadı.':schedule.every(x=>!x.programs.length)?'Sağlayıcı bu kanal için program verisi göndermedi.':/aksam/.test(q)?'Bu akşamki yayınlar':'Önümüzdeki 24 saatin yayın akışı'};
 }
 if(intent==='recommend'){
  const wantsSeries=/dizi/.test(q),wantsMovie=/film/.test(q),genre=genres.find(([r])=>r.test(q))?.[1];
  const ranked=index.map(x=>x.entry).filter(e=>wantsSeries&&!wantsMovie?e.kind==='series'||e.kind==='episode':wantsMovie&&!wantsSeries?e.kind==='movie':e.kind!=='live').map(e=>({entry:e,info:metadata[metadataKey(e)],rating:metadata[metadataKey(e)]?.rating||e.imdbRating||0})).filter(x=>x.rating>0&&x.rating<=10&&(!genre||genre.test(normalized(`${x.entry.group} ${x.entry.genre||''} ${x.info?.genre||''}`)))).sort((a,b)=>b.rating-a.rating).slice(0,10).map(x=>({...x.entry,imdbRating:x.rating}));
  return {mode:'recommend',entries:ranked,message:ranked.length?'Listendeki IMDb puanlarına göre en yüksek puanlı içerikler':'Bu türde gerçek IMDb puanı bulunamadı. IMDb ayarlarından veri anahtarını ekleyebilirsin.'};
 }
 if(intent==='match'){
  const wanted=teamName(q.replace(/\b(bana|bugun|bu|aksam|mac|maci|macini|ac|oynat|izle|lutfen|hangi|kanalda|kanal|saat|kacta|ne|zaman)\b/g,' ')),terms=wanted.split(/\s+/).filter(Boolean);
  const schedule=distinctChannels(index.filter(x=>x.entry.kind==='live').map(x=>({channel:x.entry,programs:scheduleFor(x.entry,guide).filter(p=>p.end>now&&!/\b(arsiv|tekrar|ozet|nostalji|replay|highlights)\b/.test(normalized(p.title))&&terms.length&&terms.every(t=>guideKey(teamName(p.title)).includes(guideKey(t))))})).filter(x=>x.programs.length)).sort((a,b)=>a.programs[0].start-b.programs[0].start).slice(0,20);
  const live=schedule.filter(x=>x.programs.some(p=>p.start<=now&&p.end>now)).map(x=>x.channel);const shouldOpen=/\b(ac|oynat|izle)\b/.test(q);const future=schedule.flatMap(x=>x.programs.filter(p=>p.start>now).map(program=>({channel:x.channel,program}))).sort((a,b)=>a.program.start-b.program.start)[0];
  return {mode:'match',schedule,entries:live,teamQuery:wanted,message:live.length?'Maç şu anda bu kanalda.':future?'Maçın kanalı ve saati aşağıda. Takibe alalım mı?':'Maç mevcut EPG’de bulunamadı. Sağlayıcı bu programı göndermemiş olabilir.',autoPlay:live.length&&shouldOpen?live[0]:undefined,future:!live.length&&shouldOpen?future:undefined};
 }
 const entries=matchVoice(index,spoken);return {mode:'search',entries,message:entries.length?'Bulduğum içerikler':'Listende eşleşen içerik bulunamadı.',autoPlay:entries.length===1?entries[0]:undefined};
}

