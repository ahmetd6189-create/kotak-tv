const {test}=require('node:test'),assert=require('node:assert/strict');
require('esbuild').buildSync({entryPoints:['src/native/i18n.ts'],outfile:'tests/.i18n-bundle.cjs',bundle:true,platform:'node',format:'cjs',logLevel:'error'});
const {translate,localeFor,setLanguage,isLanguage,languages}=require('./.i18n-bundle.cjs');
const dictionary=require('../src/ui/translations.json');
test('all dictionary entries include five translations with matching parameters',()=>{
 const slots=s=>[...s.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
 for(const [key,values]of Object.entries(dictionary))for(const lang of Object.keys(languages).filter(l=>l!=='tr')){assert.equal(typeof values[lang],'string',`${key}:${lang}`);assert.ok(values[lang].trim(),`${key}:${lang}`);assert.deepEqual(slots(values[lang]),slots(key),`${key}:${lang}`);}
});
test('dynamic guide headers and timing translate without modifying names',()=>{
 assert.equal(translate('TRT 1 · Yayın Akışı','en'),'TRT 1 · Programme guide');
 assert.equal(translate('30 dk önce','de'),'30 Min. vorher');
 assert.equal(translate('6.7','fr'),'6.7');assert.equal(translate('Unlisted Provider Movie','it'),'Unlisted Provider Movie');
 assert.equal(translate('Tekrar gönder (12 sn)','es'),'Reenviar (12 s)');
});
test('only explicit supported language keys accepted',()=>{
 assert.equal(isLanguage('constructor'),false);assert.equal(isLanguage('__proto__'),false);setLanguage('de');assert.equal(localeFor(),'de-DE');setLanguage('invalid');assert.equal(localeFor(),'tr-TR');
});
