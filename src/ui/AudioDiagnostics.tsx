import React,{useState} from 'react';
import {Text,View} from './Native';
import {setAudioModeAsync,useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {Volume2} from 'lucide-react-native';
import {Pill,Sheet,d} from './Design';
import {colors as c} from '../theme';
export function AudioDiagnostics({onClose}:{onClose:()=>void}){
 const player=useAudioPlayer(require('../../assets/audio-check.wav'));const status=useAudioPlayerStatus(player);const [error,setError]=useState('');
 async function test(){try{setError('');await setAudioModeAsync({playsInSilentMode:true,allowsRecording:false,shouldPlayInBackground:false,shouldRouteThroughEarpiece:false,interruptionMode:'doNotMix'});player.volume=1;player.muted=false;await player.seekTo(0);player.play();}catch{setError('Test sesi başlatılamadı. Cihazın medya sesini ve ses çıkışını kontrol edin.');}}
 return <Sheet visible title="Ses Testi" onClose={onClose}><View style={{alignItems:'center',gap:20,paddingVertical:24}}><Volume2 size={42} color={c.blue}/><Text style={d.h2}>Cihazın sesini kontrol et</Text><Pill active label={status.playing?'Test sesi çalıyor…':'Test sesini çal'} onPress={()=>void test()}/></View><Text style={[d.secondary,{marginBottom:16}]}>Bu kısa ses uygulamanın içindedir; internet veya IPTV sağlayıcısı gerektirmez.</Text><Text style={d.secondary}>Test sesi duyulmuyorsa telefonun medya sesini ve bilgisayarın/emülatörün ses çıkışını kontrol et. Test duyuluyor ama yayın duyulmuyorsa oynatıcıdaki Ses ve Altyazı menüsünden ses parçasını seç.</Text>{!!error&&<Text style={{color:c.red,marginTop:16}}>{error}</Text>}</Sheet>;
}
