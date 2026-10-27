import {AccountForm,type AuthClient} from './AccountForm';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import * as Notifications from 'expo-notifications';
import {SafeAreaView} from 'react-native-safe-area-context';
import {account} from '../native/account';
import {accountMessage,type Access} from '../native/account-core';
import {scheduleExpiryNotices,type Entitlement} from '../native/entitlement';
export type AccountProps={entitlement:Entitlement;accountEmail:string;onSignOut:()=>void;onEnableNotices?:()=>Promise<string>};
export function AccountGate({children,client=account}:{children:(props:AccountProps)=>React.ReactNode;client?:Pick<typeof account,'restore'|'access'|'signOut'>&AuthClient}){
 const [email,setEmail]=useState('');const [booted,setBooted]=useState(false);
 const [signed,setSigned]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [access,setAccess]=useState<Access|null>(null),[ready,setReady]=useState(false);
 const recoveryMode=useRef(false);
 const anchor=useRef({server:0,mono:0});const [clock,setClock]=useState(0);const flight=useRef(false);const generation=useRef(0);
 const serverNow=()=>anchor.current.server+Math.max(0,performance.now()-anchor.current.mono);
 const sync=async(start=false)=>{
  if(flight.current||recoveryMode.current)return;flight.current=true;const job=generation.current;setBusy(true);setError('');
  try{const s=await client.restore();if(job!==generation.current)return;setSigned(!!s);if(!s){setAccess(null);setReady(false);return;}setEmail(s.user.email||'');
   const value=await client.access(start);if(job!==generation.current)return;
   setAccess(value);setReady(true);if(value){anchor.current={server:value.serverTime,mono:performance.now()};setClock(value.serverTime);}
  }catch(e){if(job===generation.current){setReady(false);setError(accountMessage(e));}}finally{flight.current=false;if(job===generation.current){setBusy(false);setBooted(true);}}
 };
 useEffect(()=>{void sync();const sub=AppState.addEventListener('change',state=>{if(state==='active')void sync();});return()=>{generation.current++;sub.remove();};},[]);
 // One expiry deadline: a ticking gate otherwise rerenders the entire catalog every second.
 useEffect(()=>{if(!access?.active)return;const delay=Math.max(0,access.expiresAt-serverNow());const timer=setTimeout(()=>setClock(serverNow()),Math.min(Math.ceil(delay)+10,2147483647));return()=>clearTimeout(timer);},[access]);
 // Schedule only when the entitlement changes, not once per progress/clock update.
 useEffect(()=>{if(!ready)return;const offset=access?access.serverTime-Date.now():0;
  void scheduleExpiryNotices(access,offset).catch(()=>setNotice('Süre bildirimleri planlanamadı. Bildirim iznini kontrol et.'));
 },[ready,access?.id,access?.expiresAt]);
 const enableNotices=async()=>{
  if(!access)return 'Kullanım hakkı bulunamadı.';
  await Notifications.setNotificationChannelAsync('subscription',{name:'Kotak Pro süre bildirimleri',importance:Notifications.AndroidImportance.HIGH,sound:'default'});
  const permission=await Notifications.requestPermissionsAsync();if(!permission.granted)return 'Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.';
  await scheduleExpiryNotices(access,serverNow()-Date.now());return 'Süre bildirimleri açıldı.';
 };
 const signOut=async()=>{generation.current++;setAccess(null);setReady(false);setSigned(false);setBusy(true);setNotice('');try{await client.signOut();await scheduleExpiryNotices(null);}catch(e){setError(accountMessage(e));}finally{setBusy(false);}};
 const active=ready&&access?.active&&clock<access.expiresAt;
 if(active)return <>{children({entitlement:access,accountEmail:email,onSignOut:()=>void signOut(),onEnableNotices:enableNotices})}</>;
 const button=(label:string,fn:()=>void,secondary=false)=><Pressable accessibilityRole="button" disabled={busy} onPress={fn} style={[s.button,secondary&&s.secondary,busy&&{opacity:0.5}]}><Text style={s.buttonText}>{label}</Text></Pressable>;
 return <SafeAreaView style={s.root}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
  <Text style={s.brand}>KOTAK TV</Text>
  {signed&&<><Text style={s.title}>Kotak Pro</Text><Text style={s.copy}>{email}</Text></>}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!notice&&<Text style={s.copy}>{notice}</Text>}
  {busy&&<ActivityIndicator color="#007AFF" accessibilityLabel="Hesap kontrol ediliyor"/>}
  {!signed&&booted&&<AccountForm externalBusy={busy} client={client} onAuthenticated={()=>sync()} onRecoveryChange={active=>{recoveryMode.current=active;}}/>}
  {signed&&ready&&!access&&<>{button('24 saatlik denemeyi başlat',()=>void sync(true))}<Text style={s.copy}>Süre bu düğmeye bastığında başlar. Yayın listeni kendin eklersin.</Text></>}
  {signed&&ready&&access&&!active&&<><Text style={s.title}>Kullanım süren doldu</Text><Text style={s.copy}>Abonelik satın alma henüz açılmadı. Ödeme hazır olduğunda burada Google Play veya App Store üzerinden devam edebilirsin.</Text></>}
  {signed&&button('Durumu tekrar kontrol et',()=>void sync(),true)}
  {signed&&button('Hesaptan çıkış yap',()=>void signOut(),true)}
  {button('Destek: defsearchtv@gmail.com',()=>{void Linking.openURL('mailto:defsearchtv@gmail.com');},true)}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#000'},content:{flexGrow:1,justifyContent:'center',padding:28,gap:16,maxWidth:520,width:'100%',alignSelf:'center'},brand:{color:'#007AFF',fontSize:22,fontWeight:'800',letterSpacing:4},title:{color:'#fff',fontSize:28,fontWeight:'700'},copy:{color:'#aaa',fontSize:15,lineHeight:23},error:{color:'#ff7777',fontSize:15,lineHeight:22},input:{color:'#fff',backgroundColor:'#18181b',borderRadius:14,padding:16,fontSize:16},button:{backgroundColor:'#007AFF',padding:16,borderRadius:14,alignItems:'center'},secondary:{backgroundColor:'#202024'},buttonText:{color:'#fff',fontSize:16,fontWeight:'600'}});

