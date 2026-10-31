import {localeFor} from '../native/i18n';
import React,{useMemo,useState} from 'react';
import {Pressable,Text,View} from './Native';
import type {Entry,Program} from '../native/iptv';
import {Pill,Sheet,clock,d} from './Design';
import {cleanSchedule} from '../native/schedule';
export function ChannelSchedule({item,programs,now,reminders,onReminder,onPlay,onClose}:{item:Entry;programs:Program[];now:number;reminders:string[];onReminder:(p:Program)=>void;onPlay:()=>void;onClose:()=>void}){
 const list=useMemo(()=>cleanSchedule(programs),[programs]);const [selected,setSelected]=useState<number|null>(null);
 return <Sheet visible title={`${item.name} · Yayın Akışı`} onClose={onClose}>
 {!list.length&&<Text style={d.secondary}>Sağlayıcı bu kanal için program bilgisi göndermedi.</Text>}
 {list.map(p=>{const past=p.end<=now,live=p.start<=now&&!past;return <View key={p.start+"-"+p.title} style={{paddingVertical:14,borderBottomWidth:1,borderColor:'#ffffff18',opacity:past?0.45:1}}>
 <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Pressable accessibilityRole="button" accessibilityLabel={p.title} disabled={past} onPress={()=>setSelected(selected===p.start?null:p.start)} style={{flex:1,gap:6}}><Text style={d.micro}>{new Date(p.start).toLocaleDateString(localeFor(),{day:'numeric',month:'short'})} · {clock(p.start)} – {clock(p.end)}</Text><Text verbatim style={d.name}>{p.title}</Text><Text style={d.micro}>{past?'Sona erdi':live?'Şimdi yayında':'Program ayrıntıları'}</Text></Pressable>
 {p.start>now&&<Pill label={reminders.includes(`kotak-${item.id}-${p.start}`)?'Hatırlatmayı kaldır':'Hatırlat'} onPress={()=>onReminder(p)}/>}</View>
 {selected===p.start&&!past&&<View style={{paddingTop:14,gap:8}}><Text style={d.secondary}>{p.description||'Sağlayıcı bu program için açıklama vermedi.'}</Text>{!!p.category&&<Text style={d.secondary}>Tür: {p.category}</Text>}{!!p.guests&&<Text style={d.secondary}>Konuklar: {p.guests}</Text>}{live&&<Pill active label="Canlı Yayını İzle" onPress={onPlay}/>}</View>}
 </View>})}
 </Sheet>;
}
