import dictionary from '../ui/translations.json';
export const languages={tr:'Türkçe',en:'English',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano'};
export type Language=keyof typeof languages;
const locales:Record<Language,string>={tr:'tr-TR',en:'en-GB',de:'de-DE',fr:'fr-FR',es:'es-ES',it:'it-IT'};
let current:Language='tr';
export function isLanguage(value:unknown):value is Language{return typeof value==='string'&&Object.prototype.hasOwnProperty.call(languages,value);}
export function setLanguage(value:unknown){current=isLanguage(value)?value:'tr';}
export function localeFor(language:Language=current){return locales[language];}
const dict=dictionary as Record<string,Record<string,string>>;
const normalize=(s:string)=>s.trim().replace(/\s+/g,' ');
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns=Object.entries(dict).filter(([key])=>/\{\d+\}/.test(key)).map(([key,values])=>{
 const slots:string[]=[];let offset=0,pattern='';
 for(const match of key.matchAll(/\{(\d+)\}/g)){pattern+=escape(key.slice(offset,match.index))+'(.*?)';slots.push(match[1]);offset=match.index!+match[0].length;}
 return {regex:new RegExp('^'+pattern+escape(key.slice(offset))+'$'),slots,values};
});
const cache=new Map<string,string>();
export function translate(text:unknown,language:Language|null=current):any{
 if(typeof text!=='string'||!language||language==='tr')return text;
 const key=normalize(text),cached=cache.get(language+'|'+text);if(cached!==undefined)return cached;
 let result=Object.prototype.hasOwnProperty.call(dict,key)?dict[key][language]:undefined;
 if(!result)for(const p of patterns){const match=p.regex.exec(key);if(!match)continue;result=p.values[language]?.replace(/\{(\d+)\}/g,(_,n)=>match[p.slots.indexOf(n)+1]);if(result)break;}
 result=result||text;
 if(cache.size>=2000)cache.clear();cache.set(language+'|'+text,result);return result;
}
