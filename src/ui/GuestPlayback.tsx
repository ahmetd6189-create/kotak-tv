import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {joinShareRoom,type ShareRoom} from '../native/shareplay';
import type {Invite} from '../native/invites';
import type {Entry} from '../native/iptv';
import {PlaybackPanel} from '../native/Player';
import {RecoveryStar} from './RecoveryStar';
import {Pill,d} from './Design';
export function GuestPlayback({invite,onClose}:{invite:Invite;onClose:()=>void}){
 const [result,setResult]=useState<{room:ShareRoom;item:Entry}|null>(null);const [error,setError]=useState('');
 useEffect(()=>{let active=true;void joinShareRoom(invite).then(value=>{if(active)setResult(value)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[invite]);
 if(result)return <PlaybackPanel items={[result.item]} room={result.room} mini={false} onClose={onClose}/>;
 return <View style={{flex:1,backgroundColor:'#000',padding:24,justifyContent:'center',gap:20}}>{!error&&<RecoveryStar/>}<Text style={d.h2}>{error||'Birlikte izleme odasına bağlanılıyor…'}</Text><Pill label="Kapat" onPress={onClose}/></View>;
}
