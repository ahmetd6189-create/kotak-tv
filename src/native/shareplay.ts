import * as SecureStore from 'expo-secure-store';
import type {Entry} from './iptv';
import {parseEntitlement} from './entitlement';
export type ServiceConfig={url:string;token:string;guestToken?:string};
export type ShareRoom={id:string;url:string;expiresAt:number;itemId:string;config:ServiceConfig};
export async function serviceConfig():Promise<ServiceConfig|null>{try{const raw=await SecureStore.getItemAsync('kotak.services');return raw?JSON.parse(raw):null;}catch{return null;}}
export async function saveServiceConfig(config:ServiceConfig){const url=new URL(config.url);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('HTTPS servis adresi girin.');if(!config.token.trim())throw new Error('Hesap oturum anahtarı gerekli.');await SecureStore.setItemAsync('kotak.services',JSON.stringify({url:url.origin+url.pathname.replace(/\/$/,''),token:config.token.trim()}));}
export async function serviceRequest(config:ServiceConfig,path:string,method='GET',data?:unknown){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Kotak servisi zamanında yanıt vermedi.'));},10000);});
 const work=(async()=>{const response=await fetch(config.url+path,{method,headers:{...(config.token?{Authorization:`Bearer ${config.token}`}:{...(config.guestToken?{"X-Kotak-Guest":config.guestToken}:{})}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:controller.signal});const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Kotak servisine bağlanılamadı.'),{status:response.status});return result;})();
 try{return await Promise.race([work,deadline]);}finally{clearTimeout(timer!);}

}
export async function createShareRoom(config:ServiceConfig,item:Entry):Promise<ShareRoom>{
 if(!item.uri)throw new Error('Bu içerik için yayın bağlantısı yok.');
 const result=await serviceRequest(config,'/v1/rooms','POST',{uri:item.uri,headers:item.headers,title:item.name,live:item.kind==='live'});
 if(typeof result.id!=='string'||!/^[a-f0-9]+$/.test(result.id)||typeof result.url!=='string'||new URL(result.url).origin!==new URL(config.url).origin)throw new Error('Servis geçerli davet döndürmedi.');
 return {...result,config,itemId:item.id};
}
export async function verifiedEntitlement(config:ServiceConfig){return parseEntitlement(await serviceRequest(config,'/v1/entitlement'));}
export async function closeShareRoom(room:ShareRoom){await serviceRequest(room.config,`/v1/rooms/${room.id}`,'DELETE');}

export async function joinShareRoom(invite:import('./invites').Invite):Promise<{room:ShareRoom;item:Entry}>{
 const config:ServiceConfig={url:invite.origin,token:''};
 const joined=await serviceRequest(config,`/v1/rooms/${invite.id}/join`,'POST',{invite:invite.token,native:true});
 if(typeof joined.guestToken!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(joined.guestToken))throw new Error('Geçerli davet oturumu alınamadı.');
 config.guestToken=joined.guestToken;const result=await serviceRequest(config,`/v1/rooms/${invite.id}`);
 if(typeof result.source!=='string'||!new RegExp(`^/media/${invite.id}/[a-f0-9]+$`).test(result.source))throw new Error('Paylaşılan kaynak doğrulanamadı.');
 const item:Entry={id:`guest-${invite.id}`,playlistId:'shared-room',kind:result.live?'live':'movie',contentType:result.contentType==='hls'?'hls':'auto',name:result.title,group:'Birlikte İzle',logo:'',uri:invite.origin+result.source,headers:{'X-Kotak-Guest':joined.guestToken}};
 return {room:{id:invite.id,url:'',expiresAt:result.expiresAt||Date.now()+7200000,itemId:item.id,config},item};
}
