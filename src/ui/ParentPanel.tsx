import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Check, Shield } from 'lucide-react-native';
import { Pill, Sheet, d } from './Design';
import { colors as c } from '../theme';
export type Protection = { pin: string; groups: string[]; failures?: number; blockedUntil?: number };
export const PROTECTION_KEY = 'kotak.protection.v1';
export function ParentPanel({ protection, child, groups, onChange, onClose }: { protection: Protection | null; child: boolean; groups: string[]; onChange: (value: Protection, child: boolean) => void; onClose: () => void }) {
 const [pin,setPin]=useState(''); const [confirm,setConfirm]=useState(''); const [error,setError]=useState(''); const [saving,setSaving]=useState(false);
 const [allowed,setAllowed]=useState(protection?.groups || []);
 const locked=!!protection && child;
 async function submit() {
  if(saving) return; setSaving(true); setError('');
  try {
   if(locked) {
    if((protection.blockedUntil || 0)>Date.now()) throw new Error('Çok fazla deneme. Beş dakika sonra tekrar deneyin.');
    if(pin!==protection.pin){
     const failures=(protection.failures || 0)+1;
     const next={...protection,failures,blockedUntil:failures>=5?Date.now()+300000:0};
     await SecureStore.setItemAsync(PROTECTION_KEY,JSON.stringify(next)); onChange(next,true);
     throw new Error('PIN yanlış.');
    }
    const next={...protection,failures:0,blockedUntil:0};
    await SecureStore.setItemAsync(PROTECTION_KEY,JSON.stringify(next)); onChange(next,false); setPin('');
   } else {
    if(!protection && (!/^\d{4,6}$/.test(pin) || pin!==confirm)) throw new Error('Aynı 4–6 haneli PIN’i iki alana da girin.');
    const next: Protection={pin:protection?.pin || pin,groups:allowed,failures:0,blockedUntil:0};
    await SecureStore.setItemAsync(PROTECTION_KEY,JSON.stringify(next)); onChange(next,true); onClose();
   }
  } catch(e){setError(e instanceof Error?e.message:'Profil kaydedilemedi.');} finally {setSaving(false);}
 }
 return <Sheet visible title="Güvenli Çocuk Profili" onClose={onClose}>
  <Shield size={40} color={c.blue} style={{alignSelf:'center',marginVertical:20}}/>
  <Text style={d.h2}>{locked?'Ebeveyn PIN’i':protection?'İzin verilen kategoriler':'Ebeveyn PIN’i oluştur'}</Text>
  <Text style={[d.secondary,{marginVertical:12}]}>{locked?'Yetişkin profiline geçmek ve ayarları değiştirmek için PIN’inizi girin.':'Çocuk profili yalnızca aşağıda seçtiğiniz canlı kanal kategorilerini gösterir. Film ve dizi kataloğu gizlenir. Yeniden açılışta çocuk profili etkin olur.'}</Text>
  {(!protection || locked)&&<TextInput accessibilityLabel="Ebeveyn PIN" placeholder="PIN" placeholderTextColor={c.zinc500} secureTextEntry keyboardType="number-pad" maxLength={6} value={pin} onChangeText={setPin} style={s.input}/>}
  {!protection&&<TextInput accessibilityLabel="PIN tekrar" placeholder="PIN tekrar" placeholderTextColor={c.zinc500} secureTextEntry keyboardType="number-pad" maxLength={6} value={confirm} onChangeText={setConfirm} style={s.input}/>}
  {!locked&&groups.map(group=><Pressable key={group} onPress={()=>setAllowed(v=>v.includes(group)?v.filter(g=>g!==group):[...v,group])} style={s.row}><Text style={[d.name,{flex:1}]}>{group}</Text>{allowed.includes(group)&&<Check size={20} color={c.blue}/>}</Pressable>)}
  {!locked&&!groups.length&&<Text style={d.secondary}>Kategori seçmek için önce bir IPTV listesi ekleyin.</Text>}
  {!!error&&<Text style={{color:c.red,marginVertical:16}}>{error}</Text>}
  <View style={{marginTop:20}}><Pill active disabled={saving} label={saving?'Kaydediliyor…':locked?'PIN ile aç':'Kaydet ve çocuk profiline geç'} onPress={()=>void submit()}/></View>
 </Sheet>;
}
const s=StyleSheet.create({input:{backgroundColor:'#2c2c2e',borderRadius:14,color:c.white,padding:16,fontSize:20,marginBottom:12},row:{flexDirection:'row',alignItems:'center',paddingVertical:16,borderBottomColor:'#ffffff18',borderBottomWidth:1}});
