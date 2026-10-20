import React,{useMemo,useState} from 'react';
import {ActivityIndicator,FlatList,Modal,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Play,X} from 'lucide-react-native';
import type {Entry} from '../native/iptv';
import {IconButton,Pill,d} from './Design';
export function EpisodePanel({items,busy,onPlay,onClose}:{items:Entry[];busy:boolean;onPlay:(e:Entry)=>void;onClose:()=>void}){
 const insets=useSafeAreaInsets(),[season,setSeason]=useState('Tümü');const seasons=useMemo(()=>[...new Set(items.map(e=>e.name.match(/^S(\d+)/)?.[1]||'1'))],[items]);const data=useMemo(()=>season==='Tümü'?items:items.filter(e=>e.name.startsWith('S'+season+' ')),[items,season]);
 return <Modal visible animationType="slide" onRequestClose={onClose}><View style={{flex:1,backgroundColor:'#000',paddingTop:insets.top,paddingBottom:insets.bottom}}><View style={[d.between,{padding:16}]}><Text numberOfLines={1} style={[d.h2,{flex:1}]}>{items[0]?.group||'Bölümler'}</Text><IconButton icon={X} label="Bölümleri kapat" onPress={onClose}/></View>{busy&&<ActivityIndicator color="#007AFF"/>}<View><FlatList horizontal data={['Tümü',...seasons]} keyExtractor={v=>v} contentContainerStyle={{gap:8,paddingHorizontal:16,paddingBottom:12}} renderItem={({item})=><Pill label={item==='Tümü'?item:`${item}. Sezon`} active={season===item} onPress={()=>setSeason(item)}/>}/></View><FlatList data={data} initialNumToRender={12} maxToRenderPerBatch={12} windowSize={5} keyExtractor={e=>e.id} contentContainerStyle={{padding:16}} renderItem={({item})=><View style={[d.between,{paddingVertical:15,borderBottomWidth:1,borderColor:'#ffffff15'}]}><Text style={[d.name,{flex:1}]}>{item.name}</Text><IconButton small blue icon={Play} label={`${item.name} izle`} onPress={()=>onPlay(item)}/></View>}/></View></Modal>;
}
