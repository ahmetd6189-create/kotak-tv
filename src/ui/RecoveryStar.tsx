import React,{useEffect,useRef} from 'react';
import {Animated,Easing,View} from './Native';
import {Star} from 'lucide-react-native';
import {colors} from '../theme';
export function RecoveryStar(){
 const turn=useRef(new Animated.Value(0)).current;const size=useRef(new Animated.Value(0.7)).current;
 useEffect(()=>{const animation=Animated.parallel([Animated.loop(Animated.timing(turn,{toValue:1,duration:1800,easing:Easing.linear,useNativeDriver:true})),Animated.loop(Animated.sequence([Animated.timing(size,{toValue:1,duration:650,useNativeDriver:true}),Animated.timing(size,{toValue:0.7,duration:650,useNativeDriver:true})]))]);animation.start();return()=>animation.stop();},[turn,size]);
 return <View accessibilityLabel="Yayın yeniden bağlanıyor" accessibilityRole="progressbar" style={{height:48,alignItems:'center',justifyContent:'center'}}><Animated.View style={{transform:[{rotate:turn.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})},{scale:size}]}}><Star size={30} fill={colors.blue} color={colors.blue}/></Animated.View></View>;
}

