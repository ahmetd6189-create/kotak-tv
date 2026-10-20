/** Cooperative top-level JSON array parser; large catalogs must not monopolize the JS/UI thread. */
export async function parseJsonArray(text:string,signal?:AbortSignal):Promise<unknown[]>{
 const input=text.trim();if(input[0]!=='[')throw new Error('JSON dizisi bekleniyor.');
 const out:unknown[]=[];let begin=1,depth=0,quoted=false,escaped=false;
 for(let i=1;i<input.length;i++){
  if(i%32768===0){if(signal?.aborted)throw new Error('İşlem iptal edildi.');await new Promise<void>(r=>setTimeout(r,0));}
  const c=input[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}
  if(c==='['||c==='{'){depth++;continue;}
  if(c===']'&&depth===0){const last=input.slice(begin,i).trim();if(last)out.push(JSON.parse(last));else if(out.length)throw new Error('Geçersiz JSON dizisi.');if(input.slice(i+1).trim())throw new Error('Geçersiz JSON sonu.');if(signal?.aborted)throw new Error('İşlem iptal edildi.');return out;}
  if(c===']'||c==='}'){depth--;if(depth<0)throw new Error('Geçersiz JSON.');continue;}
  if(c===','&&depth===0){const value=input.slice(begin,i).trim();if(!value)throw new Error('Geçersiz JSON öğesi.');out.push(JSON.parse(value));begin=i+1;}
 }
 throw new Error('JSON dizisi tamamlanmadı.');
}
