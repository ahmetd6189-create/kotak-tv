import {teamName} from './follow-core';
import type {Entry,Guide,Program} from './iptv';
import {buildVoiceIndex,guideKey,matchVoice,normalized,programWindow,scheduleFor} from './catalog-tools';
import {metadataKey,type ImdbInfo} from './imdb';
export type AssistantResult={mode:'search'|'schedule'|'recommend'|'match';entries:Entry[];schedule?:{channel:Entry;programs:Program[]}[];message:string;teamQuery?:string;autoPlay?:Entry};
const genres:[RegExp,RegExp][]=[[/aksiyon/,/action|aksiyon/],[/komedi/,/comedy|komedi/],[/korku/,/horror|korku/],[/bilim kurgu/,/sci.?fi|bilim kurgu/],[/dram/,/drama?/],[/gerilim/,/thriller|gerilim/],[/animasyon/,/animation|animasyon/],[/belgesel/,/documentary|belgesel/],[/romantik/,/romance|romantik/]];
export function assistantAnswer(index:ReturnType<typeof buildVoiceIndex>,spoken:string,guide:Guide={},metadata:Record<string,ImdbInfo>={},now=Date.now()):AssistantResult{
 const q=normalized(spoken);if(!q)return {mode:'search',entries:[],message:''};
 if(/ne var|yayin akisi|program akisi|yayinlari/.test(q)){
  const channelQuery=q.replace(/\b(bugun|bu|aksam|yarin|simdi|de|da|te|ta|ne|var|yayin|akisi|program|kanalinda|kanalinin|yayinlari)\b/g,' ').trim();
  if(/\byarin\b/.test(q))return {mode:'schedule',entries:[],message:'Şu an 24 saatlik EPG tutuluyor. Yarın için eksiksiz yayın akışı bulunmayabilir.'};
  const wanted=guideKey(channelQuery);const channels=index.filter(x=>x.entry.kind==='live'&&wanted&&guideKey(x.entry.name).includes(wanted)).slice(0,10).map(x=>x.entry);
  const schedule=channels.map(channel=>({channel,programs:programWindow(scheduleFor(channel,guide),now,/aksam/.test(q)?'tonight':'day')}));
  return {mode:'schedule',entries:channels,schedule,message:!channels.length?'Bu kanal listende bulunamadı.':schedule.every(x=>!x.programs.length)?'Bu kanal için EPG alınamadı. XMLTV adresini kontrol et.':/aksam/.test(q)?'Bu akşamki yayınlar':'Önümüzdeki 24 saatin yayın akışı'};
 }
 if(/oner|imdb|en yuksek|en iyi/.test(q)){
  const series=/dizi/.test(q);const genre=genres.find(([r])=>r.test(q))?.[1];
  const ranked=index.map(x=>x.entry).filter(e=>series?e.kind==='series'||e.kind==='episode':e.kind==='movie').map(e=>({entry:e,info:metadata[metadataKey(e)],rating:metadata[metadataKey(e)]?.rating||e.imdbRating||0})).filter(x=>x.rating>0&&(!genre||genre.test(normalized(`${x.entry.group} ${x.info?.genre||''}`)))).sort((a,b)=>b.rating-a.rating).slice(0,10).map(x=>({...x.entry,imdbRating:x.rating}));
  return {mode:'recommend',entries:ranked,message:ranked.length?'Listendeki bilinen IMDb puanlarına göre en yüksek puanlı içerikler':'Bu türde puanı bilinen içerik bulunamadı. IMDb verilerini ayarlardan yükle.'};
 }
 if(/\bmac|macini|maci\b/.test(q)){
  const wanted=teamName(q.replace(/\b(bana|bugun|bu|aksam|mac|maci|macini|maci[nı]?|ac|oynat|izle|lutfen|hangi|kanalda|kanal|saat|kacta|ne|zaman)\b/g,' '));const terms=wanted.split(/\s+/).filter(Boolean);
  const schedule=index.filter(x=>x.entry.kind==='live').map(x=>({channel:x.entry,programs:scheduleFor(x.entry,guide).filter(p=>p.end>now&&terms.length&&terms.every(t=>guideKey(teamName(p.title)).includes(guideKey(t))))})).filter(x=>x.programs.length).slice(0,20);
  const live=schedule.filter(x=>x.programs.some(p=>p.start<=now&&p.end>now)).map(x=>x.channel);
  return {mode:'match',schedule,entries:live,teamQuery:wanted,message:live.length?'Maç şu anda bu kanalda. Takibe alalım mı?':schedule.length?'Maçın kanalı ve saati aşağıda. Takibe alalım mı?':'Maç EPG’de bulunamadı. EPG eksik veya yayın farklı isimde olabilir.',autoPlay:live.length===1&&/\b(ac|oynat|izle)\b/.test(q)?live[0]:undefined};
 }
 const entries=matchVoice(index,spoken);return {mode:'search',entries,message:entries.length?'Bulduğum içerikler':'Listende eşleşen içerik bulunamadı.',autoPlay:entries.length===1?entries[0]:undefined};
}
