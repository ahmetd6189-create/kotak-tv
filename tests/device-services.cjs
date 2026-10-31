// Device API substitute for component tests only. Production never imports this file.
const React=require('react');const events=new Map();const scheduled=new Map();
const speechMock={granted:true,available:true,options:null,emit(name,event={}){for(const fn of events.get(name)||[])fn(event)}};
exports.speechMock=speechMock;
exports.useSpeechRecognitionEvent=(name,fn)=>React.useEffect(()=>{const set=events.get(name)||new Set();set.add(fn);events.set(name,set);return()=>set.delete(fn)},[name,fn]);
exports.ExpoSpeechRecognitionModule={isRecognitionAvailable:()=>speechMock.available,requestPermissionsAsync:async()=>({granted:speechMock.granted}),start(options){speechMock.options=options;speechMock.emit('start')},stop(){speechMock.emit('end')},abort(){}};
exports.setAudioModeAsync=async()=>{};
const notificationMock={granted:true,scheduled,reset(){this.granted=true;scheduled.clear()}};
exports.notificationMock=notificationMock;
exports.setNotificationHandler=()=>{};
exports.getAllScheduledNotificationsAsync=async()=>[...scheduled].map(([identifier,value])=>({identifier,...value}));
exports.cancelScheduledNotificationAsync=async id=>{scheduled.delete(id)};
exports.getPermissionsAsync=async()=>({granted:notificationMock.granted});
exports.requestPermissionsAsync=async()=>({granted:notificationMock.granted});
exports.scheduleNotificationAsync=async request=>{scheduled.set(request.identifier,request);return request.identifier};
exports.setNotificationChannelAsync=async()=>{};
exports.AndroidImportance={HIGH:4};exports.SchedulableTriggerInputTypes={DATE:'date'};
