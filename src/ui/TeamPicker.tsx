import React,{useMemo,useState} from 'react';
import {Image,Pressable,Text,TextInput,View,ScrollView} from './Native';
import {teams,useAppearance} from './Appearance';
import {Pill,d} from './Design';
import {normalized} from '../native/catalog-tools';
export function TeamPicker({selected,onSelect}:{selected:string;onSelect:(name:string)=>void}){
 const [country,setCountry]=useState('Türkiye');const [query,setQuery]=useState('');const {value,change}=useAppearance();
 const visible=useMemo(()=>teams.filter(t=>t.country===country&&normalized(t.name+' '+t.fullName).includes(normalized(query))),[country,query]);
 return <View><Text style={[d.secondary,{marginVertical:12}]}>En fazla 3 takım takip edebilirsiniz. Ülke ve ligden takım seçin.</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{[...new Set(teams.map(t=>t.country))].map(c=><Pill key={c} label={c} active={country===c} onPress={()=>{setCountry(c);setQuery('');}}/>)}</View><Text style={[d.name,{marginTop:16}]}>{teams.find(t=>t.country===country)?.league}</Text><TextInput accessibilityLabel="Takım ara" value={query} onChangeText={setQuery} placeholder="Takım ara" placeholderTextColor="#888" style={{color:'#fff',padding:14,backgroundColor:'#222',borderRadius:14,marginVertical:12}}/>
 <ScrollView nestedScrollEnabled style={{maxHeight:260}}>{visible.map(t=><Pressable key={t.id} accessibilityRole="button" accessibilityState={{selected:selected===t.name}} onPress={()=>{onSelect(t.name);}} style={{flexDirection:'row',alignItems:'center',padding:10,gap:12,borderRadius:12,backgroundColor:selected===t.name?'#193254':'transparent'}}><Image source={{uri:t.logo}} style={{width:32,height:32}}/><Text style={[d.name,{flex:1}]}>{t.name}</Text>{selected===t.name&&<Text style={d.name}>✓</Text>}</Pressable>)}</ScrollView>
 {!!selected&&<Pill label="Bu takımın renklerini ve logosunu kullan" onPress={()=>{const team=teams.find(t=>t.name===selected);if(team)change({teamId:team.id,teamColors:true});}}/>}<Pill label="Kotak TV renklerini kullan" active={!value.teamColors} onPress={()=>change({teamColors:false})}/><Text style={[d.micro,{marginTop:10}]}>Logo ve renk seçimi uygulama içindeki görünümü değiştirir.</Text></View>;
}
