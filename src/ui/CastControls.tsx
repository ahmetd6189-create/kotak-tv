import React,{useState} from 'react';
import {Alert,Text,View} from './Native';
import {CastButton,useRemoteMediaClient,MediaStreamType} from 'react-native-google-cast';
import {castInfo} from '../native/cast';
import type {Entry} from '../native/iptv';
import {Pill,d} from './Design';
import {colors} from '../theme';
export function CastControls({item,position,onTransferred}:{item:Entry;position:number;onTransferred:()=>void}){
 const client=useRemoteMediaClient();const [busy,setBusy]=useState(false);
 const cast=async()=>{if(!client)return;setBusy(true);try{const uri=item.uri;
  if(item.headers&&Object.keys(item.headers).length)throw new Error('Bu kaynak özel HTTP başlıkları gerektiriyor. Bu TV alıcısı doğrudan aktarımı desteklemiyor; telefonda izleyebilirsin.');
  const media=castInfo(item,uri);await client.loadMedia({mediaInfo:{...media,streamType:item.kind==='live'?MediaStreamType.LIVE:MediaStreamType.BUFFERED},autoplay:true,startTime:item.kind==='live'?0:position});onTransferred();
 }catch(e){Alert.alert('TV’ye aktar',(e as Error).message);}finally{setBusy(false);}};
 return <View style={{flexDirection:'row',alignItems:'center',gap:8}}><CastButton accessibilityLabel="TV cihazı seç" style={{width:36,height:36,tintColor:colors.blue}}/>{client?<Pill active disabled={busy} label={busy?'Aktarılıyor…':'TV’de oynat'} onPress={()=>void cast()}/>:<Text style={d.micro}>TV seç</Text>}</View>;
}

