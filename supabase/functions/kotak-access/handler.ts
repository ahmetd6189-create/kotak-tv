type Config={url:string;publicKey:string;secretKey:string};
type Fetcher=(input:string,init?:RequestInit)=>Promise<Response>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createAccessHandler(config:Config,fetcher:Fetcher=fetch){
 if(!config.url||!config.publicKey||!config.secretKey||!config.url.startsWith('https://'))throw new Error('Server configuration missing');
 const root=config.url.replace(/\/$/,'');
 return async(req:Request):Promise<Response>=>{
  if(req.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
  const auth=req.headers.get('Authorization')||'';
  if(!/^Bearer [^\s]{20,8192}$/.test(auth))return json(401,{error:'SIGN_IN_REQUIRED'});
  if(Number(req.headers.get('content-length'))>2048)return json(413,{error:'REQUEST_TOO_LARGE'});
  let value:Record<string,unknown>;
  try{
   // Bound body memory even if Content-Length is absent or misleading.
   const reader=req.body?.getReader();let total=0,text='';const decoder=new TextDecoder();
   if(reader)while(true){const {done,value:chunk}=await reader.read();if(done)break;total+=chunk.byteLength;if(total>2048){await reader.cancel();return json(413,{error:'REQUEST_TOO_LARGE'});}text+=decoder.decode(chunk,{stream:true});}
   text+=decoder.decode();value=JSON.parse(text||'{}');
   if(!value||Array.isArray(value)||typeof value!=='object'||!['trial','status'].includes(String(value.action)))return json(400,{error:'INVALID_ACTION'});
  }catch{return json(400,{error:'INVALID_JSON'});}
  try{
   // Validate the user's access token with Supabase Auth; never trust decoded claims alone.
   const authResponse=await fetcher(root+'/auth/v1/user',{headers:{apikey:config.publicKey,Authorization:auth},signal:AbortSignal.timeout(8000)});
   if(!authResponse.ok)return authResponse.status>=500?json(503,{error:'AUTH_UNAVAILABLE'}):json(401,{error:'INVALID_SESSION'});
   const user=await authResponse.json();
   if(!uuid.test(user?.id||'')||user.is_anonymous===true||!(user.email_confirmed_at||user.phone_confirmed_at))return json(403,{error:'VERIFIED_ACCOUNT_REQUIRED'});
   const rpc=value.action==='trial'?'kotak_start_trial':'kotak_entitlement';
   const result=await fetcher(root+'/rest/v1/rpc/'+rpc,{method:'POST',headers:{apikey:config.secretKey,'Content-Type':'application/json',...(config.secretKey.startsWith('eyJ')?{Authorization:'Bearer '+config.secretKey}:{})},body:JSON.stringify({p_user_id:user.id}),signal:AbortSignal.timeout(8000)});
   if(!result.ok){let error:{message?:string}={};try{error=await result.json();}catch{}return json(error.message==='RATE_LIMITED'?429:503,{error:error.message==='RATE_LIMITED'?'TRY_LATER':'ACCESS_UNAVAILABLE'});}
   const entitlement=await result.json();if(!entitlement)return json(404,{error:'TRIAL_NOT_STARTED'});
   return json(200,entitlement);
  }catch{return json(503,{error:'ACCESS_UNAVAILABLE'});}
 };
}
