import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Entry, Program } from './iptv';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:true,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
export function reminderId(item:Entry,p:Program){return `kotak-${item.id}-${p.start}`;}
export async function scheduledReminders(){return (await Notifications.getAllScheduledNotificationsAsync()).map(n=>n.identifier).filter(id=>!id.startsWith("kotak-expiry-"));}
export async function toggleReminder(item:Entry,p:Program,minutes=5):Promise<boolean>{
 const identifier=reminderId(item,p);
 if((await scheduledReminders()).includes(identifier)){await Notifications.cancelScheduledNotificationAsync(identifier);return false;}
 if(p.start<=Date.now())throw new Error('Bu program başlamış. Gelecekteki bir programı seçin.');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('epg',{name:'Program hatırlatıcıları',importance:Notifications.AndroidImportance.HIGH,sound:'default'});
 let permission=await Notifications.getPermissionsAsync();
 if(!permission.granted)permission=await Notifications.requestPermissionsAsync({ios:{allowAlert:true,allowSound:true}});
 if(!permission.granted)throw new Error('Program hatırlatması için bildirim izni gerekiyor. Telefon ayarlarından Kotak TV bildirimlerini açın.');
 const fireAt=reminderTime(p.start,minutes);
 try {await Notifications.scheduleNotificationAsync({identifier,content:{title:`${item.name} · Programın başlıyor`,body:`${p.title} · ${minutes} dakika sonra`,sound:'default',data:{channelId:item.id,playlistId:item.playlistId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(fireAt),channelId:'epg'}});}
 catch{throw new Error('Hatırlatıcı kurulamadı. Telefonun bildirim ve alarm izinlerini kontrol edin.');}
 return true;
}

export function reminderTime(start:number,minutes:number,now=Date.now()){
 if(!Number.isFinite(minutes)||minutes<1||minutes>10080)throw new Error('1 ile 10080 arasında dakika girin.');
 const at=start-minutes*60000;if(at<=now)throw new Error('Seçtiğin hatırlatma saati geçmiş. Daha kısa bir süre seç.');
 return at;
}
