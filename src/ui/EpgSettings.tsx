import React,{useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {httpUrl,inferredEpgUrl,type PlaylistConfig} from '../native/iptv';
import {Pill,Sheet,d} from './Design';
import {colors as c} from '../theme';
export function EpgSettings({configs,onSave,onClose}:{configs:PlaylistConfig[];onSave:(config:PlaylistConfig)=>Promise<void>;onClose:()=>void}){
 const [index,setIndex]=useState(0);const [url,setUrl]=useState(configs[0]?.epgUrl||'');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const config=configs[index];
 async function save(auto:boolean){
  if(!config)return;setBusy(true);setError('');
  try{const value=auto?inferredEpgUrl({...config,epgUrl:undefined}):httpUrl(url);if(!value)throw new Error('Bu listeden otomatik EPG adresi bulunamadı. Sağlayıcının XMLTV bağlantısını girin.');await onSave({...config,epgUrl:value});onClose();}
  catch(e){setError(e instanceof Error?e.message:'EPG adresi kaydedilemedi.');}finally{setBusy(false);}
 }
 return <Sheet visible title="EPG Kaynağı" onClose={onClose}>
  <Text style={d.secondary}>Program rehberi için sağlayıcının XMLTV bağlantısı gerekir. Aynı kanal kimlikleri veya eşleşen kanal adları kullanılır.</Text>
  <View style={{gap:8,marginVertical:18}}>{configs.map((c,i)=><Pill key={c.id} label={c.name} active={i===index} onPress={()=>{setIndex(i);setUrl(c.epgUrl||'')}}/>)}</View>
  {!configs.length?<Text style={d.secondary}>Önce IPTV listesi ekleyin.</Text>:<><TextInput accessibilityLabel="XMLTV adresi" value={url} onChangeText={setUrl} placeholder="https://sağlayıcı/epg.xml" placeholderTextColor={c.zinc500} autoCapitalize="none" autoCorrect={false} style={{padding:16,backgroundColor:'#2c2c2e',borderRadius:16,color:c.white,fontSize:16}}/>
  <View style={{gap:12,marginVertical:20}}><Pill active disabled={busy} label="Kaydet ve EPG’yi getir" onPress={()=>void save(false)}/><Pill disabled={busy} label="Otomatik EPG adresini kullan" onPress={()=>void save(true)}/></View></>}
  {!!error&&<Text style={{color:c.red}}>{error}</Text>}
 </Sheet>;
}
