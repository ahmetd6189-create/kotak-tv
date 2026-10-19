import React,{useEffect,useRef,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {CastButton,useRemoteMediaClient,MediaStreamType} from 'react-native-google-cast';
import {castInfo} from '../native/cast';
import {serviceConfig,serviceRequest} from '../native/shareplay';
import type {Entry} from '../native/iptv';
import {Pill,d} from './Design';
import {colors} from '../theme';
export function CastControls({item,position,onTransferred}:{item:Entry;position:number;onTransferred:()=>void}){
 const client=useRemoteMediaClient();const [busy,setBusy]=useState(false);const castRoom=useRef<{id:string;config:NonNullable<Awaited<ReturnType<typeof serviceConfig>>>}|null>(null);
 useEffect(()=>{if(!client&&castRoom.current){const room=castRoom.current;castRoom.current=null;void serviceRequest(room.config,`/v1/rooms/${room.id}`,'DELETE').catch(()=>{});}},[client]);
 const cast=async()=>{if(!client)return;setBusy(true);try{let uri=item.uri;
  if(item.headers&&Object.keys(item.headers).length){const config=await serviceConfig();if(!config)throw new Error('Bu kaynak özel yayın başlıkları istiyor. Güvenli TV aktarımı için Kotak servisini bağlamak gerekiyor.');const result=await serviceRequest(config,'/v1/rooms','POST',{uri:item.uri,headers:item.headers,title:item.name,live:item.kind==='live',mode:'cast'});if(typeof result.castSource!=='string'||new URL(result.castSource).origin!==new URL(config.url).origin)throw new Error('TV aktarım bağlantısı alınamadı.');castRoom.current={id:result.id,config};uri=result.castSource;}
  const media=castInfo(item,uri);await client.loadMedia({mediaInfo:{...media,streamType:item.kind==='live'?MediaStreamType.LIVE:MediaStreamType.BUFFERED},autoplay:true,startTime:item.kind==='live'?0:position});onTransferred();
 }catch(e){Alert.alert('TV’ye aktar',(e as Error).message);}finally{setBusy(false);}};
 return <View style={{flexDirection:'row',alignItems:'center',gap:8}}><CastButton accessibilityLabel="TV cihazı seç" style={{width:36,height:36,tintColor:colors.blue}}/>{client?<Pill active disabled={busy} label={busy?'Aktarılıyor…':'TV’de oynat'} onPress={()=>void cast()}/>:<Text style={d.micro}>TV seç</Text>}</View>;
}
