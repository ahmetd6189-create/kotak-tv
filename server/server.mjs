import http from 'node:http';
import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {randomBytes,createHash,createHmac,timingSafeEqual,createCipheriv,createDecipheriv} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const digest=x=>createHash('sha256').update(x).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
export function hostToken(secret,sub,expires=Date.now()+86400000){const data=Buffer.from(JSON.stringify({sub,exp:expires})).toString('base64url');return data+'.'+createHmac('sha256',secret).update(data).digest('base64url');}
export function publicAddress(ip){if(isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return a!==0&&a!==10&&a!==127&&a<224&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&!(a===192&&b===168)&&!(a===100&&b>=64&&b<=127)&&!(a===198&&(b===18||b===19));}return isIP(ip)===6&&/^[23][0-9a-f]{3}:/i.test(ip);}
export function createService({secret,origin,hosts,allowTestLocal=false,entitlementFor=async()=>null,androidStoreUrl="",iosStoreUrl="",androidFingerprints=[],appleAppId=""}){
 if(!secret||secret.length<32)throw new Error('KOTAK_SECRET en az 32 karakter olmalı.');
 const publicOrigin=new URL(origin);if(publicOrigin.protocol!=='https:'&&!allowTestLocal)throw new Error('HTTPS origin gerekli.');
 function storeLink(value,host){if(!value)return "";const u=new URL(value);if(u.protocol!=="https:"||u.hostname!==host)throw new Error("Geçersiz mağaza adresi");return u.href;}
 const stores={android:storeLink(androidStoreUrl,"play.google.com"),ios:storeLink(iosStoreUrl,"apps.apple.com")};
 const rooms=new Map();const key=createHash('sha256').update(secret).digest();
 function seal(value){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const body=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]);}
 function unseal(value){const cipher=createDecipheriv('aes-256-gcm',key,value.subarray(0,12));cipher.setAuthTag(value.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(value.subarray(28)),cipher.final()]).toString());}
 function host(req){const token=(req.headers.authorization||'').replace(/^Bearer /,'');const [data,sig]=token.split('.');if(!data||!sig)return null;const actual=Buffer.from(sig);const expected=Buffer.from(createHmac('sha256',secret).update(data).digest('base64url'));if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;try{const v=JSON.parse(Buffer.from(data,'base64url'));return typeof v.sub==='string'&&v.exp>Date.now()?v.sub:null;}catch{return null;}}
 function allowed(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!hosts.includes(u.host))throw new Error('Kaynak sunucusuna izin verilmedi.');return u;}
 function resource(room,url){allowed(url);let id=room.ids.get(digest(url));if(!id){if(room.resources.size>=20000)throw new Error('Kaynak sınırı');id=randomBytes(16).toString('hex');room.ids.set(digest(url),id);room.resources.set(id,seal(url));}return `/media/${room.id}/${id}`;}
 async function upstream(url,headers={},range,depth=0){const u=allowed(url);const addresses=await lookup(u.hostname,{all:true});if(!addresses.length||(!allowTestLocal&&addresses.some(a=>!publicAddress(a.address))))throw new Error('Geçersiz kaynak adresi');const chosen=addresses[0];return await new Promise((resolve,reject)=>{const request=(u.protocol==='https:'?https:http).get(u,{headers:{...headers,...(range?{Range:range}:{})},lookup:(_host,_options,callback)=>callback(null,chosen.address,chosen.family)},response=>{if(response.statusCode>=300&&response.statusCode<400&&response.headers.location){response.resume();if(depth>=3){reject(new Error('Yönlendirme sınırı'));return;}const next=new URL(response.headers.location,u);void upstream(next.href,next.origin===u.origin?headers:{},range,depth+1).then(resolve,reject);}else resolve({response,url:u.href});});request.setTimeout(15000,()=>request.destroy(new Error('Kaynak zaman aşımı')));request.on('error',reject);});}
 async function json(req){let body='';for await(const chunk of req){body+=chunk;if(body.length>20000)throw new Error('İstek çok büyük');}return JSON.parse(body||'{}');}
 function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
 function guest(req,room){const header=req.headers['x-kotak-guest'];const cast=new URL(req.url,origin).searchParams.get('cast');if(typeof header==='string'&&digest(header)===room.guest)return true;if(cast&&room.cast&&digest(cast)===room.cast)return true;const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(`kotak_${room.id}=`))?.split('=')[1];return cookie&&digest(cookie)===room.guest;}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; worker-src blob:; connect-src 'self'; frame-ancestors 'none'");
  try{
   const path=new URL(req.url,origin).pathname;const user=host(req);
   if(req.method==='GET'&&path==='/.well-known/assetlinks.json'){send(res,200,androidFingerprints.length?[{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:'com.kotaktv.app',sha256_cert_fingerprints:androidFingerprints}}]:[]);return;}
   if(req.method==='GET'&&path==='/.well-known/apple-app-site-association'){send(res,200,{applinks:{apps:[],details:appleAppId?[{appID:appleAppId,paths:['/join/*']}]:[]}});return;}
   if(req.method==='GET'&&path==='/link-config'){send(res,200,{origin:publicOrigin.origin,stores});return;}
   if(req.method==='GET'&&/^\/join\/[a-f0-9]{32}$/.test(path)){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(new URL('./join.html',import.meta.url)));return;}
   if(req.method==='GET'&&path==='/join.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('./join.js',import.meta.url)));return;}
   if(req.method==='GET'&&path==='/health'){send(res,200,{ok:true});return;}
   if(req.method==='GET'&&path==='/v1/entitlement'){if(!user){send(res,401,{error:'Oturum gerekli'});return;}const value=await entitlementFor(user);send(res,value?.verified?200:503,value||{error:'Mağaza doğrulama servisi bağlı değil'});return;}
   if(req.method==='GET'&&/^\/watch\/[a-f0-9]+$/.test(path)){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(new URL('./watch.html',import.meta.url)));return;}
   if(req.method==='GET'&&path==='/watch.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('./watch.js',import.meta.url)));return;}
   if(req.method==='GET'&&path==='/hls.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('./node_modules/hls.js/dist/hls.min.js',import.meta.url)));return;}
   for(const [id,room] of rooms)if(room.expiresAt<Date.now())rooms.delete(id);
   if(req.method==='POST'&&path==='/v1/rooms'){
    if(!user){send(res,401,{error:'Oturum gerekli'});return;}
    if([...rooms.values()].filter(r=>r.owner===user).length>=2||rooms.size>=1000){send(res,429,{error:'Oda sınırı'});return;}
    const data=await json(req);const source=allowed(data.uri);const headers={};for(const [k,v]of Object.entries(data.headers||{})){if(['authorization','user-agent','referer','origin'].includes(k.toLowerCase())&&typeof v==='string'&&v.length<2048)headers[k]=v;}
    const id=randomBytes(16).toString('hex');const invite=random();const room={id,owner:user,invite:digest(invite),inviteExpires:Date.now()+900000,guest:null,expiresAt:Date.now()+7200000,title:String(data.title||'Kotak TV').slice(0,150),source:seal({uri:source.href,headers}),ids:new Map(),resources:new Map(),live:!!data.live,state:{position:0,playing:true,updatedAt:Date.now()},command:null,sequence:0};rooms.set(id,room);
    let castSource;
    if(data.mode==='cast'){const cap=random();room.cast=digest(cap);castSource=publicOrigin.origin+resource(room,source.href)+`?cast=${cap}`;}
    send(res,201,{id,url:`${publicOrigin.origin}/join/${id}#${invite}`,castSource,expiresAt:room.expiresAt});return;
   }
   const match=path.match(/^\/v1\/rooms\/([a-f0-9]+)(?:\/(join|state|command))?$/);const media=path.match(/^\/media\/([a-f0-9]+)\/([a-f0-9]+)$/);const id=match?.[1]||media?.[1];const room=rooms.get(id);
   if(!room){send(res,404,{error:'Oda bulunamadı veya süresi doldu'});return;}
   const owner=user===room.owner;
   if(req.method==='POST'&&match?.[2]==='join'){
    const data=await json(req);if(room.guest||Date.now()>room.inviteExpires||digest(String(data.invite||''))!==room.invite){send(res,403,{error:'Bu davet kullanılmış, geçersiz veya süresi dolmuş.'});return;}
    const cookie=random();room.guest=digest(cookie);res.setHeader('Set-Cookie',`kotak_${room.id}=${cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200${allowTestLocal?'':'; Secure'}`);send(res,200,data.native===true?{ok:true,guestToken:cookie}:{ok:true});return;
   }
   if(!owner&&!guest(req,room)){send(res,403,{error:'Yayın erişimi yok'});return;}
   if(req.method==='DELETE'&&match&&!match[2]&&owner){rooms.delete(room.id);send(res,200,{closed:true});return;}
   if(req.method==='GET'&&match&&!match[2]){const source=unseal(room.source);send(res,200,{id:room.id,expiresAt:room.expiresAt,title:room.title,live:room.live,contentType:/\.m3u8(?:[?#]|$)/i.test(source.uri)?"hls":"auto",source:resource(room,source.uri),state:room.state,serverNow:Date.now(),command:owner?room.command:undefined});return;}
   if(req.method==='POST'&&match?.[2]==='state'&&owner){const data=await json(req);if(!Number.isFinite(data.position)||data.position<0||typeof data.playing!=='boolean'){send(res,400,{error:'Geçersiz oynatıcı durumu'});return;}room.state={position:data.position,playing:data.playing,updatedAt:Date.now()};send(res,200,{ok:true});return;}
   if(req.method==='POST'&&match?.[2]==='command'){const data=await json(req);if(!['play','pause','seek'].includes(data.action)||data.action==='seek'&&(!Number.isFinite(data.position)||data.position<0||room.live)){send(res,400,{error:'Geçersiz komut'});return;}room.command={sequence:++room.sequence,action:data.action,position:data.position};send(res,200,{ok:true});return;}
   if(req.method==='GET'&&media){
    const sealed=room.resources.get(media[2]);if(!sealed){send(res,404,{error:'Kaynak yok'});return;}
    res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Expose-Headers','Content-Length, Content-Range, Accept-Ranges');
    const url=unseal(sealed);const source=unseal(room.source);const headers=new URL(source.uri).origin===new URL(url).origin?source.headers:{};
    const {response,url:resolved}=await upstream(url,headers,req.headers.range);
    const type=String(response.headers['content-type']||'');
    if(response.statusCode!==200&&response.statusCode!==206){response.resume();send(res,502,{error:'Yayın kaynağı yanıt vermedi'});return;}
    if(/mpegurl/i.test(type)||/\.m3u8(?:\?|$)/i.test(resolved)){
     let body='';for await(const chunk of response){body+=chunk;if(body.length>2e6){response.destroy();throw new Error('Manifest sınırı');}}
     const cap=new URL(req.url,origin).searchParams.get('cast');const rewrite=value=>resource(room,new URL(value,resolved).href)+(cap?`?cast=${encodeURIComponent(cap)}`:'');
     body=body.split(/\r?\n/).map(line=>line.startsWith('#')?line.replace(/URI="([^"]+)"/g,(_,url)=>`URI="${rewrite(url)}"`):line.trim()?rewrite(line.trim()):line).join('\n');res.writeHead(200,{'Content-Type':'application/vnd.apple.mpegurl'});res.end(body);
    }else{const out={'Content-Type':type||'application/octet-stream'};for(const k of ['content-length','content-range','accept-ranges'])if(response.headers[k])out[k]=response.headers[k];res.writeHead(response.statusCode,out);res.on('close',()=>response.destroy());response.pipe(res);}
    return;
   }
   send(res,405,{error:'İşlem desteklenmiyor'});
  }catch{if(!res.headersSent)send(res,502,{error:'İşlem tamamlanamadı. Servis veya kaynak ayarını kontrol edin.'});else res.destroy();}
 });
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url))createService({secret:process.env.KOTAK_SECRET,origin:process.env.PUBLIC_ORIGIN,hosts:(process.env.STREAM_HOSTS||'').split(',').filter(Boolean),androidStoreUrl:process.env.ANDROID_STORE_URL,iosStoreUrl:process.env.IOS_STORE_URL,androidFingerprints:(process.env.ANDROID_SHA256||'').split(',').filter(Boolean),appleAppId:process.env.APPLE_APP_ID}).listen(Number(process.env.PORT||8080),'127.0.0.1',()=>console.log('Kotak service listening'));
