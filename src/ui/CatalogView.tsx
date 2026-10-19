import React,{useMemo,useState} from 'react';
import {FlatList,Image,Pressable,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {ChevronLeft,ChevronRight,Film,LayoutGrid,Search} from 'lucide-react-native';
import type {Entry} from '../native/iptv';
import {mediaTitle} from '../native/catalog-tools';
import {IconButton,d} from './Design';
import {colors as c} from '../theme';
export function ratingLabel(item:Entry){return item.imdbRating?`IMDb ${item.imdbRating.toFixed(1)}`:item.rating&&item.rating<=10?`★ ${item.rating.toFixed(1)}`:'';}
export function dateLabel(value?:string){if(!value)return '';const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('tr-TR',{year:'numeric',month:'short',timeZone:'UTC'}).format(date):value;}
export function PosterCard({item,onPress,width=112,rank}:{item:Entry;onPress:()=>void;width?:number;rank?:number}){
 return <Pressable accessibilityRole="button" accessibilityLabel={`${mediaTitle(item.name)} detayları`} onPress={onPress} style={{width}}>
 <View style={{height:rank?width*.57:width*1.5,backgroundColor:'#19191b',borderRadius:10,overflow:'hidden',alignItems:'center',justifyContent:'center'}}>{item.logo?<Image source={{uri:item.logo}} resizeMode="cover" style={StyleSheet.absoluteFill}/>:<Film color={c.zinc500} size={30}/>}{!!rank&&<Text style={s.rank}>{rank}</Text>}{!rank&&!!ratingLabel(item)&&<Text style={s.score}>{ratingLabel(item)}</Text>}</View>
 <Text numberOfLines={2} style={s.name}>{mediaTitle(item.name)}</Text><Text numberOfLines={1} style={s.meta}>{rank?[ratingLabel(item),dateLabel(item.released)].filter(Boolean).join(' · '):item.genre||dateLabel(item.released)||item.group}</Text>
 </Pressable>;
}
export function PosterRail({title,items,onSelect,onMore}:{title:string;items:Entry[];onSelect:(item:Entry)=>void;onMore:()=>void}){
 return <View style={{marginTop:18}}><Pressable accessibilityRole="button" accessibilityLabel={`${title} tümünü göster`} onPress={onMore} style={s.header}><Text style={s.title}>{title} <Text style={s.count}>{items.length}</Text></Text><ChevronRight size={18} color={c.zinc400}/></Pressable>
 <FlatList horizontal data={items.slice(0,20)} keyExtractor={e=>e.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16,gap:10}} initialNumToRender={4} maxToRenderPerBatch={4} windowSize={3} renderItem={({item})=><PosterCard item={item} onPress={()=>onSelect(item)}/>}/>
 </View>;
}
export function CatalogView({title,items,ranked=false,onBack,onSelect}:{title:string;items:Entry[];ranked?:boolean;onBack:()=>void;onSelect:(e:Entry)=>void}){
 const [query,setQuery]=useState('');const [columns,setColumns]=useState(ranked?2:3);const {width}=useWindowDimensions();const cardWidth=(Math.min(width,672)-32-(columns-1)*10)/columns;
 const data=useMemo(()=>items.filter(e=>e.name.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))),[items,query]);
 return <View style={{flex:1,backgroundColor:'#000'}}><View style={s.pageHeader}><IconButton icon={ChevronLeft} label="Kataloğa geri dön" onPress={onBack}/><Text style={[d.name,{flex:1,textAlign:'center'}]}>{title}</Text><IconButton icon={LayoutGrid} label="Katalog sütun sayısını değiştir" onPress={()=>setColumns(v=>v===2?3:2)}/></View><View style={s.search}><Search size={16} color={c.zinc500}/><TextInput accessibilityLabel={`${title} içinde ara`} placeholder={`${title} içinde ara`} placeholderTextColor={c.zinc500} value={query} onChangeText={setQuery} style={{flex:1,color:'#fff',padding:8}}/></View>
 <FlatList key={columns} data={data} numColumns={columns} keyExtractor={e=>e.id} contentContainerStyle={{padding:16,paddingBottom:130}} columnWrapperStyle={{gap:10,marginBottom:16}} initialNumToRender={12} maxToRenderPerBatch={9} windowSize={5} renderItem={({item,index})=><PosterCard item={item} width={cardWidth} rank={ranked?index+1:undefined} onPress={()=>onSelect(item)}/>} ListEmptyComponent={<Text style={d.secondary}>Bu görünümde içerik bulunamadı.</Text>}/></View>;
}
const s=StyleSheet.create({header:{paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:5,marginBottom:10},title:{fontSize:21,fontWeight:'700',color:'#fff'},count:{fontSize:13,color:c.zinc500},name:{fontSize:14,color:'#fff',marginTop:6,lineHeight:18},meta:{fontSize:11,color:c.zinc400,marginTop:3},score:{position:'absolute',right:5,bottom:6,color:'#fff',fontSize:10,backgroundColor:'#000a',paddingHorizontal:5,paddingVertical:3,borderRadius:6},rank:{position:'absolute',right:4,bottom:-9,fontSize:76,fontWeight:'900',color:'#ffffffaa'},pageHeader:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:8},search:{marginHorizontal:16,flexDirection:'row',alignItems:'center',backgroundColor:'#1c1c1e',borderRadius:12,paddingHorizontal:10}});
