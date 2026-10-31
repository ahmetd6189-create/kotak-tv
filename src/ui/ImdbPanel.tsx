import React,{useEffect,useRef,useState} from 'react';
import {Linking,Text,TextInput,View} from './Native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {candidateMedia} from '../native/catalog-tools';
import {lookupImdb,metadataKey,type ImdbInfo} from '../native/imdb';
import type {Entry} from '../native/iptv';
import {Pill,Sheet,d} from './Design';
import {colors as c} from '../theme';
export function ImdbPanel({entries,cache,onUpdate,onClose}:{entries:Entry[];cache:Record<string,ImdbInfo>;onUpdate:(data:Record<string,ImdbInfo>)=>void;onClose:()=>void}){
 const [key,setKey]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const job=useRef<AbortController|null>(null);
 useEffect(()=>{void SecureStore.getItemAsync('kotak.omdb.key').then(v=>{if(v)setKey(v)}).catch(()=>{});return()=>job.current?.abort()},[]);
 async function load(){
  if(!key.trim()){setNotice('Kendi OMDb API anahtarını gir.');return;}
  const controller=new AbortController();job.current=controller;setBusy(true);setNotice('IMDb bilgileri alınıyor…');
  try{
   await SecureStore.setItemAsync('kotak.omdb.key',key.trim());
   const result={...cache};const candidates=candidateMedia(entries);let found=0;let checked=0;
   for(const item of candidates){
    if(controller.signal.aborted)return;
    const id=metadataKey(item);const saved=result[id];
    if(!saved||Date.now()-saved.updatedAt>7*86400000){const data=await lookupImdb(item,key.trim(),controller.signal);if(data){result[id]=data;found++;}}
    else found++;
    checked++;setNotice(`${checked}/${candidates.length} içerik kontrol edildi · ${found} doğrulanmış eşleşme`);
   }
   if(controller.signal.aborted)return;
   const bounded=Object.fromEntries(Object.entries(result).sort((a,b)=>b[1].updatedAt-a[1].updatedAt).slice(0,500));
   await AsyncStorage.setItem('kotak.imdb',JSON.stringify(bounded));onUpdate(bounded);
   setNotice(`${found} içerik eşleşti. IMDb puanı en az 7 olanlar ana ekranda sıralandı.`);
  }catch(e){if(!controller.signal.aborted)setNotice(e instanceof Error?e.message:'IMDb bilgisi alınamadı.');}finally{if(!controller.signal.aborted)setBusy(false);}
 }
 return <Sheet visible title="IMDb’ye göre film ve diziler" onClose={()=>{job.current?.abort();onClose()}}>
  <Text style={d.h2}>Gerçek puanlar, doğru içerik</Text><Text style={[d.secondary,{marginVertical:16}]}>Kanal logoları bu listede gösterilmez. Sağlayıcının IMDb bilgisi yoksa OMDb üzerinden başlık/IMDb kimliği eşleştirilir. Eşleşmeyen içerik için puan uydurulmaz.</Text>
  <TextInput accessibilityLabel="OMDb API anahtarı" value={key} onChangeText={setKey} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="OMDb API anahtarın" placeholderTextColor={c.zinc500} style={{padding:16,backgroundColor:'#2c2c2e',borderRadius:14,color:c.white,fontSize:16}}/>
  <View style={{marginVertical:16}}><Pill label="OMDb anahtarı al" onPress={()=>void Linking.openURL('https://www.omdbapi.com/apikey.aspx').catch(()=>{})}/></View>
  <Text style={d.micro}>İşlem seçtiğin veri servisine en fazla 20 film ve 20 dizi başlığı gönderir. IPTV sunucu adresin ve şifren gönderilmez.</Text>
  <View style={{marginVertical:20}}><Pill active disabled={busy} label={busy?'Bilgiler alınıyor…':'IMDb listesini hazırla'} onPress={()=>void load()}/></View>
  {!!notice&&<Text style={d.secondary}>{notice}</Text>}
 </Sheet>;
}
