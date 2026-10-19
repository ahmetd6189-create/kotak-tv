import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MoreHorizontal, Search } from 'lucide-react-native';
import type { MainTab } from '../types/iptv';
import { colors as c } from '../theme';
interface TopBarProps {
 currentTab: MainTab; onTabChange: (tab: MainTab) => void;
 onSearchClick: () => void; onOptionsClick: () => void;
 onAiVoiceClick?: () => void; onBackClick?: () => void;
 isEffectiveOffline?: boolean; onOpenOfflineModal?: () => void; onOpenScreenCast?: () => void;
}
export function TopBar({currentTab,onTabChange,onSearchClick,onOptionsClick,onBackClick}: TopBarProps) {
 const insets=useSafeAreaInsets();
 return <View style={[s.wrap,{paddingTop:insets.top+8}]}>
  <View style={s.row}>
   <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={onBackClick} style={s.circle}><ChevronLeft color={c.white} size={24}/></Pressable>
   <View style={s.tabs}>{(['ANASAYFA','CANLI','FILM'] as MainTab[]).map(tab=><Pressable key={tab} accessibilityRole="tab" accessibilityState={{selected:currentTab===tab}} onPress={()=>onTabChange(tab)} style={s.tab}><Text numberOfLines={1} style={[s.text,currentTab===tab&&{color:c.white}]}>{tab}</Text></Pressable>)}</View>
   <Pressable accessibilityRole="button" accessibilityLabel="Hızlı seçenekler" onPress={onOptionsClick} style={s.circle}><MoreHorizontal color={c.white} size={23}/></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Ara" onPress={onSearchClick} style={s.circle}><Search color={c.white} size={24}/></Pressable>
  </View>
 </View>;
}
const s=StyleSheet.create({wrap:{backgroundColor:c.bg},row:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingBottom:14},circle:{width:42,height:42,borderRadius:24,backgroundColor:'#202022',borderWidth:1,borderColor:'#ffffff12',alignItems:'center',justifyContent:'center'},tabs:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',minWidth:0},tab:{paddingVertical:12,paddingHorizontal:2},text:{fontSize:12,fontWeight:'700',color:c.zinc500}});
