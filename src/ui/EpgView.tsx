import React,{useMemo,useState} from 'react';
import {FlatList,Pressable,ScrollView,Text,View} from 'react-native';
import {Bell,BellRing,ChevronDown,Play} from 'lucide-react-native';
import type {Entry,Guide,Program} from '../native/iptv';
import {scheduleFor,programWindow} from '../native/catalog-tools';
import {IconButton,Logo,Pill,ProgramBar,clock,d} from './Design';
import {colors as c} from '../theme';
const key=(item:Entry,p:Program)=>`kotak-${item.id}-${p.start}`;
export function EpgScreen({channels,guide,now,notice,onPlay,reminders=[],onReminder,onRefresh,onEpgSettings}:{channels:Entry[];guide:Guide;now:number;notice:string;onPlay:(item:Entry)=>void;reminders?:string[];onReminder?:(item:Entry,p:Program)=>void;onRefresh?:()=>void;onEpgSettings?:()=>void}){
 const [window,setWindow]=useState<'now'|'tonight'|'day'|'reminders'>('now');const [group,setGroup]=useState('Tümü');const [expanded,setExpanded]=useState<string|null>(null);
 const reminderSet=useMemo(()=>new Set(reminders),[reminders]);
 const groups=useMemo(()=>['Tümü',...new Set(channels.map(e=>e.group))],[channels]);
 const list=useMemo(()=>channels.filter(e=>(group==='Tümü'||e.group===group)&&(window!=='reminders'||scheduleFor(e,guide).some(p=>reminderSet.has(key(e,p))))),[channels,group,window,guide,reminderSet]);
 return <FlatList data={list} keyExtractor={e=>e.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} contentContainerStyle={d.screenList}
 ListHeaderComponent={<>
  <Text style={d.h2}>Yayın Akışı</Text><Text style={d.micro}>Türkiye saati</Text><Text style={[d.secondary,{marginVertical:10}]}>{notice}</Text>
  <View style={[d.inline,{marginBottom:16,flexWrap:'wrap'}]}><Pill label="EPG adresi ekle" onPress={()=>onEpgSettings?.()}/><Pill label="EPG’yi yenile" onPress={()=>onRefresh?.()}/></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingBottom:12}}>{([['now','Şimdi'],['tonight','Bu Akşam'],['day','24 Saat'],['reminders',`Hatırlatıcılar (${reminders.length})`]] as const).map(([id,label])=><Pill key={id} label={label} active={window===id} onPress={()=>setWindow(id)}/>)}</ScrollView>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingBottom:18}}>{groups.map(name=><Pill key={name} label={name} active={group===name} onPress={()=>setGroup(name)}/>)}</ScrollView>
  <Text style={[d.micro,{marginBottom:16}]}>Gelecekteki programın yanındaki zile bas: 5, 10, 30 dakika, 1 saat veya istediğin süre önce bildirim al. Telefonun bildirim/alarm izinleri açık olmalı.</Text>
 </>}
 renderItem={({item})=>{
  const all=scheduleFor(item,guide);const current=all.find(p=>p.start<=now&&p.end>now);const schedule=window==='reminders'?all.filter(p=>reminderSet.has(key(item,p))):programWindow(all,now,window);
  const open=expanded===item.id;
  return <View style={d.epgCard}><View style={d.between}><Logo item={item} size={42}/><Text style={[d.name,{flex:1}]} numberOfLines={1}>{item.name}</Text><IconButton small icon={Play} blue label={`${item.name} izle`} onPress={()=>onPlay(item)}/></View>
   {current&&<><Text style={d.secondary}>Şimdi: {current.title}</Text><ProgramBar program={current} now={now}/></>}
   {schedule.slice(0,open?120:3).map(p=><View key={p.start+'-'+p.title} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderTopWidth:1,borderTopColor:'#ffffff0d'}}><Text style={d.linkSmall}>{clock(p.start)}</Text><Text style={[d.secondary,{flex:1}]}>{p.title}</Text>{p.start>now&&<IconButton small icon={reminderSet.has(key(item,p))?BellRing:Bell} color={reminderSet.has(key(item,p))?c.blue:c.zinc400} label={`${p.title} ${reminderSet.has(key(item,p))?'hatırlatmayı kaldır':'hatırlat'}`} onPress={()=>onReminder?.(item,p)}/>}</View>)}
   {!schedule.length&&<Text style={d.micro}>{window==='tonight'?'Bu akşam için program verisi alınamadı.':'Bu aralıkta program verisi yok.'}</Text>}
   {schedule.length>3&&<Pill icon={ChevronDown} label={open?'Daralt':'Tüm programlar'} onPress={()=>setExpanded(open?null:item.id)}/>} 
  </View>;
 }} ListEmptyComponent={<Text style={d.emptyRail}>{window==='reminders'?'Henüz hatırlatıcı kurulmadı.':'Bu kategoride kanal yok.'}</Text>}/>;
}
