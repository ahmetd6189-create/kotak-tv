import {localeFor} from '../native/i18n';
import * as Notifications from 'expo-notifications';
import {scheduleExpiryNotices,type Entitlement} from '../native/entitlement';
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from './Native';
import { BarChart3, Check, Languages, Mic, Play, Shield, Sparkles, Users, WifiOff } from 'lucide-react-native';
import type { Entry } from '../native/iptv';
import { smartMatches } from '../native/offline';
import { Pill, Sheet, d } from './Design';
import { colors as c } from '../theme';
export const FEATURE_NAMES = ['Yapay Zeka Sesli Komut','AI Canlı Maç Analizi','Kişisel AI TV Asistanı','AI Canlı Ses Çevirisi','Yayını paylaş','Çevrimdışı Mod & 24s EPG'];
const icons=[Mic,BarChart3,Sparkles,Languages,Users,WifiOff];
export function FeaturesPanel({active,entries,cacheTime,onOpen,onPlay,onClose}: {active:string;entries:Entry[];cacheTime:number|null;onOpen:(name:string)=>void;onPlay:(item:Entry)=>void;onClose:()=>void}) {
 const [query,setQuery]=useState('');
 const matches=useMemo(()=>query.trim()?smartMatches(entries,query).slice(0,30):[],[entries,query]);
 const voice=active===FEATURE_NAMES[0]; const match=active===FEATURE_NAMES[1]; const recap=active===FEATURE_NAMES[2]; const translation=active===FEATURE_NAMES[3]; const share=active===FEATURE_NAMES[4]; const offline=active===FEATURE_NAMES[5];
 const hub=![voice,match,recap,translation,share,offline].some(Boolean);
 return <Sheet visible full={hub} title={hub?'Kotak TV Özellikleri':active} onClose={onClose}>
  {hub? <>{FEATURE_NAMES.filter((_,i)=>[0,4,5].includes(i)).map(name=>{const i=FEATURE_NAMES.indexOf(name);const Icon=icons[i];return <Pressable key={name} style={s.row} onPress={()=>onOpen(name)}><Icon color={c.blue} size={24}/><View style={{flex:1}}><Text style={d.name}>{name}</Text><Text style={d.micro}>{i===5?'Kayıtlı kanal bilgileri ve program rehberi':i===0?'Türkçe ses tanıma ile içerik aç':'Servis bağlantısı bekleniyor'}</Text></View></Pressable>})}</>:
  <>
   <View style={s.orb}>{React.createElement(icons[FEATURE_NAMES.indexOf(active)] || Sparkles,{size:38,color:c.blue})}</View>
   <Text style={d.h2}>{voice?'Ne izlemek istersin?':match?'Maçın nabzı':recap?'Senin TV asistanın':translation?'Türkçe canlı altyazı':share?'Yayını paylaş':'24 saatlik program rehberi'}</Text>
   {voice&&<>
    <Text style={s.copy}>Ses tanıma servisi henüz bağlı değil. Komutunu yazarak mevcut listende yerel filtreleme yapabilirsin.</Text>
    <TextInput accessibilityLabel="Akıllı arama komutu" value={query} onChangeText={setQuery} placeholder="Bana spor kanallarını bul" placeholderTextColor={c.zinc500} style={s.input}/>
    <View style={{gap:8,marginVertical:12}}>{['Bana spor kanallarını bul','Aksiyon filmlerini getir'].map(text=><Pill key={text} label={text} onPress={()=>setQuery(text)}/>)}</View>
    {matches.map(e=><Pressable key={e.id} style={s.row} onPress={()=>{onClose();onPlay(e);}}><View style={{flex:1}}><Text style={d.name}>{e.name}</Text><Text style={d.secondary}>{e.group}</Text></View><Play color={c.blue} size={18}/></Pressable>)}
    {!!query&&!matches.length&&<Text style={s.copy}>Listende eşleşen içerik bulunamadı.</Text>}
   </>}
   {match&&<>
    <Text style={s.copy}>Canlı maç ve oyuncu verisi sağlayıcısı bağlı değil.</Text>
    <View style={s.box}><Text style={d.secondary}>Gol ihtimali</Text><Text style={s.metric}>—</Text><View style={s.track}/><Text style={d.micro}>Tahmin verisi bekleniyor</Text></View>
    <View style={s.row}><Text style={[d.secondary,{flex:1}]}>Oyuncu performansı</Text><Text style={d.name}>—</Text></View>
   </>}
   {recap&&<><Text style={s.copy}>Kaçırdığın yayınların 1 dakikalık özetleri burada yer alacak.</Text><View style={s.box}><Text style={d.name}>Henüz özet yok</Text><Text style={s.copy}>Özet servisi ve işlenecek yayın kaydı bağlandığında kullanılabilir.</Text></View></>}
   {translation&&<><Text style={s.copy}>Türkçe • Canlı çeviri</Text><View style={s.box}><Text style={d.name}>Altyazı bekleniyor…</Text><Text style={s.copy}>Canlı sesi işleyen çeviri servisi henüz bağlı değil. Yayının kendi altyazıları oynatıcıdaki Ses ve Altyazı menüsünden seçilebilir.</Text></View></>}
   {share&&<Text style={s.copy}>Oynatıcıdaki Yayını paylaş düğmesi bağlantıyı telefonunun paylaşım menüsüne iletir. Oda, eş zamanlı oynatma veya paylaşım sunucusu kullanılmaz.</Text>}
   {offline&&<><Text style={s.copy}>Kanal adları, kategoriler ve sağlayıcının gönderdiği 24 saatlik EPG cihazda saklanır.</Text><View style={s.box}><Text style={d.name}>{cacheTime?'Önbellek hazır':'Henüz önbellek yok'}</Text><Text style={s.copy}>{cacheTime?`Son kayıt: ${new Date(cacheTime).toLocaleString(localeFor())}`:'Bir IPTV listesi yüklediğinde önbellek oluşturulur.'}</Text><Text style={d.secondary}>İnternet olmadan canlı video oynatılamaz. EPG yalnızca sağlayıcının gönderdiği programları içerir.</Text></View></>}
  </>}
 </Sheet>;
}
export function ProPanel({onClose,accountEmail,onSignOut,entitlement,onEnableNotices}:{onClose:()=>void;accountEmail?:string;onSignOut?:()=>void;entitlement?:Entitlement;onEnableNotices?:()=>Promise<string>}) {
 const [plan,setPlan]=useState('year');
 const [notificationMessage,setNotificationMessage]=useState('');
 return <Sheet visible title="Kotak TV PRO" onClose={onClose}>
  <View style={s.orb}><Sparkles color={c.blue} size={40}/></View>
  <Text style={[d.h2,{textAlign:'center'}]}>TV deneyimini özgürleştir</Text>
  <Text style={[s.copy,{textAlign:'center'}]}>24 saat ücretsiz deneme</Text>
  {['Kendi listelerinle canlı TV, film ve dizi','Çoklu ekran ve resim içinde resim','Telefon ve Android TV deneyimi'].map(text=><View key={text} style={s.row}><Check size={20} color={c.blue}/><Text style={[d.name,{flex:1}]}>{text}</Text></View>)}
  {[{id:'month',title:'Aylık',price:'₺249',sub:'Aylık Kotak Pro'},{id:'year',title:'Yıllık',price:'₺999',sub:'Yıllık Kotak Pro · Popüler'}].map(p=><Pressable accessibilityRole="radio" accessibilityState={{checked:plan===p.id}} key={p.id} onPress={()=>setPlan(p.id)} style={[s.plan,plan===p.id&&{borderColor:c.blue}]}><View style={{flex:1}}><Text style={d.h2}>{p.title} {p.price}</Text><Text style={[d.secondary,{marginTop:6}]}>{p.sub}</Text></View>{plan===p.id&&<Check size={24} color={c.blue}/>}</Pressable>)}
  {!!accountEmail&&<Text style={s.copy}>{accountEmail}</Text>}
  {!!entitlement&&<Text style={s.copy}>Kullanım bitişi: {new Date(entitlement.expiresAt).toLocaleString(localeFor())}</Text>}
  {!!entitlement&&<Pill label="Süre bildirimlerini aç" onPress={()=>{void (async()=>{try{if(onEnableNotices){setNotificationMessage(await onEnableNotices());return;}const p=await Notifications.requestPermissionsAsync();if(!p.granted){setNotificationMessage('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.');return;}await scheduleExpiryNotices(entitlement);setNotificationMessage('Süre bildirimleri açıldı.');}catch{setNotificationMessage('Bildirimler planlanamadı. Tekrar dene.');}})();}}/>}
  {!!notificationMessage&&<Text style={s.copy}>{notificationMessage}</Text>}
  {!!onSignOut&&<Pill label="Hesaptan çıkış yap" onPress={onSignOut}/>}
  <Pill disabled active label="Mağaza bağlantısı bekleniyor" onPress={()=>{}}/>
  <Text style={s.copy}>Abonelik satın alma henüz açılmadı. Deneme süren hesabına bağlıdır; yeniden yükleme süreyi sıfırlamaz.</Text>
 </Sheet>;
}
export function AboutPanel({onClose}:{onClose:()=>void}) {
 return <Sheet visible title="Hakkında" onClose={onClose}>
  <View style={[s.orb,{backgroundColor:c.blue,width:112,height:112,borderRadius:30}]}><Play color="white" size={52}/></View>
  <Text style={[d.h2,{textAlign:'center',letterSpacing:4}]}>KOTAK TV</Text><Text style={[s.copy,{textAlign:'center'}]}>Sürüm 1.0.16</Text>
  <View style={s.box}><Text style={s.copy}>Kotak TV, kendi IPTV listenizle canlı yayın, film ve dizi izlemek için tasarlanmış bir oynatıcıdır. İçerik sağlayıcınızın M3U veya Xtream Codes bilgileriyle kullanılır.</Text><Text style={d.secondary}>Desteklenen yayınlarda tam ekran, ses/altyazı seçimi, 2/4 ekran ve PiP sunar. Görüntü kalitesi kaynak yayına ve cihaz desteğine bağlıdır.</Text></View>
  <Pressable onPress={()=>void Linking.openURL('mailto:defsearchtv@gmail.com').catch(()=>{})}><Text style={[d.name,{color:c.blue,marginVertical:24}]}>defsearchtv@gmail.com</Text></Pressable>
 </Sheet>;
}
const s=StyleSheet.create({orb:{height:88,width:88,borderRadius:44,backgroundColor:'#007aff22',alignSelf:'center',alignItems:'center',justifyContent:'center',marginVertical:24},row:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:17,borderBottomWidth:1,borderBottomColor:'#ffffff12'},input:{padding:16,backgroundColor:'#29292c',color:c.white,fontSize:16,borderRadius:16},copy:{color:c.zinc400,fontSize:15,lineHeight:23,marginVertical:14},box:{backgroundColor:'#242426',borderRadius:24,padding:20,marginVertical:14,gap:8},metric:{fontSize:48,color:c.blue,fontWeight:'800'},track:{height:5,borderRadius:5,backgroundColor:'#444449',marginVertical:12},plan:{borderWidth:2,borderColor:'#ffffff15',borderRadius:20,backgroundColor:'#29292c',padding:20,marginVertical:8,flexDirection:'row',alignItems:'center',gap:12}});
