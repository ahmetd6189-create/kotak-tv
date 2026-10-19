import React from 'react';
import {Image,Text,View} from 'react-native';
import {Play,Star} from 'lucide-react-native';
import type {Entry} from '../native/iptv';
import type {ImdbInfo} from '../native/imdb';
import {mediaTitle} from '../native/catalog-tools';
import {Sheet,Pill,d} from './Design';
import {colors} from '../theme';
export function releaseLabel(info?:ImdbInfo){
 if(info?.released){const date=new Date(info.released);if(Number.isFinite(date.getTime()))return new Intl.DateTimeFormat('tr-TR',{year:'numeric',month:'long',timeZone:'UTC'}).format(date);}
 return info?.year||'Yayın tarihi bilinmiyor';
}
export function MediaDetails({item,info,onPlay,onClose}:{item:Entry;info?:ImdbInfo;onPlay:()=>void;onClose:()=>void}){
 const poster=info?.poster||item.logo;const rating=info?.rating||item.imdbRating;
 return <Sheet visible title={mediaTitle(item.name)} onClose={onClose}>
  {!!poster&&<Image accessibilityLabel={`${mediaTitle(item.name)} afişi`} source={{uri:poster}} resizeMode="contain" style={{width:'100%',height:250,borderRadius:18,backgroundColor:'#111'}}/>}
  <Text style={[d.h2,{marginTop:18}]}>{info?.title||mediaTitle(item.name)}</Text><View style={[d.inline,{marginVertical:12,flexWrap:'wrap'}]}><Text style={d.secondary}>{releaseLabel(info)}</Text><Star size={16} color="#f5c518"/><Text style={d.name}>{rating?`IMDb ${rating.toFixed(1)}`:'IMDb puanı bulunamadı'}</Text></View>
  <Text style={d.micro}>{info?.genre||item.group}</Text><Text style={[d.secondary,{marginVertical:20,lineHeight:23}]}>{info?.plot||'Bu içerik için özet alınamadı. IMDb veri bağlantısını ayarlardan ekleyebilirsin.'}</Text>
  <Pill active icon={Play} label="İzle" onPress={onPlay}/>
 </Sheet>;
}
