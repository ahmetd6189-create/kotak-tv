import React,{useState} from 'react';
import {Share,Platform,Text,View} from './Native';
import type {Entry} from '../native/iptv';
import {Pill,Sheet,d} from './Design';
import {colors} from '../theme';
export function SharePanel({item,onClose}:{item?:Entry;onClose:()=>void;}){
 const [error,setError]=useState('');
 return <Sheet visible title="Yayını paylaş" onClose={onClose}><Text style={d.h2}>{item?.name||'Önce bir yayın aç'}</Text><Text style={[d.secondary,{marginVertical:20}]}>Yayın bağlantısını telefonundaki WhatsApp, Telegram, SMS veya diğer paylaşım uygulamalarıyla gönderebilirsin. Herkes kendi oynatıcısında izler.</Text><Pill active disabled={!item?.uri} label="Bağlantıyı paylaş" onPress={()=>{if(!item?.uri)return;void Share.share(Platform.OS==='ios'?{message:`Kotak TV · ${item.name}`,url:item.uri}:{message:`Kotak TV · ${item.name}\n${item.uri}`}).catch(()=>setError('Paylaşım menüsü açılamadı.'));}}/>{!!error&&<View style={{marginTop:12}}><Text style={{color:colors.red}}>{error}</Text></View>}</Sheet>;
}

