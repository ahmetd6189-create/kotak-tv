import React,{useMemo,useState} from 'react';
import {FlatList,Modal,Pressable,StyleSheet,Text,TextInput,View} from './Native';
import {Bell,Check,Mic,RefreshCw,X} from 'lucide-react-native';
import {IconButton,Pill,d} from './Design';
import {colors as c} from '../theme';
import type {CategoryItem} from '../types/iptv';
export function HomeActions({onVoice,onRefresh,loading,onFollows}:{onFollows?:()=>void;onVoice:()=>void;onRefresh:()=>void;loading:boolean}){
 return <View style={s.actions}><Pressable accessibilityRole="button" accessibilityLabel="Sesli TV asistanını aç" onPress={onVoice} style={s.voice}><Mic color={c.blue} size={22}/><View><Text style={d.name}>Kotak TV Asistanı</Text></View></Pressable>{!!onFollows&&<IconButton icon={Bell} label="Takiplerim" onPress={onFollows}/>}<IconButton icon={RefreshCw} label={loading?'Yüklemeyi yeniden başlat':'Listeleri yenile'} onPress={onRefresh}/></View>;
}
export function CategoryPicker({groups,selected,onSave,onClose}:{groups:CategoryItem[];selected:string[]|null;onSave:(values:string[]|null)=>void;onClose:()=>void}){
 const [query,setQuery]=useState('');const [choices,setChoices]=useState(selected??groups.map(g=>g.name));
 const filtered=useMemo(()=>groups.filter(g=>g.name.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))),[groups,query]);
 return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={s.backdrop}><View style={s.panel}>
  <View style={d.between}><Text style={d.h2}>Ana ekran kategorileri</Text><IconButton icon={X} label="Kategorileri kapat" onPress={onClose}/></View>
  <Text style={[d.secondary,{marginVertical:12}]}>Yalnız seçtiğin kategoriler ana ekranda gösterilir.</Text>
  <TextInput accessibilityLabel="Kategori ara" placeholder="Kategori ara" placeholderTextColor={c.zinc500} value={query} onChangeText={setQuery} style={s.input}/>
  <View style={[d.inline,{marginVertical:12}]}><Pill label="Tümünü seç" onPress={()=>setChoices(groups.map(g=>g.name))}/><Pill label="Seçimi temizle" onPress={()=>setChoices([])}/></View>
  <FlatList style={{flex:1}} data={filtered} keyExtractor={g=>g.id} initialNumToRender={12} renderItem={({item})=><Pressable accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{checked:choices.includes(item.name)}} onPress={()=>setChoices(v=>v.includes(item.name)?v.filter(n=>n!==item.name):[...v,item.name])} style={s.row}><Text style={[d.name,{flex:1}]}>{item.name}</Text><Text style={d.secondary}>{item.channelCount}</Text>{choices.includes(item.name)&&<Check color={c.blue} size={22}/>}</Pressable>}/>
  <Pill active label={`Kaydet (${choices.length})`} onPress={()=>onSave(choices)}/>
 </View></View></Modal>;
}
const s=StyleSheet.create({actions:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,marginBottom:14},voice:{flex:1,flexDirection:'row',alignItems:'center',gap:8,padding:9,backgroundColor:'#101a29',borderWidth:1,borderColor:'#007aff55',borderRadius:16},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0009'},panel:{height:'87%',backgroundColor:'#1c1c1e',borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingBottom:30},input:{backgroundColor:'#2c2c2e',borderRadius:12,color:c.white,padding:14,fontSize:16},row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:16,borderBottomColor:'#ffffff12',borderBottomWidth:1}});

