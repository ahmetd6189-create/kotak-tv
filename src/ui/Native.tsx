import React,{forwardRef} from 'react';
import * as RN from 'react-native';
import {useAppearance,accentFor,Language,Appearance} from './Appearance';
import dictionary from './translations.json';
export * from 'react-native';
export function translate(text:unknown,language:Language|null):any{if(typeof text!=='string'||!language||language==='tr')return text;const d=dictionary as Record<string,Record<string,string>>;return d[text]?.[language]||text;}
const caches=new Map<string,Map<unknown,unknown>>();
function themed(style:any,value:Appearance):any{if(!style)return style;const key=value.theme+accentFor(value);let cache=caches.get(key);if(!cache){cache=new Map();if(caches.size>8)caches.clear();caches.set(key,cache);}if(cache.has(style))return cache.get(style);const flat=RN.StyleSheet.flatten(style);if(!flat)return flat;const out={...flat};for(const prop of ['color','backgroundColor','borderColor','borderTopColor','borderBottomColor']){const v=out[prop];if(typeof v!=='string')continue;if(v.toLowerCase()==='#007aff')out[prop]=accentFor(value);if(value.theme==='midnight'&&['#000','#000000','#09090b'].includes(v))out[prop]='#0b1425';}if(cache.size>1500)cache.clear();cache.set(style,out);return out;}
export const Text=forwardRef<RN.Text,RN.TextProps>((props,ref)=>{const {value}=useAppearance();return <RN.Text {...props} ref={ref} style={themed(props.style,value)}>{React.Children.map(props.children,c=>typeof c==='string'?translate(c,value.language):c)}</RN.Text>;});
export const View=forwardRef<RN.View,RN.ViewProps>((props,ref)=>{const {value}=useAppearance();return <RN.View {...props} ref={ref} style={themed(props.style,value)}/>;});
export const Pressable=forwardRef<RN.View,RN.PressableProps>((props,ref)=>{const {value}=useAppearance();return <RN.Pressable {...props} ref={ref} accessibilityLabel={translate(props.accessibilityLabel,value.language)} style={typeof props.style==='function'?state=>themed((props.style as any)(state),value):themed(props.style,value)}/>;});
export const TextInput=forwardRef<RN.TextInput,RN.TextInputProps>((props,ref)=>{const {value}=useAppearance();return <RN.TextInput {...props} ref={ref} placeholder={translate(props.placeholder,value.language)} style={themed(props.style,value)}/>;});
