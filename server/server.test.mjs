import {test} from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {createService,hostToken,publicAddress} from './server.mjs';
const secret='test-only-secret-not-a-production-credential-12345';
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;}
test('single-use guest invitation, stream-scoped cookie, bidirectional commands, revocation and authenticated billing boundary',async()=>{
 const provider=http.createServer((req,res)=>{if(req.url==='/live.m3u8'){res.setHeader('Content-Type','application/vnd.apple.mpegurl');res.end('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXTINF:5,\nsegment.ts\n');}else{res.end('media-bytes')}});
 const source=await listen(provider);const server=createService({secret,origin:'http://localhost',hosts:[new URL(source).host],allowTestLocal:true});const base=await listen(server);
 const auth={Authorization:`Bearer ${hostToken(secret,'owner')}`,'Content-Type':'application/json'};
 const request=(path,method='GET',data,headers=auth)=>fetch(base+path,{method,headers,body:data?JSON.stringify(data):undefined});
 try{
  assert.equal((await request('/v1/rooms','POST',{uri:source+'/live.m3u8'},{})).status,401);
  const created=await request('/v1/rooms','POST',{uri:source+'/live.m3u8',title:'Test',live:true});assert.equal(created.status,201);const room=await created.json();const invite=room.url.split('#')[1];
  assert.equal((await request(`/v1/rooms/${room.id}`,'GET',null,{})).status,403);
  const joined=await request(`/v1/rooms/${room.id}/join`,'POST',{invite},{});assert.equal(joined.status,200);const cookie=joined.headers.get('set-cookie').split(';')[0];const guest={Cookie:cookie,'Content-Type':'application/json'};
  assert.equal((await request(`/v1/rooms/${room.id}/join`,'POST',{invite},{})).status,403);
  const state=await (await request(`/v1/rooms/${room.id}`,'GET',null,guest)).json();assert.equal(state.title,'Test');assert.equal(JSON.stringify(state).includes(source),false);
  const manifest=await (await request(state.source,'GET',null,guest)).text();assert.match(manifest,/URI="\/media\//);assert.equal(manifest.includes(source),false);
  const segment=manifest.split('\n').find(x=>x.startsWith('/media/'));assert.equal(await (await request(segment,'GET',null,guest)).text(),'media-bytes');
  await request(`/v1/rooms/${room.id}/command`,'POST',{action:'pause'},guest);const command=await (await request(`/v1/rooms/${room.id}`)).json();assert.equal(command.command.action,'pause');
  assert.equal((await request(`/v1/rooms/${room.id}/state`,'POST',{position:3,playing:false},guest)).status,405);
  await request(`/v1/rooms/${room.id}/state`,'POST',{position:3,playing:false});assert.equal((await (await request(`/v1/rooms/${room.id}`,'GET',null,guest)).json()).state.playing,false);
  const second=await (await request('/v1/rooms','POST',{uri:source+'/other.mp4'})).json();assert.equal((await request(`/v1/rooms/${second.id}`,'GET',null,guest)).status,403);
  assert.equal((await request('/v1/entitlement')).status,503);
  await request(`/v1/rooms/${room.id}`,'DELETE');assert.equal((await request(state.source,'GET',null,guest)).status,404);
 }finally{server.closeAllConnections();provider.closeAllConnections();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>provider.close(r))]);}
});
test('production rejects private origins, unexpected hosts and invalid host tokens',async()=>{
 assert.equal(publicAddress('127.0.0.1'),false);assert.equal(publicAddress('169.254.169.254'),false);assert.equal(publicAddress('10.1.1.1'),false);assert.equal(publicAddress('::ffff:127.0.0.1'),false);assert.equal(publicAddress('8.8.8.8'),true);
 assert.throws(()=>createService({secret,origin:'http://localhost',hosts:[]}),/HTTPS/);
 const server=createService({secret,origin:'https://service.example',hosts:['provider.example']});const base=await listen(server);
 try{const invalid=await fetch(base+'/v1/rooms',{method:'POST',headers:{Authorization:'Bearer invalid'}});assert.equal(invalid.status,401);const denied=await fetch(base+'/v1/rooms',{method:'POST',headers:{Authorization:`Bearer ${hostToken(secret,'user')}`},body:JSON.stringify({uri:'http://169.254.169.254/latest'})});assert.equal(denied.status,502);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('browser sync forwards an actual guest pause after a no-op host poll',async()=>{
 const {readFile}=await import('node:fs/promises');const {runInNewContext}=await import('node:vm');let now=100000;const events=new Map(),requests=[],timers=[];
 const video={paused:false,currentTime:10,canPlayType:()=>true,addEventListener:(name,fn)=>events.set(name,fn),play:async()=>{video.paused=false;},pause:()=>{video.paused=true;},removeAttribute(){}};
 const elements={'video':video,'#status':{},'#join':{},'#star':{},'h1':{}};
 const state={id:'room',source:'/media/room/id',title:'Film',live:false,state:{position:10,playing:true,updatedAt:now},serverNow:now};
 const context={location:{pathname:'/watch/room',hash:'#invite'},history:{replaceState(){}},document:{querySelector:name=>elements[name],hidden:false},Date:{now:()=>now},Hls:{isSupported:()=>false},setInterval:fn=>timers.push(fn),fetch:async(path,options)=>{requests.push([path,options]);return {ok:true,json:async()=>path.endsWith('/join')||path.endsWith('/command')?{ok:true}:state}}};
 runInNewContext(await readFile(new URL('./watch.js',import.meta.url),'utf8'),context);await elements['#join'].onclick();now+=2000;state.serverNow=now;state.state.updatedAt=now;await timers[0]();video.paused=true;events.get('pause')();await new Promise(r=>setImmediate(r));assert.ok(requests.some(([path,options])=>path.endsWith('/command')&&JSON.parse(options.body).action==='pause'));
});
test('app invite landing, real store configuration, native one-use redemption and scoped Cast proxy',async()=>{
 const provider=http.createServer((req,res)=>{res.setHeader('Content-Type','application/vnd.apple.mpegurl');res.end('#EXTM3U\n#EXTINF:5,\nsegment.ts\n');});const source=await listen(provider);
 const server=createService({secret,origin:'http://localhost',hosts:[new URL(source).host],allowTestLocal:true,androidStoreUrl:'https://play.google.com/store/apps/details?id=com.kotaktv.app',androidFingerprints:['TEST-FINGERPRINT'],appleAppId:'TEST.com.kotaktv.app'});const base=await listen(server);
 const headers={Authorization:`Bearer ${hostToken(secret,'owner')}`,'Content-Type':'application/json'};const request=(path,data,extra=headers)=>fetch(base+path,{method:data?'POST':'GET',headers:extra,body:data?JSON.stringify(data):undefined});
 try{
  const room=await(await request('/v1/rooms',{uri:source+'/live.m3u8'})).json();assert.match(room.url,/\/join\//);const invite=room.url.split('#')[1];
  const landing=await request(`/join/${room.id}`);assert.match(await landing.text(),/Kotak TV/);const config=await(await request('/link-config')).json();assert.match(config.stores.android,/play.google.com/);assert.equal(config.stores.ios,'');
  const join=await(await request(`/v1/rooms/${room.id}/join`,{invite,native:true},{})).json();assert.equal(join.guestToken.length,43);assert.equal((await request(`/v1/rooms/${room.id}`,null,{'X-Kotak-Guest':join.guestToken})).status,200);assert.equal((await request(`/v1/rooms/${room.id}/join`,{invite,native:true},{})).status,403);
  const cast=await(await request('/v1/rooms',{uri:source+'/live.m3u8',mode:'cast'})).json();const castPath=new URL(cast.castSource).pathname+new URL(cast.castSource).search;
  const manifest=await(await request(castPath,null,{})).text();assert.match(manifest,/\?cast=/);assert.equal((await request(new URL(cast.castSource).pathname,null,{})).status,403);
  assert.equal((await(await request('/.well-known/assetlinks.json')).json())[0].target.package_name,'com.kotaktv.app');
 }finally{server.closeAllConnections();provider.closeAllConnections();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>provider.close(r))]);}
});
