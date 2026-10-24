export const ACCOUNT_URL='https://wfojcndrxribmamniaui.supabase.co';
// Publishable client key; never put a service-role key in the app.
export const ACCOUNT_KEY='sb_publishable_UJfirknXdHlJOyTME_6whg_ESb7YUBn';
export type Access={id:string;kind:'trial'|'subscription';expiresAt:number;verifiedAt:number;serverTime:number;active:boolean};
type Session={access_token:string;refresh_token:string;expires_at:number;user:{id:string;email?:string}};
export type TokenStore={getItem:()=>Promise<string|null>;setItem:(value:string)=>Promise<void>;removeItem:()=>Promise<void>};
export class AccountError extends Error{constructor(public code:string,public status=0){super(code);}}
export function accessResult(v:any):Access{
 if(!v||v.verified!==true||typeof v.id!=='string'||!['trial','subscription'].includes(v.kind)||![v.expiresAt,v.verifiedAt,v.serverTime].every(Number.isFinite)||typeof v.active!=='boolean'||v.active!==(v.expiresAt>v.serverTime))throw new AccountError('INVALID_RESPONSE');
 return v;
}
export class AccountClient{
 private session:Session|null=null;
 private generation=0;
 private refreshing:Promise<Session|null>|null=null;
 private recovery:{token:string;expiresAt:number}|null=null;
 constructor(private store:TokenStore,private request:typeof fetch=fetch){}
 private async call(path:string,body:unknown,token?:string,method='POST'){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{const r=await this.request(ACCOUNT_URL+path,{method,headers:{apikey:ACCOUNT_KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),signal:controller.signal});const data=await r.json().catch(()=>null);if(!r.ok)throw new AccountError(data?.error_code||data?.code||data?.error||(r.status>=500?'SERVER_ERROR':'REQUEST_FAILED'),r.status);return data;}
  catch(e){if(e instanceof AccountError)throw e;throw new AccountError('NETWORK_ERROR');}finally{clearTimeout(timer);}
 }
 private async save(data:any,generation=this.generation){
  if(generation!==this.generation)throw new AccountError('SIGN_IN_REQUIRED',401);
  if(typeof data.access_token!=='string'||typeof data.refresh_token!=='string'||!data.user?.id||!Number.isFinite(data.expires_in))throw new AccountError('INVALID_RESPONSE');
  // Only the short refresh token is stored in the device keychain. Passwords/access tokens are not persisted.
  await this.store.setItem(data.refresh_token);
  if(generation!==this.generation)throw new AccountError('SIGN_IN_REQUIRED',401);
  this.session={...data,expires_at:Date.now()+data.expires_in*1000};return this.session;
 }
 async restore(){
  if(this.session&&this.session.expires_at>Date.now()+60000)return this.session;
  if(this.refreshing)return this.refreshing;
  const generation=this.generation;
  this.refreshing=(async()=>{const token=await this.store.getItem();if(!token)return null;
   try{return await this.save(await this.call('/auth/v1/token?grant_type=refresh_token',{refresh_token:token}),generation);}
   catch(e){if(e instanceof AccountError&&[400,401,403].includes(e.status)){if(generation===this.generation)await this.store.removeItem();if(generation===this.generation){this.session=null;}return null;}throw e;}
  })();try{return await this.refreshing;}finally{this.refreshing=null;}
 }
 async signIn(email:string,password:string){return this.save(await this.call('/auth/v1/token?grant_type=password',{email:email.trim(),password}));}
 async signUp(email:string,password:string){const data=await this.call('/auth/v1/signup',{email:email.trim(),password});if(data.access_token)return this.save(data);return null;}
 async verify(email:string,token:string){return this.save(await this.call('/auth/v1/verify',{email:email.trim(),token:token.trim(),type:'email'}));}
 async resend(email:string){await this.call('/auth/v1/resend',{email:email.trim(),type:'signup'});}
 async requestRecovery(email:string){this.recovery=null;await this.call('/auth/v1/recover',{email:email.trim()});}
 async verifyRecovery(email:string,token:string){
  const generation=this.generation;
  const data=await this.call('/auth/v1/verify',{email:email.trim(),token:token.trim(),type:'recovery'});
  if(generation!==this.generation)throw new AccountError('SIGN_IN_REQUIRED',401);
  if(typeof data?.access_token!=='string'||!Number.isFinite(data.expires_in)||!data.user?.id)throw new AccountError('INVALID_RESPONSE');
  // Recovery credentials never enter the normal session or persistent keychain.
  this.recovery={token:data.access_token,expiresAt:Date.now()+Math.min(data.expires_in,600)*1000};
 }
 async updateRecoveredPassword(password:string){
  const recovery=this.recovery;
  if(!recovery||recovery.expiresAt<=Date.now()){this.recovery=null;throw new AccountError('RECOVERY_EXPIRED');}
  if(password.length<8)throw new AccountError('weak_password');
  await this.call('/auth/v1/user',{password},recovery.token,'PUT');
  this.recovery=null;
  // Revoke refresh sessions after reset. Existing access JWTs expire on the server's schedule.
  let revoked=true;
  try{await this.call('/auth/v1/logout?scope=global',{},recovery.token);}catch{revoked=false;}
  await this.signOut();return {revoked};
 }
 cancelRecovery(){this.recovery=null;}
 async access(start=false):Promise<Access|null>{
  const s=await this.restore();if(!s)throw new AccountError('SIGN_IN_REQUIRED',401);
  try{return accessResult(await this.call('/functions/v1/kotak-access',{action:start?'trial':'status'},s.access_token));}
  catch(e){if(e instanceof AccountError&&e.status===404&&!start)return null;throw e;}
 }
 async signOut(){this.generation++;this.recovery=null;this.session=null;await this.store.removeItem();}
}
export function accountMessage(error:unknown){
 const code=error instanceof AccountError?error.code:'';
 if(['invalid_credentials','invalid_grant'].includes(code))return 'E-posta veya şifre hatalı. Şifreni unuttuysan sıfırlayabilirsin.';
 if(['email_not_confirmed','VERIFIED_ACCOUNT_REQUIRED'].includes(code))return 'Önce e-posta adresini doğrula. Doğrulama kodunu yeniden gönderebilirsin.';
 if(['over_email_send_rate_limit','over_request_rate_limit','RATE_LIMITED'].includes(code)||(error instanceof AccountError&&error.status===429))return 'Çok fazla deneme yapıldı. Bir süre bekleyip tekrar dene.';
 if(code==='email_address_not_authorized')return 'Bu adrese e-posta gönderimine izin verilmiyor. Destek ile iletişime geç.';
 if(['SIGN_IN_REQUIRED','INVALID_SESSION'].includes(code))return 'Oturumun sona erdi. Tekrar giriş yap.';
 if(code==='weak_password')return 'En az 8 karakterli, tahmin edilmesi zor bir şifre belirle.';
 if(code==='same_password')return 'Yeni şifren önceki şifrenden farklı olmalı.';
 if(['otp_expired','otp_disabled','validation_failed'].includes(code))return 'Kod geçersiz veya süresi dolmuş. Son gelen kodu kontrol et veya yeni kod iste.';
 if(code==='RECOVERY_EXPIRED')return 'Şifre sıfırlama oturumu sona erdi. Yeni kod iste.';
 if(code==='NETWORK_ERROR')return 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.';
 if(['unexpected_failure','SERVER_ERROR'].includes(code))return 'Hesap sunucusunda işlem tamamlanamadı. E-posta gönderim hizmetinde sorun olabilir. Biraz sonra dene veya destek ile iletişime geç.';
 if(code==='INVALID_RESPONSE')return 'Sunucudan beklenmeyen yanıt alındı. Tekrar dene.';
 return 'İşlem tamamlanamadı. Tekrar dene veya destek ile iletişime geç.';
}
