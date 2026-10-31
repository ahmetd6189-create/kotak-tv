import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from './localized-notifications';
import {Platform} from 'react-native';
import {createCacheStore} from './cache-store';
import {newFollowItems,followedMatches,type FollowRule} from './follow-core';
import type {Entry,Guide} from './iptv';
export {type FollowRule} from './follow-core';
const store=createCacheStore(AsyncStorage,Number.POSITIVE_INFINITY);const key='kotak.follows';
export async function savedFollows():Promise<FollowRule[]>{try{const data=JSON.parse(await AsyncStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(r=>r&&typeof r.id==='string'&&typeof r.label==='string'&&['team','series','movies'].includes(r.kind)&&Number.isFinite(r.leadMinutes)&&r.leadMinutes>=1&&r.leadMinutes<=10080).slice(0,50):[];}catch{return [];}}
export async function followPermission(){let permission=await Notifications.getPermissionsAsync();if(!permission.granted)permission=await Notifications.requestPermissionsAsync();if(!permission.granted)throw new Error('Takip bildirimleri için bildirim izni gerekli.');if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('follows',{name:'Takip ettiğin içerikler',importance:Notifications.AndroidImportance.HIGH,sound:'default'});}
export async function saveFollows(rules:FollowRule[]){await AsyncStorage.setItem(key,JSON.stringify(rules));}
const jobs=new Map<string,Promise<void>>();
function queue(id:string,work:()=>Promise<void>){const run=(jobs.get(id)||Promise.resolve()).catch(()=>{}).then(work);jobs.set(id,run);void run.finally(()=>{if(jobs.get(id)===run)jobs.delete(id)}).catch(()=>{});return run;}
export async function seedFollows(entries:Entry[]){const playlists=[...new Set(entries.map(e=>e.playlistId))];for(const id of playlists)await queue(id,async()=>{const previous=await store.read(`follow.${id}`);const merged=new Map((previous?.entries||[]).map(e=>[e.id,e]));for(const e of entries.filter(e=>e.playlistId===id&&e.kind!=="live"))merged.set(e.id,e);await store.save(`follow.${id}`,[...merged.values()],{});});}
export function observeFollowCatalog(id:string,entries:Entry[],rules:FollowRule[],canNotify:()=>boolean){
 return queue(id,async()=>{
  const previous=await store.read(`follow.${id}`);const candidates=entries.filter(e=>e.kind==='movie'||e.kind==='episode');
  const permission=await Notifications.getPermissionsAsync();
  if(canNotify()&&permission.granted)for(const {rule,items} of newFollowItems(previous?.entries||null,candidates,rules)){
   if(!canNotify())break;const item=items[0];await Notifications.scheduleNotificationAsync({identifier:`kotak-new-${rule.id}-${item.id}`,content:{title:rule.kind==='movies'?'Yeni filmler eklendi':`${rule.label} · Yeni bölüm`,body:items.length===1?item.name:`${items.length} yeni içerik · ${item.name}`,sound:'default',data:{mediaId:item.id,playlistId:item.playlistId,seriesId:item.seriesId,followKind:rule.kind}},trigger:null});
  }
  // Keep disappeared items in the snapshot: a temporary provider omission is not a new release on return.
  const union=new Map((previous?.entries||[]).map(e=>[e.id,e]));for(const e of candidates)union.set(e.id,e);await store.save(`follow.${id}`,[...union.values()],{});
 });
}
export async function syncTeamReminders(entries:Entry[],guide:Guide,rules:FollowRule[],canNotify:()=>boolean){
 if(!canNotify())return;const permission=await Notifications.getPermissionsAsync();if(!permission.granted)return;
 const planned=followedMatches(entries,guide,rules);const pending=await Notifications.getAllScheduledNotificationsAsync();const desired=new Map(planned.slice(0,Math.max(0,Math.min(40,60-pending.filter(n=>!n.identifier.startsWith('kotak-follow-')).length))).map(p=>[p.id,p]));
 for(const old of pending)if(old.identifier.startsWith('kotak-follow-')&&!desired.has(old.identifier))await Notifications.cancelScheduledNotificationAsync(old.identifier);
 for(const [identifier,{rule,channel,program}] of desired){
  if(!canNotify())return;
  const at=Math.max(Date.now()+3000,program.start-rule.leadMinutes*60000);
  // Same identifier/date need no new OS operation on every EPG update.
  const prior=pending.find(n=>n.identifier===identifier);if(prior?.content.data?.leadMinutes===rule.leadMinutes)continue;
  await Notifications.scheduleNotificationAsync({identifier,content:{title:`${rule.label} maçını kaçırma`,body:`${channel.name} · ${program.title} · ${new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'}).format(program.start)}`,sound:'default',data:{channelId:channel.id,playlistId:channel.playlistId,leadMinutes:rule.leadMinutes,follow:true}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at),channelId:'follows'}});
 }
}
export async function cancelFollowNotifications(){for(const n of await Notifications.getAllScheduledNotificationsAsync())if(n.identifier.startsWith('kotak-follow-')||n.identifier.startsWith('kotak-new-'))await Notifications.cancelScheduledNotificationAsync(n.identifier);}
