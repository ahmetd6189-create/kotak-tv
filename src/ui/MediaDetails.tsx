import React,{useState} from 'react';
import {ActivityIndicator,Image,Linking,Modal,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {ChevronLeft,Play,Plus} from 'lucide-react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {Entry,ProviderInfo} from '../native/iptv';
import type {ImdbInfo} from '../native/imdb';
import {mediaTitle} from '../native/catalog-tools';
import {IconButton,Pill,d} from './Design';
import {PosterRail} from './CatalogView';
import {CustomBottomNav} from '../components/CustomBottomNav';
import type {BottomNavTab} from '../types/iptv';
export function releaseLabel(info?:Pick<ImdbInfo,'released'|'year'>){
 if(info?.released){const date=new Date(info.released);if(Number.isFinite(date.getTime()))return new Intl.DateTimeFormat('tr-TR',{year:'numeric',month:'long',timeZone:'UTC'}).format(date);}
 return info?.year||'Yayın tarihi bilinmiyor';
}
export function MediaDetails({item,info,provider,loading,onPlay,onClose,onFollow,similar=[],onSelect,onNavigate}:{item:Entry;info?:ImdbInfo;provider?:ProviderInfo;loading?:boolean;onPlay:()=>void;onClose:()=>void;onFollow?:()=>void;similar?:Entry[];onSelect?:(e:Entry)=>void;onNavigate?:(tab:BottomNavTab)=>void}){
 const [expanded,setExpanded]=useState(false);const insets=useSafeAreaInsets();const {width}=useWindowDimensions();
 const poster=info?.poster||provider?.poster||item.logo;const rating=info?.rating||provider?.imdbRating||item.imdbRating;const plot=info?.plot||provider?.plot;const castNames=provider?.cast?.split(/[,·]/).map(v=>v.trim()).filter(Boolean).slice(0,15)||[];const cast=provider?.actors?.length?provider.actors:castNames.map(name=>({name,photo:undefined}));
 return <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}><View style={{flex:1,backgroundColor:'#000',paddingTop:insets.top}}>
 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:140}}>
  <View style={{width:'100%',height:Math.min(width*1.25,580),backgroundColor:'#111'}}>{!!poster&&<Image accessibilityLabel={`${mediaTitle(item.name)} afişi`} source={{uri:poster}} resizeMode="cover" style={StyleSheet.absoluteFill}/>}
   <View style={{position:'absolute',top:10,left:16,right:16,flexDirection:'row',justifyContent:'space-between'}}><IconButton icon={ChevronLeft} label="Detayı kapat" onPress={onClose}/>{onFollow&&<IconButton icon={Plus} label="Diziyi takip et" onPress={onFollow}/>}</View>
  </View>
  <View style={{padding:16}}><View style={{flexDirection:'row',justifyContent:'center',gap:12,flexWrap:'wrap',marginBottom:14}}><Text style={d.secondary}>{rating?`IMDb ${rating.toFixed(1)}`:provider?.rating?`Sağlayıcı ${provider.rating.toFixed(1)}`:'Puan bilgisi yok'}</Text><Text style={d.secondary}>{releaseLabel(info||{released:provider?.released||item.released})}</Text>{!!provider?.duration&&<Text style={d.secondary}>{provider.duration}</Text>}</View>
   <Text style={[d.h2,{textAlign:'center',fontSize:23}]}>{info?.title||provider?.title||mediaTitle(item.name)}</Text>
   {loading&&<ActivityIndicator accessibilityLabel="İçerik bilgisi alınıyor" style={{marginTop:12}} color="#007AFF"/>}
   <Text numberOfLines={expanded?undefined:4} style={[d.secondary,{marginTop:18,lineHeight:23}]}>{plot|| (loading?'İçerik bilgileri alınıyor…':'Sağlayıcı bu içerik için özet vermedi.')}</Text>
   {!!plot&&plot.length>180&&<Pressable accessibilityRole="button" onPress={()=>setExpanded(v=>!v)}><Text style={[d.linkSmall,{marginTop:4}]}>{expanded?'Daha az':'Daha fazla'}</Text></Pressable>}
   <View style={{marginTop:18,marginBottom:22}}><Pill active icon={Play} label="İzle" onPress={onPlay}/></View>
   {!!provider?.trailer&&<Pill label="Fragmanı izle" icon={Play} onPress={()=>{void Linking.openURL(provider.trailer!).catch(()=>{});}}/>}
   {!!provider?.cast&&<Text style={[d.secondary,{lineHeight:22,marginBottom:8}]}>Yıldız {provider.cast}</Text>}{!!provider?.director&&<Text style={[d.secondary,{marginBottom:8}]}>Yönetmen {provider.director}</Text>}<Text style={d.secondary}>Tür {info?.genre||provider?.genre||item.genre||item.group}</Text>
   {!!cast.length&&<><Text style={[d.h2,{marginTop:24,marginBottom:12}]}>Ana Kadro</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:16}}>{cast.map(({name,photo})=><View key={name} style={{width:76,alignItems:'center'}}><View style={{width:66,height:66,borderRadius:40,backgroundColor:'#252529',alignItems:'center',justifyContent:'center'}}>{photo?<Image source={{uri:photo}} accessibilityLabel={name} style={{width:66,height:66,borderRadius:40}}/>:<Text style={{color:'#aaa',fontSize:22}}>{name.split(' ').map(v=>v[0]).slice(0,2).join('')}</Text>}</View><Text numberOfLines={2} style={[d.micro,{textAlign:'center',marginTop:8}]}>{name}</Text></View>)}</ScrollView></>}
   {!!provider?.backdrops.length&&<><Text style={[d.h2,{marginTop:24,marginBottom:12}]}>Resimler</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}>{provider.backdrops.map(url=><Image key={url} source={{uri:url}} style={{width:230,height:130,borderRadius:12}}/>)}</ScrollView></>}
  </View>
  {!!similar.length&&<PosterRail title="Benzer Başlıklar" items={similar} onSelect={e=>onSelect?.(e)} onMore={()=>{}}/>}
 </ScrollView><CustomBottomNav currentTab="ANASAYFA" onTabChange={value=>{onClose();onNavigate?.(value);}}/>
 </View></Modal>;
}

