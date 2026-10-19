import React,{useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {Bell} from 'lucide-react-native';
import type {Entry,Program} from '../native/iptv';
import {Sheet,Pill,clock,d} from './Design';
import {colors} from '../theme';
export function ReminderPicker({item,program,onSave,onClose}:{item:Entry;program:Program;onSave:(minutes:number)=>Promise<void>;onClose:()=>void}){
 const [minutes,setMinutes]=useState('5');const [error,setError]=useState('');const [saving,setSaving]=useState(false);
 return <Sheet visible compact title="Ne zaman hatırlatayım?" onClose={onClose}><Text style={d.h2}>{program.title}</Text><Text style={[d.secondary,{marginVertical:12}]}>{item.name} · {clock(program.start)}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:12}}>{[5,10,15,30,60].map(n=><Pill key={n} label={n===60?'1 saat kala':`${n} dk kala`} active={minutes===String(n)} onPress={()=>setMinutes(String(n))}/>)}</View><TextInput accessibilityLabel="Hatırlatma süresi dakika" keyboardType="number-pad" value={minutes} onChangeText={setMinutes} placeholder="Dakika" placeholderTextColor={colors.zinc500} style={{color:colors.white,backgroundColor:'#2c2c2e',borderRadius:12,padding:14,marginBottom:16}}/>{!!error&&<Text style={{color:colors.red,marginBottom:12}}>{error}</Text>}<Pill active icon={Bell} disabled={saving} label={saving?'Kaydediliyor…':'Hatırlat'} onPress={()=>{setSaving(true);setError('');void onSave(Number(minutes)).catch(e=>setError(e.message)).finally(()=>setSaving(false));}}/></Sheet>;
}
