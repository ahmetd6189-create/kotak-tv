import {relocalizeNotifications} from '../native/localized-notifications';
import React,{createContext,useContext,useEffect,useState} from 'react';
import {View,Text,Pressable,ScrollView,Image,StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import directory from '../native/team-directory.json';
import {languages,Language,isLanguage,setLanguage} from '../native/i18n';
export {languages,Language} from '../native/i18n';
export type Appearance={language:Language|null;theme:'oled'|'midnight';teamId:string|null;teamColors:boolean};
const defaults:Appearance={language:null,theme:'oled',teamId:null,teamColors:false};
const Context=createContext({value:{...defaults,language:'tr'} as Appearance,change:(_v:Partial<Appearance>)=>{}});
export const useAppearance=()=>useContext(Context);
export const teams=directory.teams;
const teamIndex=new Map(teams.map(t=>[t.id,t]));
export function accentFor(value:Appearance){const team=teamIndex.get(value.teamId||'');if(!value.teamColors||!team)return '#007AFF';const color=team.color;return /^#0{6}$/i.test(color)?(team.alternateColor!=='#000000'?team.alternateColor:'#aaaaaa'):color;}
export function accentText(value:Appearance){const hex=accentFor(value).slice(1);const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2]>0.179?'#000000':'#ffffff';}
export function AppearanceProvider({children}:{children:React.ReactNode}){
 const [value,setValue]=useState<Appearance>(defaults);const [ready,setReady]=useState(false);
 useEffect(()=>{void AsyncStorage.getItem('kotak.appearance').then(raw=>{if(raw){const v=JSON.parse(raw);setLanguage(v.language);setValue({...defaults,...v,language:isLanguage(v.language)?v.language:null});}}).catch(()=>{}).finally(()=>setReady(true));},[]);
 useEffect(()=>{if(value.language)void relocalizeNotifications().catch(()=>{});},[value.language]);
 const change=(v:Partial<Appearance>)=>setValue(prev=>{const next={...prev,...v};setLanguage(next.language);void AsyncStorage.setItem('kotak.appearance',JSON.stringify(next)).catch(()=>{});return next;});
 if(!ready)return <View style={{flex:1,backgroundColor:'#000'}}/>;
 return <Context.Provider value={{value,change}}>{value.language?children:<View style={{flex:1,backgroundColor:'#000',padding:28,justifyContent:'center'}}><Text style={{color:'#fff',fontSize:30,fontWeight:'700'}}>Kotak TV</Text><Text style={{color:'#aaa',fontSize:18,marginVertical:24}}>Dil seçin · Choose your language</Text>{Object.entries(languages).map(([id,label])=><Pressable key={id} onPress={()=>change({language:id as Language})} style={{padding:16,marginVertical:5,backgroundColor:'#1c1c1e',borderRadius:14}}><Text style={{color:'#fff',fontSize:18}}>{label}</Text></Pressable>)}</View>}</Context.Provider>;
}
export function TeamBrand(){const {value}=useAppearance();const team=teams.find(t=>t.id===value.teamId);return <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:6}}>{team&&value.teamColors&&<Image source={{uri:team.logo}} style={{width:24,height:24}}/>}<Text style={{color:accentFor(value),fontWeight:'800',fontSize:16}}>KOTAK TV</Text></View>;}
