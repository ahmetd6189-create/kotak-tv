const {test}=require('node:test');const assert=require('node:assert/strict');const {mkdtempSync,rmSync}=require('node:fs');const {join}=require('node:path');const {tmpdir}=require('node:os');
const dir=mkdtempSync(join(tmpdir(),'kotak-features-'));
require('esbuild').buildSync({stdin:{contents:`export * from './src/native/assistant'; export * from './src/native/catalog-tools'; export * from './src/native/recovery'; export * from './src/native/imdb'; export * from './src/native/iptv';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:join(dir,'core.cjs'),logLevel:'error'});
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
