import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,Text,TextInput,View,StyleSheet} from './Native';
import {AccountClient,AccountError,accountMessage} from '../native/account-core';
export type AuthClient=Pick<AccountClient,'signIn'|'signUp'|'verify'|'resend'|'requestRecovery'|'verifyRecovery'|'updateRecoveredPassword'|'cancelRecovery'>;
type Mode='login'|'signup'|'confirm'|'recover'|'recovery-code'|'new-password';
// UX throttling complements Supabase's server-side limits; it is not an authorization boundary.
export function AccountForm({client,onAuthenticated,onRecoveryChange,externalBusy=false}:{externalBusy?:boolean;client:AuthClient;onAuthenticated:()=>Promise<void>;onRecoveryChange:(active:boolean)=>void}){
 const [mode,setMode]=useState<Mode>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[code,setCode]=useState('');
 const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [until,setUntil]=useState(0),[lockedUntil,setLockedUntil]=useState(0),[now,setNow]=useState(Date.now());
 const failures=useRef(0),working=useRef(false),mounted=useRef(true);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{mounted.current=false;clearInterval(timer);client.cancelRecovery?.();onRecoveryChange(false);};},[]);
 const wait=Math.max(0,Math.ceil((until-now)/1000)),locked=Math.max(0,Math.ceil((lockedUntil-now)/1000));
 const move=(next:Mode)=>{if(working.current)return;client.cancelRecovery();onRecoveryChange(['recover','recovery-code','new-password'].includes(next));setMode(next);setPassword('');setRepeat('');setCode('');setShow(false);setError('');setNotice('');};
 const validEmail=()=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
 const sent=()=>{const time=Date.now();setNow(time);setUntil(time+60000);setCode('');setNotice('Bu adres için işlem yapılabiliyorsa kod gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');};
 const run=async(job:()=>Promise<void>)=>{
  if(working.current||externalBusy||Date.now()<lockedUntil)return;working.current=true;setBusy(true);setError('');setNotice('');
  try{await job();}catch(e){if(mounted.current){setError(accountMessage(e));if(e instanceof AccountError&&(['otp_expired','invalid_credentials','validation_failed','invalid_grant'].includes(e.code)||e.status===429)){
   failures.current++;if(failures.current>=5||e.status===429){const time=Date.now();setNow(time);setLockedUntil(time+60000);failures.current=0;}
  }}}finally{working.current=false;if(mounted.current)setBusy(false);}
 };
 const submit=()=>{
  if(!validEmail()){setError('Geçerli bir e-posta adresi gir.');return;}
  if((mode==='signup'||mode==='new-password')&&(password.length<8||password!==repeat)){setError(password.length<8?'En az 8 karakterli şifre belirle.':'Şifreler eşleşmiyor.');return;}
  if(mode==='login'&&!password){setError('Şifreni gir.');return;}
  if((mode==='confirm'||mode==='recovery-code')&&!/^\d{6,10}$/.test(code.trim())){setError('E-postandaki doğrulama kodunu eksiksiz gir.');return;}
  if(mode==='recover'&&Date.now()<until)return;
  void run(async()=>{
   if(mode==='recover'){await client.requestRecovery(email);if(!mounted.current)return;sent();setMode('recovery-code');return;}
   if(mode==='recovery-code'){await client.verifyRecovery(email,code);if(!mounted.current)return;setCode('');setMode('new-password');failures.current=0;return;}
   if(mode==='new-password'){const result=await client.updateRecoveredPassword(password);if(!mounted.current)return;onRecoveryChange(false);setPassword('');setRepeat('');setShow(false);setMode('login');failures.current=0;setNotice(result.revoked?'Şifren güncellendi. Yeni şifrenle giriş yap.':'Şifren güncellendi. Diğer oturumları kapatma işlemi doğrulanamadı. Yeni şifrenle giriş yap.');return;}
   const session=mode==='confirm'?await client.verify(email,code):mode==='signup'?await client.signUp(email,password):await client.signIn(email,password);
   if(!mounted.current)return;setPassword('');setRepeat('');setShow(false);
   if(!session){sent();setMode('confirm');return;}
   failures.current=0;setCode('');await onAuthenticated();
  });
 };
 const resend=()=>{if(Date.now()<until||!validEmail())return;void run(async()=>{if(mode==='recovery-code')await client.requestRecovery(email);else await client.resend(email);if(mounted.current)sent();});};
 const button=(label:string,fn:()=>void,secondary=false,disabled=false)=><Pressable accessibilityRole="button" disabled={busy||externalBusy||locked>0||disabled} onPress={fn} style={[s.button,secondary&&s.secondary,(busy||locked>0||disabled)&&s.disabled]}><Text style={s.buttonText}>{label}</Text></Pressable>;
 const title={login:'Hoş geldin',signup:'Hesap oluştur',confirm:'E-postanı doğrula',recover:'Şifremi unuttum','recovery-code':'Sıfırlama kodunu gir','new-password':'Yeni şifreni belirle'}[mode];
 return <View style={s.form}>
  <Text style={s.title}>{title}</Text>
  <Text style={s.copy}>{mode==='login'||mode==='signup'?'24 saatlik denemeni hesabınla başlat. Aynı hesabın kalan kullanım süresi korunur.':mode==='new-password'?'Yeni şifren en az 8 karakter olsun. Başka hesaplarında kullandığın şifreyi kullanma.':'E-posta adresine gönderilen tek kullanımlık kodla devam et. Kodunu kimseyle paylaşma.'}</Text>
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!notice&&<Text style={s.copy}>{notice}</Text>}
  {locked>0&&<Text accessibilityRole="alert" style={s.error}>Çok fazla deneme. {locked} saniye sonra tekrar dene.</Text>}
  {busy&&<ActivityIndicator color="#007AFF" accessibilityLabel="İşlem yapılıyor"/>}
  <TextInput accessibilityLabel="E-posta" placeholder="E-posta" placeholderTextColor="#999" style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!busy&&!['confirm','recovery-code','new-password'].includes(mode)}/>
  {(mode==='confirm'||mode==='recovery-code')&&<TextInput accessibilityLabel="Doğrulama kodu" placeholder="E-postadaki doğrulama kodu" placeholderTextColor="#999" style={s.input} value={code} onChangeText={v=>setCode(v.replace(/\D/g,'').slice(0,10))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" editable={!busy&&locked===0} onSubmitEditing={submit}/>}
  {['login','signup','new-password'].includes(mode)&&<>
   <TextInput accessibilityLabel="Hesap şifresi" placeholder={mode==='login'?'Şifre':'Şifre (en az 8 karakter)'} placeholderTextColor="#999" style={s.input} value={password} onChangeText={setPassword} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} textContentType={mode==='login'?'password':'newPassword'} editable={!busy} onSubmitEditing={submit}/>
   {mode!=='login'&&<TextInput accessibilityLabel="Şifre tekrarı" placeholder="Şifreyi tekrar gir" placeholderTextColor="#999" style={s.input} value={repeat} onChangeText={setRepeat} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" editable={!busy} onSubmitEditing={submit}/>}
   {button(show?'Şifreyi gizle':'Şifreyi göster',()=>setShow(!show),true)}
  </>}
  {button({login:'Giriş yap',signup:'Hesap oluştur',confirm:'Kodu doğrula',recover:wait>0?`Tekrar gönder (${wait} sn)`:'Sıfırlama kodu gönder','recovery-code':'Kodu doğrula','new-password':'Yeni şifreyi kaydet'}[mode],submit,false,mode==='recover'&&wait>0)}
  {(mode==='confirm'||mode==='recovery-code')&&button(wait>0?`Tekrar gönder (${wait} sn)`:'Kodu yeniden gönder',resend,true,wait>0)}
  {mode==='login'&&<>{button('Şifremi unuttum',()=>move('recover'),true)}{button('E-postamı doğrula',()=>move('confirm'),true)}{button('Yeni hesap oluştur',()=>move('signup'),true)}</>}
  {mode!=='login'&&button('Giriş ekranına dön',()=>move('login'),true)}
 </View>;
}
const s=StyleSheet.create({form:{gap:16},title:{color:'#fff',fontSize:28,fontWeight:'700'},copy:{color:'#aaa',fontSize:15,lineHeight:23},error:{color:'#ff7777',fontSize:15,lineHeight:22},input:{color:'#fff',backgroundColor:'#18181b',borderRadius:14,padding:16,fontSize:16},button:{backgroundColor:'#007AFF',padding:16,borderRadius:14,alignItems:'center'},secondary:{backgroundColor:'#202024'},disabled:{opacity:0.5},buttonText:{color:'#fff',fontSize:16,fontWeight:'600'}});
