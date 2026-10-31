import {parseEntitlement,type Entitlement} from './entitlement';
/** Requires a signed-in account and a deployed HTTPS billing service. Never grant access from local flags. */
export class BillingClient {
 constructor(private readonly origin:string,private readonly getAccessToken:()=>Promise<string>){const url=new URL(origin);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('Ödeme servisi HTTPS adresi olmalı.');}
 private async call(path:string,body?:Record<string,string>):Promise<Entitlement>{
  const token=await this.getAccessToken();if(!token)throw new Error('Önce hesabına giriş yapmalısın.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const response=await fetch(this.origin.replace(/\/$/,'')+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal});if(!response.ok)throw new Error('Kullanım hakkı doğrulanamadı. Tekrar dene.');return parseEntitlement(await response.json());}finally{clearTimeout(timer);}
 }
 startTrial(){return this.call('/v1/trial',{});}
 entitlement(){return this.call('/v1/entitlement');}
 verifyGooglePurchase(purchaseToken:string){return this.call('/v1/purchases/google',{purchaseToken});}
}
