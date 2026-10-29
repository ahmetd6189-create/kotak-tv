import {normalized} from '../native/catalog-tools';
import {TeamPicker} from './TeamPicker';
import {teams} from './Appearance';
import React,{useState} from 'react';
import {Pressable,Text,TextInput,View} from './Native';
import {Bell,Trash2} from 'lucide-react-native';
import type {FollowRule} from '../native/follow-core';
import {Pill,Sheet,d} from './Design';
import {colors} from '../theme';
export type FollowDraft=Pick<FollowRule,'kind'|'label'|'playlistId'|'seriesId'>;
export function FollowPanel({rules,initial,onSave,onRemove,onClose}:{rules:FollowRule[];initial?:FollowDraft;onSave:(draft:FollowDraft,minutes:number)=>Promise<void>;onRemove:(id:string)=>Promise<void>;onClose:()=>void}){
 const [draft,setDraft]=useState<FollowDraft>(()=>initial?{...initial,label:initial.kind==='team'?(teams.find(t=>normalized(t.name)===normalized(initial.label)||t.aliases.some(a=>normalized(a)===normalized(initial.label)))?.name||initial.label):initial.label}:{kind:'team',label:''});const [minutes,setMinutes]=useState(15);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const save=async()=>{setError('');setBusy(true);try{if(draft.kind!=='movies'&&draft.label.trim().length<3)throw new Error('Takım veya dizi adı en az 3 karakter olmalı.');if(draft.kind==='team'&&!teams.some(t=>t.name===draft.label))throw new Error('Lütfen listeden bir takım seçin.');if(draft.kind==='team'&&rules.filter(r=>r.kind==='team').length>=3&&!rules.some(r=>r.kind==='team'&&r.label===draft.label))throw new Error('En fazla 3 takım takip edebilirsiniz.');await onSave({...draft,label:draft.kind==='movies'?'Yeni Filmler':draft.label.trim()},minutes);if(draft.kind!=='team')onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <Sheet visible title="Takiplerim" onClose={onClose}>
 <Text style={d.h2}>{draft.kind==='series'?draft.label:'Takımını seç, maçını kaçırma'}</Text>
 {!initial&&<View style={[d.inline,{marginVertical:16}]}><Pill label="Takım" active={draft.kind==='team'} onPress={()=>setDraft({kind:'team',label:''})}/><Pill label="Yeni filmler" active={draft.kind==='movies'} onPress={()=>setDraft({kind:'movies',label:'Yeni Filmler'})}/></View>}
 {draft.kind==='team'&&<TeamPicker selected={draft.label} onSelect={label=>setDraft({...draft,label})}/>}
 {draft.kind==='team'&&<><Text style={[d.name,{marginTop:24,marginBottom:12}]}>Maçtan ne kadar önce?</Text><View style={d.inline}>{[15,30,60].map(n=><Pill key={n} label={n===60?'1 saat':`${n} dk`} active={minutes===n} onPress={()=>setMinutes(n)}/>)}</View></>}
 <Text style={[d.secondary,{marginVertical:20,lineHeight:22}]}>{draft.kind==='team'?'Önümüzdeki 24 saatte EPG’de bulunan maçlar için telefon hatırlatması kurulur.':draft.kind==='series'?'Takipten sonra listene eklenen yeni bölümler, liste yenilendiğinde bildirilir.':'Takipten sonra listene eklenen yeni filmler, liste yenilendiğinde bildirilir.'}</Text><Pill active icon={Bell} disabled={busy} label={busy?'Kaydediliyor…':'Takip et'} onPress={()=>void save()}/>
 {!!error&&<Text style={{color:colors.red,marginTop:12}}>{error}</Text>}
 <Pill label="Tamam" onPress={onClose}/><Text style={[d.h2,{marginTop:28,marginBottom:12}]}>Takip ettiklerin</Text>{!rules.length&&<Text style={d.secondary}>Henüz takip yok.</Text>}{rules.map(rule=><View key={rule.id} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:16,borderBottomWidth:1,borderBottomColor:'#ffffff14'}}><View style={{flex:1}}><Text style={d.name}>{rule.label}</Text><Text style={d.micro}>{rule.kind==='team'?`${rule.leadMinutes} dk önce` :rule.kind==='series'?'Yeni bölümler':'Yeni film eklenince'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`${rule.label} takibi bırak`} onPress={()=>void onRemove(rule.id).catch(e=>setError(e.message))}><Trash2 color={colors.zinc400} size={22}/></Pressable></View>)}
 <Text style={[d.micro,{marginTop:22,lineHeight:20}]}>Yeni içerik, uygulama açıkken veya listeyi yenilediğinde kontrol edilir. Uygulama kapalıyken anında yeni içerik bildirimi için sunucu push servisi gerekir. Kurulmuş maç hatırlatmaları uygulama kapalıyken de telefon tarafından işlenir.</Text>
 </Sheet>;
}

