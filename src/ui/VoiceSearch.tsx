import React,{useDeferredValue,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {Mic,Play} from 'lucide-react-native';
import {ExpoSpeechRecognitionModule,useSpeechRecognitionEvent} from 'expo-speech-recognition';
import {setAudioModeAsync} from 'expo-audio';
import type {Entry,Guide,Program} from '../native/iptv';
import {buildVoiceIndex} from '../native/catalog-tools';
import {assistantAnswer} from '../native/assistant';
import type {ImdbInfo} from '../native/imdb';
import {Pill,Sheet,clock,d} from './Design';
import {colors as c} from '../theme';
export function VoiceSearch({entries,guide={},metadata={},onReminder,onDetails,onFollowTeam,onPlay,onClose}:{entries:Entry[];guide?:Guide;metadata?:Record<string,ImdbInfo>;onReminder?:(item:Entry,p:Program)=>void;onFollowTeam?:(team:string)=>void;onDetails?:(item:Entry)=>void;onPlay:(item:Entry)=>void;onClose:()=>void}){
 const [text,setText]=useState('');const [listening,setListening]=useState(false);const [error,setError]=useState('');const delivered=useRef(false);
 const index=useMemo(()=>buildVoiceIndex(entries),[entries]);const deferredText=useDeferredValue(text);
 const answer=useMemo(()=>assistantAnswer(index,deferredText,guide,metadata),[index,deferredText,guide,metadata]);
 const results=answer.entries;
 useSpeechRecognitionEvent('start',()=>setListening(true));
 useSpeechRecognitionEvent('end',()=>{setListening(false);void setAudioModeAsync({allowsRecording:false,playsInSilentMode:true,shouldRouteThroughEarpiece:false,interruptionMode:'doNotMix'}).catch(()=>{});});
 useSpeechRecognitionEvent('error',event=>{setListening(false);setError(event.error==='not-allowed'?'Mikrofon izni verilmedi.':event.error==='no-speech'?'Ses algılanmadı. Tekrar deneyin.':'Ses tanıma tamamlanamadı. Google ses hizmetini ve internet bağlantısını kontrol edin.');});
 useSpeechRecognitionEvent('result',event=>{
  const spoken=event.results[0]?.transcript||'';setText(spoken);
  if(event.isFinal&&!delivered.current){const found=assistantAnswer(index,spoken,guide,metadata).autoPlay;if(found){delivered.current=true;ExpoSpeechRecognitionModule.stop();onClose();onPlay(found);}}
 });
 useEffect(()=>()=>{ExpoSpeechRecognitionModule.abort();},[]);
 async function start(){
  setError('');delivered.current=false;
  try{
   if(!ExpoSpeechRecognitionModule.isRecognitionAvailable())throw new Error('Bu cihazda ses tanıma hizmeti bulunamadı. Google ses hizmetini etkinleştirin.');
   const permission=await ExpoSpeechRecognitionModule.requestPermissionsAsync();
   if(!permission.granted)throw new Error('Sesli arama için mikrofon ve konuşma tanıma izni gerekiyor.');
   ExpoSpeechRecognitionModule.start({lang:'tr-TR',interimResults:true,continuous:false,maxAlternatives:1,contextualStrings:entries.slice(0,100).map(e=>e.name)});
  }catch(e){setError(e instanceof Error?e.message:'Sesli arama başlatılamadı.');}
 }
 return <Sheet visible title="Kotak TV Asistanı" onClose={onClose}>
  <View style={{alignItems:'center',padding:20,gap:16}}><Mic size={48} color={c.blue}/><Text style={d.h2}>{listening?'Dinliyorum…':'Ne açmamı istersin?'}</Text><Text style={[d.secondary,{textAlign:'center'}]}>“Bugün TRT 1’de ne var?”, “En yüksek IMDb puanlı aksiyon filmi öner” veya “Galatasaray maçını aç” de.</Text><Pill active label={listening?'Dinlemeyi durdur':'Konuşmaya başla'} onPress={()=>listening?ExpoSpeechRecognitionModule.stop():void start()}/></View>
  {!!error&&<Text style={{color:c.red,marginVertical:16}}>{error}</Text>}
  <TextInput accessibilityLabel="Sesli arama metni" placeholder="İstersen yazarak ara" placeholderTextColor={c.zinc500} value={text} onChangeText={setText} style={{padding:16,borderRadius:16,backgroundColor:'#2c2c2e',color:c.white,fontSize:16}}/>
  {!!text&&<Text style={[d.secondary,{marginTop:16}]}>{answer.message}</Text>}
  {answer.teamQuery&&!!answer.schedule?.length&&onFollowTeam&&<View style={{marginTop:16}}><Pill active label="Takip et" onPress={()=>{onClose();onFollowTeam(answer.teamQuery!);}}/></View>}
  {(answer.schedule||[]).map(({channel,programs})=><View key={channel.id} style={{marginTop:16}}><Text style={d.h2}>{channel.name}</Text>{programs.map(p=><View key={p.start} style={{flexDirection:'row',gap:10,alignItems:'center',paddingVertical:12}}><Text style={d.micro}>{clock(p.start)}</Text><Text style={[d.secondary,{flex:1}]}>{p.title}</Text>{p.start>Date.now()&&onReminder&&<Pill label="Hatırlat" onPress={()=>{onClose();onReminder(channel,p);}}/>}</View>)}</View>)}
  {(answer.mode==='schedule'?[]:results).map(item=><Pressable key={item.id} onPress={()=>{onClose();if(answer.mode==='recommend'&&onDetails)onDetails(item);else onPlay(item)}} style={{paddingVertical:16,borderBottomWidth:1,borderBottomColor:'#ffffff18',flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1}}><Text style={d.name}>{item.name}</Text><Text style={d.secondary}>{item.group}</Text></View><Play color={c.blue} size={20}/></Pressable>)}

 </Sheet>;
}
