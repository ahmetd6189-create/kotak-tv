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

require('esbuild').buildSync({stdin:{contents:"export {assistantCommand} from './src/native/assistant-language'; export {assistantIntent,assistantChannels} from './src/native/assistant';",resolveDir:process.cwd(),loader:'ts'},outfile:'tests/.assistant-language-bundle.cjs',bundle:true,platform:'node',format:'cjs',logLevel:'error'});
const {assistantCommand,assistantIntent,assistantChannels}=require('./.assistant-language-bundle.cjs');
test('six-language example commands resolve schedule, recommendation and match intents',()=>{
 const examples={tr:['Bugün TRT1 de ne var','En yüksek puanlı film bul','Türkiye maçını aç'],en:['What is on TRT1 today','Find the highest rated film or series','Open the Türkiye match'],de:['Was läuft heute auf TRT1','Finde den bestbewerteten Film oder die Serie','Öffne das Türkiye-Spiel'],fr:["Que passe-t-il sur TRT1 aujourd’hui",'Trouve le film ou la série avec la meilleure note','Ouvre le match de Türkiye'],es:['Qué hay en TRT1 hoy','Busca la película o serie mejor valorada','Abre el partido de Türkiye'],it:['Cosa c’è su TRT1 oggi','Trova il film o la serie con il voto più alto','Apri la partita della Türkiye']};
 for(const [lang,phrases]of Object.entries(examples))phrases.forEach((phrase,i)=>{const command=assistantCommand(phrase,lang);assert.equal(assistantIntent(command),['schedule','recommend','match'][i],lang+': '+command);if(i===0)assert.equal(assistantChannels([{id:'trt',kind:'live',name:'TRT1'}],command).length,1,lang+': channel matching');});
});
