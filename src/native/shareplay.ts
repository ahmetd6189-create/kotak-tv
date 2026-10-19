import * as SecureStore from 'expo-secure-store';
import type {Entry} from './iptv';
import {parseEntitlement} from './entitlement';
export type ServiceConfig={url:string;token:string};
export type ShareRoom={id:string;url:string;expiresAt:number;itemId:string;config:ServiceConfig};
export async function serviceConfig():Promise<ServiceConfig|null>{try{const raw=await SecureStore.getItemAsync('kotak.services');return raw?JSON.parse(raw):null;}catch{return null;}}
export async function saveServiceConfig(config:ServiceConfig){const url=new URL(config.url);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('HTTPS servis adresi girin.');if(!config.token.trim())throw new Error('Hesap oturum anahtarı gerekli.');await SecureStore.setItemAsync('kotak.services',JSON.stringify({url:url.origin+url.pathname.replace(/\/$/,''),token:config.token.trim()}));}
export async function serviceRequest(config:ServiceConfig,path:string,method='GET',data?:unknown){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(config.url+path,{method,headers:{Authorization:`Bearer ${config.token}`,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:controller.signal});const result=await response.json();if(!response.ok)throw new Error(result.error||'Kotak servisine bağlanılamadı.');return result;}finally{clearTimeout(timer);}
}
export async function createShareRoom(config:ServiceConfig,item:Entry):Promise<ShareRoom>{
 if(!item.uri)throw new Error('Bu içerik için yayın bağlantısı yok.');
 const result=await serviceRequest(config,'/v1/rooms','POST',{uri:item.uri,headers:item.headers,title:item.name,live:item.kind==='live'});
 if(typeof result.id!=='string'||!/^[a-f0-9]+$/.test(result.id)||typeof result.url!=='string'||new URL(result.url).origin!==new URL(config.url).origin)throw new Error('Servis geçerli davet döndürmedi.');
 return {...result,config,itemId:item.id};
}
export async function verifiedEntitlement(config:ServiceConfig){return parseEntitlement(await serviceRequest(config,'/v1/entitlement'));}
export async function closeShareRoom(room:ShareRoom){await serviceRequest(room.config,`/v1/rooms/${room.id}`,'DELETE');}
