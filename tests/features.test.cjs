const {test}=require('node:test');const assert=require('node:assert/strict');const {mkdtempSync,rmSync}=require('node:fs');const {join}=require('node:path');const {tmpdir}=require('node:os');
const dir=mkdtempSync(join(tmpdir(),'kotak-features-'));
require('esbuild').buildSync({stdin:{contents:`export * from './src/native/loading'; export * from './src/native/json-array'; export * from './src/native/invites'; export * from './src/native/follow-core'; export * from './src/native/cast'; export * from './src/native/assistant'; export * from './src/native/catalog-tools'; export * from './src/native/recovery'; export * from './src/native/imdb'; export * from './src/native/iptv';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:join(dir,'core.cjs'),logLevel:'error'});
const core=require(join(dir,'core.cjs'));rmSync(dir,{recursive:true});
const base={id:'1',playlistId:'p',name:'Film',group:'Film',logo:'',kind:'movie',uri:'https://host/user/secret/movie.mp4'};
test('IMDb rails exclude live TV, unknown scores and low scores; series episodes deduplicate',()=>{
 const items=[{...base,id:'live',kind:'live',imdbRating:10},{...base,id:'unknown'},{...base,id:'low',imdbRating:6},{...base,id:'high',imdbRating:9},{...base,id:'other',name:'Other',imdbRating:8}];
 assert.deepEqual(core.rankedMedia(items,'movie').map(e=>e.id),['high','other']);
 assert.equal(core.rankedMedia([{...base,name:'Çukur S01 E01',kind:'episode',imdbRating:8},{...base,id:'2',name:'Çukur S01 E02',kind:'episode',imdbRating:8}],'series').length,1);
});
test('Turkish spoken commands identify the right channel, movie or deduplicated series',()=>{
 const items=[{...base,id:'tv',name:'TRT 1',kind:'live'},{...base,name:'Interstellar',kind:'movie'},{...base,id:'ep1',name:'Çukur S01 E01',kind:'episode'},{...base,id:'ep2',name:'Çukur S01 E02',kind:'episode'}];
 assert.equal(core.voiceMatches(items,'TRT 1 kanalını aç')[0].id,'tv');
 assert.equal(core.voiceMatches(items,'Interstellar filmini aç')[0].kind,'movie');
 assert.deepEqual(core.voiceMatches(items,'Çukur dizisini aç').map(e=>e.id),['ep1']);
});
test('EPG display-name aliases match channels without tvg-id; evening uses Turkey time',()=>{
 const now=Date.UTC(2026,9,19,13);const xml='<tv><channel id="provider-1"><display-name>TRT 1 HD</display-name></channel><programme channel="provider-1" start="20261019183000 +0300" stop="20261019193000 +0300"><title>Akşam</title></programme></tv>';
 const guide=core.parseGuide(xml,now);const scoped=Object.fromEntries(Object.entries(guide).map(([k,v])=>['p:'+k,v]));
 const schedule=core.scheduleFor({...base,name:'TRT 1',kind:'live'},scoped);
 assert.equal(schedule[0].title,'Akşam');assert.equal(core.programWindow(schedule,now,'tonight').length,1);
});
test('Recovery continues beyond three retries with bounded backoff, detects VOD stalls and respects pause/background',()=>{
 const recover=new core.StreamRecovery(100000);const input={position:0,status:'error',playing:false,live:true,active:true};
 let now=100001;for(let i=0;i<8;i++){assert.equal(recover.observe(now,input),'retry');assert.equal(recover.observe(now+1,input),'none');assert.ok(recover.next-now<=30000);now=recover.next+1;}
 recover.paused=true;assert.equal(recover.observe(now,input),'none');recover.paused=false;assert.equal(recover.observe(now,{...input,active:false}),'none');
 const vod=new core.StreamRecovery(100000);assert.equal(vod.observe(108001,{...input,status:'readyToPlay',playing:true,live:false}),'retry');
 const eof=new core.StreamRecovery(100000);assert.equal(eof.observe(100001,{...input,status:'readyToPlay',ended:true}),'retry');assert.equal(eof.observe(100002,{...input,status:'readyToPlay',live:false,ended:true}),'none');
});
test('Audio selection retains explicit track and otherwise prefers Turkish, then any available audio',()=>{
 const tracks=[{id:'en',language:'en'},{id:'tr',language:'tr-TR'}];
 assert.equal(core.preferredAudio(tracks,null).id,'tr');assert.equal(core.preferredAudio(tracks,tracks[0]).id,'en');assert.equal(core.preferredAudio([tracks[0]],null).id,'en');assert.equal(core.preferredAudio([],null),null);
});
test('OMDb supplies only matching type/title and actual IMDb rating, never IPTV credentials',async()=>{
 const previous=global.fetch;let url;
 try{global.fetch=async input=>{url=new URL(String(input));return new Response(JSON.stringify({Response:'True',Type:'movie',Title:'Film',imdbID:'tt123456',imdbRating:'8.7',Poster:'https://image.example/poster.jpg'}))};
  const data=await core.lookupImdb(base,'own-key');assert.equal(data.rating,8.7);assert.equal(url.searchParams.get('t'),'Film');assert.equal(url.href.includes('secret'),false);
  assert.equal(await core.lookupImdb({...base,name:'Unrelated'},'own-key'),null);
 }finally{global.fetch=previous;}
});

test('Assistant answers EPG questions without opening the channel and searches current matches',()=>{
 const now=Date.now();const channel={...base,id:'trt',name:'TRT 1 HD',kind:'live',epgId:'trt'};const p={title:'Galatasaray - Fenerbahçe Maçı',start:now-10000,end:now+3600000};const guide={'p:trt':[p]};const index=core.buildVoiceIndex([channel]);
 const schedule=core.assistantAnswer(index,"bugün TRT1’de ne var",guide,{},now);assert.equal(schedule.mode,'schedule');assert.equal(schedule.schedule[0].programs[0].title,p.title);assert.equal(schedule.autoPlay,undefined);
 assert.equal(core.assistantAnswer(index,'bana Galatasaray maçını aç',guide,{},now).autoPlay.id,'trt');
 const upcoming=core.assistantAnswer(index,'Galatasaray maçını aç',{'p:trt':[{...p,start:now+10000}]},{},now);assert.equal(upcoming.autoPlay,undefined);assert.equal(upcoming.schedule.length,1);
});
test('Assistant recommends actual highest IMDb score in requested genre and separates series/live',()=>{
 const low={...base,name:'Low',imdbRating:7.1,group:'Aksiyon'};const high={...base,id:'high',name:'High',imdbRating:9.2,group:'Aksiyon'};const series={...base,id:'series',name:'Series',kind:'series',imdbRating:9.9,group:'Dram'};
 const index=core.buildVoiceIndex([low,high,series,{...high,id:'live',kind:'live',imdbRating:10}]);
 assert.deepEqual(core.assistantAnswer(index,'IMDb puanı en yüksek aksiyon filmi öner').entries.map(e=>e.id),['high','1']);assert.equal(core.assistantAnswer(index,'en iyi dizi öner').entries[0].id,'series');assert.equal(core.assistantAnswer(index,'korku filmi öner').entries.length,0);
});

test('Team question resolves RealMadrid genitive, gives schedule and never auto-plays without an open command',()=>{
 const now=Date.now(),channel={...base,name:'beIN 1',kind:'live',epgId:'sport'},program={title:'Real Madrid - Barcelona',start:now-1000,end:now+3600000};const index=core.buildVoiceIndex([channel]);
 const answer=core.assistantAnswer(index,"RealMadridin maçı hangi kanalda",{'p:sport':[program]},{},now);assert.equal(answer.entries[0].name,'beIN 1');assert.equal(answer.teamQuery,'real madrid');assert.equal(answer.autoPlay,undefined);
 assert.equal(core.assistantAnswer(index,"Real Madrid maçını aç",{'p:sport':[program]},{},now).autoPlay.id,'1');
});
test('Follow diffs ignore initial library, distinguish series and report only genuinely new movie/episodes',()=>{
 const rule={id:'f',kind:'series',label:'Çukur',playlistId:'p',leadMinutes:15,createdAt:0};const old={...base,id:'ep1',kind:'episode',name:'Çukur S01 E01'},fresh={...old,id:'ep2',name:'Çukur S01 E02'};
 assert.equal(core.newFollowItems(null,[old,fresh],[rule]).length,0);assert.deepEqual(core.newFollowItems([old],[old,fresh,{...fresh,id:'other',name:'Other S01 E02'}],[rule])[0].items.map(e=>e.id),['ep2']);
 assert.equal(core.newFollowItems([base],[base,{...base,id:'new'}],[{...rule,kind:'movies'}])[0].items[0].id,'new');
});
test('Team reminders deduplicate HD/SD, exclude recaps, and use only future EPG fixtures',()=>{
 const now=Date.now(),a={...base,id:'a',kind:'live',epgId:'x'},b={...a,id:'b'},rule={id:'f',kind:'team',label:'Real Madrid',leadMinutes:30,createdAt:0};const p={title:'Real Madrid - Barcelona',start:now+3600000,end:now+7200000};
 const matches=core.followedMatches([a,b],{'p:x':[p,{...p,title:'Real Madrid Maç Özeti',start:p.start+1000}]},[rule],now);assert.equal(matches.length,1);assert.equal(matches[0].channel.id,'a');
});
test('App invitation parsing accepts only valid scoped HTTPS/custom links and never reuses account credentials',()=>{
 const invite={origin:'https://share.example',id:'a'.repeat(32),token:'b'.repeat(43)};assert.deepEqual(core.parseInvite(core.nativeInviteLink(invite)),invite);assert.deepEqual(core.parseInvite(`https://share.example/join/${invite.id}#${invite.token}`),invite);
 assert.equal(core.parseInvite(`kotaktv://join/${invite.id}?origin=http://localhost&invite=${invite.token}`),null);assert.equal(core.parseInvite('https://share.example/join/nope#invalid'),null);
});
test('TV media keeps original HLS type when using an opaque authorized proxy URL',()=>{
 assert.equal(core.castInfo({...base,uri:'https://provider.example/live.m3u8',kind:'live'},'https://service.example/media/opaque').contentType,'application/x-mpegURL');assert.throws(()=>core.castInfo({...base,uri:'https://provider.example/file.mkv'}),/MKV/);
});

test('Quick startup requests live channels only; VOD and full XMLTV cannot gate first playback',async()=>{
 const previous=global.fetch,calls=[];const cfg={id:'fast',name:'List',type:'xtream',url:'https://provider.example',username:'u',password:'p'};
 try{global.fetch=async(input)=>{const u=new URL(String(input));const action=u.searchParams.get('action');calls.push(action||'auth');return new Response(JSON.stringify(!action?{user_info:{auth:1,status:'Active',allowed_output_formats:['m3u8']}}:action==='get_live_streams'?[{stream_id:1,name:'TRT 1',category_id:'1'}]:[{category_id:'1',category_name:'Ulusal'}]));};
  let partial;const result=await core.quickCatalog(cfg,new AbortController().signal,c=>partial=c);assert.ok(partial.entries[0].uri);assert.equal(result.entries[0].group,'Ulusal');assert.deepEqual(calls.sort(),['auth','get_live_categories','get_live_streams'].sort());
 }finally{global.fetch=previous;}
});
test('Hard catalog deadline rejects even if a loader has not returned; it cannot leave the UI spinning forever',async()=>{
 const previous=global.fetch;try{global.fetch=async()=>new Promise(()=>{});await assert.rejects(core.quickCatalog({id:'p',name:'p',type:'m3u',url:'https://host/list.m3u'},new AbortController().signal,()=>{},['live'],15),/zamanında/);}finally{global.fetch=previous;}
});
test('Partial live refresh retains already loaded films and restores secure account addresses without a second list fetch',()=>{
 const movie={...base,id:'m'};const old={...base,id:'live',kind:'live'};const incoming={...old,id:'new-live'};assert.deepEqual(core.mergeCatalog([movie,old],[incoming],['live']).map(e=>e.id),['m','new-live']);
 const config={id:'p',name:'List',type:'m3u',url:'https://provider.example/get.php?username=user&password=secret&type=m3u_plus'};const entry={...base,id:'p-live-123',kind:'live',uri:undefined,streamFormat:'m3u8'};assert.equal(core.restoreAddress(entry,config).uri,'https://provider.example/live/user/secret/123.m3u8');assert.equal(core.restoreAddress({...entry,id:'unknown-hash'},config).uri,undefined);
});
test('Large JSON catalog parsing yields UI turns and preserves escaped/nested records',async()=>{
 const values=Array.from({length:10000},(_,i)=>({id:i,name:'Quoted \" item, ] [ \\',nested:{a:[i,'x,y']}}));const text=JSON.stringify(values);let ticks=0;const timer=setInterval(()=>ticks++,0);try{const result=await core.parseJsonArray(text);assert.deepEqual(result,values);assert.ok(ticks>3);}finally{clearInterval(timer);}await assert.rejects(core.parseJsonArray('[1,]'));await assert.rejects(core.parseJsonArray('[1'));const abort=new AbortController();abort.abort();await assert.rejects(core.parseJsonArray(text,abort.signal),/iptal/);
});

test('Delayed categories do not gate usable live streams; final category names replace placeholders',async()=>{
 const previous=global.fetch;let release,first=false;const gate=new Promise(resolve=>release=resolve);
 global.fetch=async input=>{const action=new URL(String(input)).searchParams.get('action');if(action==='get_live_categories'){await gate;return new Response(JSON.stringify([{category_id:'7',category_name:'Spor'}]));}return new Response(JSON.stringify(!action?{user_info:{auth:1}}:[{stream_id:1,name:'Sports',category_id:'7'}]));};
 try{const work=core.loadCatalog({id:'p',type:'xtream',name:'Test',url:'https://provider.test',username:'u',password:'p'},undefined,partial=>{first=true;assert.equal(partial.entries[0].uri,'https://provider.test/live/u/p/1.ts');release();},{kinds:['live'],categoryTimeoutMs:1000});const result=await work;assert.equal(first,true);assert.equal(result.entries[0].group,'Spor');}finally{global.fetch=previous;release();}
});
test('Selected title metadata comes from existing provider; cast, plot and provider score are kept distinct from IMDb',async()=>{
 const previous=global.fetch;let seen;global.fetch=async input=>{seen=new URL(String(input));return new Response(JSON.stringify({info:{name:'Film',movie_image:'https://images.test/poster.jpg',plot:'Özet',rating:'8.7',cast:'Actor',director:'Director',releasedate:'2026-10-01',backdrop_path:['javascript:bad','https://images.test/backdrop.jpg']}}));};
 try{const result=await core.loadMediaInfo({id:'p',name:'Test',type:'xtream',url:'https://provider.test',username:'u',password:'secret'},{...base,id:'p-movie-42'});assert.equal(seen.hostname,'provider.test');assert.equal(seen.searchParams.get('action'),'get_vod_info');assert.equal(seen.searchParams.get('vod_id'),'42');assert.equal(result.rating,8.7);assert.equal(result.imdbRating,undefined);assert.deepEqual(result.backdrops,['https://images.test/backdrop.jpg']);assert.equal(result.plot,'Özet');}finally{global.fetch=previous;}
});
test('XMLTV program descriptions survive parsing and timeline selection',()=>{const now=Date.UTC(2026,9,20,12);const guide=core.parseGuide('<tv><programme channel="trt" start="20261020153000 +0300" stop="20261020163000 +0300"><title>Dizi</title><desc>Yeni &amp; güzel bölüm</desc></programme></tv>',now);assert.equal(guide.trt[0].description,'Yeni & güzel bölüm');});
test('Provider fallback trends never invent an IMDb score or include live channels',()=>{const result=core.displayRanked([{...base,id:'a',rating:9},{...base,id:'b',kind:'live',rating:10}],'movie');assert.equal(result.length,1);assert.equal(result[0].imdbRating,undefined);assert.equal(result[0].rating,9);});
