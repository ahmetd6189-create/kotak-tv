import React,{useEffect,useState} from 'react';
import {Share,Platform,Text,TextInput,View} from 'react-native';
import type {Entry} from '../native/iptv';
import {createShareRoom,saveServiceConfig,serviceConfig,type ShareRoom} from '../native/shareplay';
import {Pill,Sheet,d} from './Design';
import {colors} from '../theme';
export function SharePanel({item,room,onRoom,onClose,onConfigured}:{item?:Entry;room:ShareRoom|null;onRoom:(room:ShareRoom)=>void;onClose:()=>void;onConfigured:()=>void}){
 const [url,setUrl]=useState('');const [token,setToken]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [configured,setConfigured]=useState(false);
 useEffect(()=>{void serviceConfig().then(value=>{if(value){setUrl(value.url);setToken(value.token);setConfigured(true);}})},[]);
 async function create(){setBusy(true);setError('');try{const config={url,token};await saveServiceConfig(config);setConfigured(true);onConfigured();if(item)onRoom(await createShareRoom(config,item));}catch(e){setError(e instanceof Error?e.message:'Davet hazırlanamadı.');}finally{setBusy(false);}}
 return <Sheet visible title="Birlikte İzle" onClose={onClose}>
 {room&&room.itemId===item?.id?<><Text style={d.h2}>Davet hazır</Text><Text style={[d.secondary,{marginVertical:16}]}>Bu daveti yalnız bir konuk oturumu kullanabilir. Davet 15 dakika, izleme odası en fazla 2 saat geçerlidir.</Text><Pill active label="Davet bağlantısını paylaş" onPress={()=>void Share.share(Platform.OS==='ios'?{message:"Kotak TV’de birlikte izleyelim",url:room.url}:{message:`Kotak TV’de birlikte izleyelim: ${room.url}`})}/></>:<>
 <Text style={[d.secondary,{marginBottom:18}]}>{configured?'Davet yalnız şu an izlediğin yayını açar.':'Birlikte izleme servisi henüz bağlı değil. Kurulmuş Kotak sunucusunun adresi ve hesabına ait oturum anahtarı gerekiyor.'}</Text>
 {!configured&&<><TextInput accessibilityLabel="Kotak servis adresi" placeholder="https://kotak-servis-adresi" value={url} onChangeText={setUrl} autoCapitalize="none" placeholderTextColor={colors.zinc500} style={input}/><TextInput accessibilityLabel="Kotak servis oturum anahtarı" placeholder="Hesap oturum anahtarı" value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" placeholderTextColor={colors.zinc500} style={input}/></>}
 {!item&&<Text style={[d.micro,{marginBottom:12}]}>Davet oluşturmak için önce bir yayın aç.</Text>}<Pill active disabled={busy||configured&&!item} label={busy?'Hazırlanıyor…':item?'Tek kişilik davet oluştur':'Servisi bağla'} onPress={()=>void create()}/>
 {configured&&<Pill label="Servis ayarını değiştir" onPress={()=>setConfigured(false)}/>}
 </>}{!!error&&<Text style={{color:colors.red,marginTop:16}}>{error}</Text>}
 </Sheet>;
}
const input={padding:14,backgroundColor:'#2c2c2e',color:colors.white,borderRadius:12,marginBottom:12,fontSize:15};
