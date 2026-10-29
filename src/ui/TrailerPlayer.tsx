import React,{useMemo,useState} from 'react';
import {Modal,View,Text} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {X} from 'lucide-react-native';
import {IconButton,d} from './Design';
import {trailerId,trailerDocument} from '../native/trailer';
export function TrailerPlayer({url,onClose}:{url:string;onClose:()=>void}){
 const insets=useSafeAreaInsets();const id=trailerId(url);const [failed,setFailed]=useState(false);
 const source=useMemo(()=>id?{html:trailerDocument(id),baseUrl:'https://com.kotaktv.app'}:undefined,[id]);
 return <Modal visible animationType="slide" onRequestClose={onClose}><View style={{flex:1,backgroundColor:'#000',paddingTop:insets.top,paddingBottom:insets.bottom}}>
 <View style={{flexDirection:'row',alignItems:'center',padding:12,gap:12}}><IconButton icon={X} label="Fragmanı kapat" onPress={onClose}/><Text style={d.h2}>Fragman</Text></View>
 {source&&!failed?<WebView accessibilityLabel="Uygulama içi fragman" source={source} style={{flex:1,backgroundColor:'#000'}} javaScriptEnabled allowsInlineMediaPlayback allowsFullscreenVideo mediaPlaybackRequiresUserAction setSupportMultipleWindows={false} onOpenWindow={()=>{}} onError={()=>setFailed(true)} originWhitelist={['https://*','about:blank']} onShouldStartLoadWithRequest={request=>request.url==='about:blank'||request.url.startsWith('https://')} />:<Text style={[d.secondary,{padding:24}]}>Bu fragman uygulama içinde açılamadı. Film ayrıntılarına dönmek için kapat düğmesine dokun.</Text>}
 </View></Modal>;
}
