// Foundation: Android server verification. Deploy behind HTTPS; credentials stay on the server.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {createSign} from 'node:crypto';
import {database,trial,savePurchase,accountHash,validateJwt} from './core.mjs';
for(const name of ['AUTH_ISSUER','AUTH_AUDIENCE','AUTH_JWKS_URL','GOOGLE_CREDENTIALS_FILE'])if(!process.env[name])throw new Error(name+' must be configured');
if(!process.env.AUTH_JWKS_URL.startsWith('https://'))throw new Error('JWKS must use HTTPS');
const db=database(process.env.DATABASE_PATH||'kotak-billing.sqlite');const credentials=JSON.parse(readFileSync(process.env.GOOGLE_CREDENTIALS_FILE,'utf8'));const products=new Set(['kotak_pro_monthly','kotak_pro_yearly']);const packageName=process.env.ANDROID_PACKAGE||'com.kotaktv.app';let jwks,keysAt=0,access,accessUntil=0;
async function request(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('Upstream verification failed');const text=await r.text();return text?JSON.parse(text):{};}
async function googleToken(){if(access&&Date.now()<accessUntil)return access;const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const unsigned=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});const sig=createSign('RSA-SHA256').update(unsigned).sign(credentials.private_key,'base64url');const result=await request('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+sig})});access=result.access_token;accessUntil=Date.now()+3000000;return access;}
async function verifyPlay(subject,token){
 const auth=await googleToken(),root=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;const value=await request(`${root}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,{headers:{Authorization:'Bearer '+auth}});
 if(value.externalAccountIdentifiers?.obfuscatedExternalAccountId!==accountHash(subject))throw new Error('Account mismatch');
 const row=(value.lineItems||[]).filter(row=>products.has(row.productId)).sort((a,b)=>Date.parse(b.expiryTime)-Date.parse(a.expiryTime))[0];
 if(!row||!['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED'].includes(value.subscriptionState))throw new Error('Subscription is not active');
 const expires=Date.parse(row.expiryTime);if(!Number.isFinite(expires)||expires<=Date.now())throw new Error('Subscription expired');
 if(value.linkedPurchaseToken){const owner=db.prepare('SELECT subject FROM purchases WHERE token=?').get(value.linkedPurchaseToken);if(owner&&owner.subject!==subject)throw new Error('Linked purchase account mismatch');}
 const entitlement=savePurchase(db,subject,token,row.productId,expires);if(value.linkedPurchaseToken)db.prepare('UPDATE purchases SET expires=0 WHERE token=?').run(value.linkedPurchaseToken);
 if(value.acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED')await request(`${root}/purchases/subscriptions/${encodeURIComponent(row.productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:'{}'});return entitlement;
}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)throw new Error('Request too large');}return JSON.parse(raw||'{}');}
const attempts=new Map();
createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');try{
 if(!['/v1/trial','/v1/entitlement','/v1/purchases/google','/v1/admin/accounts'].includes(req.url))return reply(404,{error:'Not found'});
 const token=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];if(!token)return reply(401,{error:'Authentication required'});
 if(!jwks||Date.now()-keysAt>300000){jwks=await request(process.env.AUTH_JWKS_URL);keysAt=Date.now();}let claims;try{claims=validateJwt(token,jwks,process.env.AUTH_ISSUER,process.env.AUTH_AUDIENCE);}catch{return reply(401,{error:'Invalid session'});}
 const subject=claims.iss+'|'+claims.sub,bucket=Math.floor(Date.now()/60000),old=attempts.get(subject),count=old?.bucket===bucket?old.count+1:1;attempts.set(subject,{bucket,count});if(attempts.size>10000)for(const [k,v] of attempts)if(v.bucket<bucket)attempts.delete(k);if(count>30)return reply(429,{error:'Try later'});
 if(req.url==='/v1/admin/accounts'){if(req.method!=='GET')return reply(405,{error:'Method not allowed'});if(!(process.env.ADMIN_SUBJECTS||'').split(',').includes(subject))return reply(403,{error:'Forbidden'});return reply(200,{trials:db.prepare('SELECT * FROM trials ORDER BY started DESC LIMIT 100').all(),purchases:db.prepare('SELECT subject,product,expires,verified FROM purchases ORDER BY verified DESC LIMIT 100').all()});}
 if(req.method==='POST'&&req.url==='/v1/trial')return reply(200,trial(db,subject));
 if(req.method==='POST'&&req.url==='/v1/purchases/google'){const data=await body(req);if(typeof data.purchaseToken!=='string'||data.purchaseToken.length>8192)return reply(400,{error:'Invalid purchase'});return reply(200,await verifyPlay(subject,data.purchaseToken));}
 if(req.method==='GET'&&req.url==='/v1/entitlement'){const purchase=db.prepare('SELECT token FROM purchases WHERE subject=? ORDER BY expires DESC LIMIT 1').get(subject);if(purchase)return reply(200,await verifyPlay(subject,purchase.token));const row=db.prepare('SELECT * FROM trials WHERE subject=?').get(subject);return row?reply(200,{verified:true,id:'trial-'+accountHash(subject),kind:'trial',expiresAt:row.expires,verifiedAt:Date.now()}):reply(404,{error:'Trial not started'});}
 reply(405,{error:'Method not allowed'});
 }catch{return reply(503,{error:'Verification unavailable; access was not granted'});}function reply(status,value){res.writeHead(status);res.end(JSON.stringify(value));}}).listen(Number(process.env.PORT||8080),'127.0.0.1');
