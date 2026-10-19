import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
export type Entitlement={id:string;kind:'trial'|'subscription';expiresAt:number;verifiedAt:number};
/** Accept only a result returned by the authenticated billing/trial backend. Never infer payment from device time. */
export function parseEntitlement(data:unknown):Entitlement{
 const value=data as Record<string,unknown>;
 if(!value||value.verified!==true||typeof value.id!=='string'||!['trial','subscription'].includes(String(value.kind))||!Number.isFinite(value.expiresAt)||!Number.isFinite(value.verifiedAt))throw new Error('Doğrulanmış abonelik bilgisi alınamadı.');
 return {id:value.id,kind:value.kind as Entitlement['kind'],expiresAt:Number(value.expiresAt),verifiedAt:Number(value.verifiedAt)};
}
export function expiryNotices(entitlement:Entitlement,now=Date.now()){
 const end=entitlement.expiresAt;
 // 48 hours before expiry, then 24, 16 and 8 hours before expiry: always before the actual cutoff.
 return [48,24,16,8].map(hours=>({id:`kotak-expiry-${entitlement.id}-${hours}`,at:end-hours*3600000,hours})).filter(n=>n.at>now);
}
export function expiryMessage(entitlement:Entitlement,now=Date.now()){
 const remaining=entitlement.expiresAt-now;
 if(remaining<=0)return 'Kotak Pro kullanım süren doldu.';
 if(remaining<=86400000)return 'Kotak Pro kullanım süren 1 günden az kaldı.';
 if(remaining<=172800000)return 'Kotak Pro kullanım süren 2 günden az kaldı.';
 return '';
}
export async function scheduleExpiryNotices(entitlement:Entitlement|null){
 const notices=entitlement?expiryNotices(entitlement):[];
 // Cancel old renewal dates before installing the new schedule. Program alarms are unaffected.
 for(const request of await Notifications.getAllScheduledNotificationsAsync())if(request.identifier.startsWith('kotak-expiry-'))await Notifications.cancelScheduledNotificationAsync(request.identifier);
 if(!notices.length)return;
 const permission=await Notifications.getPermissionsAsync();if(!permission.granted)return;
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('subscription',{name:'Kotak Pro süre bildirimleri',importance:Notifications.AndroidImportance.HIGH,sound:'default'});
 for(const notice of notices)await Notifications.scheduleNotificationAsync({identifier:notice.id,content:{title:'Kotak TV Pro',body:`${entitlement!.kind==='trial'?'Deneme':'Abonelik'} sürenin bitmesine ${notice.hours} saat kaldı.`,sound:'default',data:{screen:'subscription'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(notice.at),channelId:'subscription'}});
}
