const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const directory=mkdtempSync(join(tmpdir(),'kotak-cache-test-'));
require('esbuild').buildSync({entryPoints:['src/native/cache-store.ts'],bundle:true,platform:'node',format:'cjs',outfile:join(directory,'cache.cjs'),logLevel:'error'});
const {createCacheStore}=require(join(directory,'cache.cjs'));rmSync(directory,{recursive:true});
function memory(){const values=new Map();return {values,async getItem(k){const value=values.get(k)||null;if(value&&Buffer.byteLength(value)>1000000)throw Error('CursorWindow row too big');return value},async setItem(k,v){if(Buffer.byteLength(v)>1000000)throw Error('CursorWindow row too big');values.set(k,v)},async removeItem(k){values.delete(k)}};}
const entry=i=>({id:`p-${i}`,playlistId:'p',name:'Channel '+i+' x'.repeat(60),group:'Spor',logo:'https://secret/logo',kind:'live',uri:'https://host/user/password/'+i,headers:{Authorization:'password'}});
test('30,000 cached channels fit small storage rows and restore with EPG without credentials',async()=>{
 const store=memory();const cache=createCacheStore(store);const entries=Array.from({length:30000},(_,i)=>entry(i));
 const now=Date.now();await cache.save('p',entries,{'p:tv':[{title:'Maç',start:now-1000,end:now+60000}]});
 for(const value of store.values.values()){assert.ok(Buffer.byteLength(value)<200000);assert.equal(value.includes('password'),false)}
 const restored=await cache.read('p');assert.equal(restored.entries.length,30000);assert.equal(restored.entries[29999].id,'p-29999');assert.equal(restored.guide['p:tv'][0].title,'Maç');
 await cache.remove('p');assert.equal(store.values.size,0);
});
test('Failed cache update preserves prior committed generation; subsequent writes serialize',async()=>{
 const store=memory();const cache=createCacheStore(store);await cache.save('p',[entry(1)],{});
 const set=store.setItem;store.setItem=async(k,v)=>{if(k.endsWith('.0'))throw Error('disk failure');await set(k,v)};
 await assert.rejects(cache.save('p',[entry(2)],{}),/disk failure/);
 assert.equal((await cache.read('p')).entries[0].id,'p-1');
 store.setItem=set;await Promise.all([cache.save('p',[entry(3)],{}),cache.save('p',[entry(4)],{})]);
 assert.equal((await cache.read('p')).entries[0].id,'p-4');
});
test('Oversized legacy cache does not prevent creating the new chunked cache',async()=>{
 const store=memory();store.values.set('kotak.cache.p','x'.repeat(2100000));const cache=createCacheStore(store);
 assert.equal(await cache.read('p'),null);await cache.save('p',[entry(1)]);
 assert.equal((await cache.read('p')).entries.length,1);assert.equal(store.values.has('kotak.cache.p'),false);
});
