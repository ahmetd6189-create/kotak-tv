import * as Notifications from 'expo-notifications';
import {translate} from './i18n';
export * from 'expo-notifications';
type Source={content:Notifications.NotificationContentInput;title?:string;body?:string;at?:number;channelId?:string};
export async function scheduleNotificationAsync(request:Notifications.NotificationRequestInput){
 const trigger=request.trigger;const date=trigger&&typeof trigger==='object'&&'date' in trigger?trigger.date:undefined;
 const source:Source={content:request.content,title:request.content.title??undefined,body:request.content.body??undefined,at:date instanceof Date?date.getTime():typeof date==='number'?date:undefined,channelId:trigger&&typeof trigger==='object'&&'channelId' in trigger?trigger.channelId:undefined};
 return Notifications.scheduleNotificationAsync({...request,content:{...request.content,title:translate(source.title),body:translate(source.body),data:{...request.content.data,kotakL10n:source}}});
}
export function setNotificationChannelAsync(id:string,input:Notifications.NotificationChannelInput){return Notifications.setNotificationChannelAsync(id,{...input,name:translate(input.name),description:translate(input.description)});}
let queue:Promise<void>=Promise.resolve();
/** Keep reminder identifiers, delivery dates and navigation data when changing language. */
export function relocalizeNotifications(){
 queue=queue.catch(()=>{}).then(async()=>{
  for(const request of await Notifications.getAllScheduledNotificationsAsync()){
   const source=request.content.data?.kotakL10n as Source|undefined;
   if(!source||!Number.isFinite(source.at)||source.at!<=Date.now())continue;
   await Notifications.scheduleNotificationAsync({identifier:request.identifier,content:{...source.content,title:translate(source.title),body:translate(source.body),data:request.content.data},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(source.at!),channelId:source.channelId}});
  }
 });return queue;
}
