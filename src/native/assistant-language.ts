import type {Language} from './i18n';
import {normalized} from './catalog-tools';
/** Small local command grammar; not a general-purpose AI translator. Preserve content/team terms. */
const rules:Record<Exclude<Language,'tr'>,[string,string][]>= {
 en:[['what is on','ne var'],['what s on','ne var'],['highest rated','en yuksek'],['best rated','en yuksek'],['which channel','hangi kanalda'],['today','bugun'],['tonight','bu aksam'],['match','mac'],['matches','maclar'],['open','ac'],['play','oynat'],['watch','izle'],['find','bul'],['recommend','oner'],['movie','film'],['movies','film'],['series','dizi'],['the',''],['or',''],['please',''],['action','aksiyon'],['comedy','komedi'],['horror','korku'],['science fiction','bilim kurgu']],
 de:[['was lauft','ne var'],['bestbewerteten','en yuksek'],['bestbewertete','en yuksek'],['auf welchem sender','hangi kanalda'],['heute','bugun'],['heute abend','bu aksam'],['spiel','mac'],['spiele','maclar'],['offne','ac'],['abspielen','oynat'],['finde','bul'],['empfiehl','oner'],['serie','dizi'],['serien','dizi'],['den',''],['die',''],['das',''],['oder',''],['auf',''],['bitte',''],['action','aksiyon'],['komodie','komedi'],['horror','korku']],
 fr:[['que passe t il sur','ne var'],['meilleure note','en yuksek'],['quelle chaine','hangi kanalda'],['aujourd hui','bugun'],['ce soir','bu aksam'],['match','mac'],['matchs','maclar'],['ouvre','ac'],['regarde','izle'],['trouve','bul'],['recommande','oner'],['serie','dizi'],['series','dizi'],['le',''],['la',''],['de',''],['avec',''],['ou',''],['action','aksiyon'],['comedie','komedi'],['horreur','korku']],
 es:[['que hay en','ne var'],['mejor valorada','en yuksek'],['mejor valorado','en yuksek'],['en que canal','hangi kanalda'],['hoy','bugun'],['esta noche','bu aksam'],['partido','mac'],['partidos','maclar'],['abre','ac'],['reproduce','oynat'],['busca','bul'],['recomienda','oner'],['pelicula','film'],['peliculas','film'],['serie','dizi'],['series','dizi'],['el',''],['la',''],['de',''],['o',''],['accion','aksiyon'],['comedia','komedi'],['terror','korku']],
 it:[['cosa c e su','ne var'],['voto piu alto','en yuksek'],['su quale canale','hangi kanalda'],['oggi','bugun'],['stasera','bu aksam'],['partita','mac'],['partite','maclar'],['apri','ac'],['riproduci','oynat'],['trova','bul'],['consiglia','oner'],['serie','dizi'],['il',''],['la',''],['della',''],['con',''],['o',''],['azione','aksiyon'],['commedia','komedi'],['horror','korku']]
};
const compiled=Object.fromEntries(Object.entries(rules).map(([language,entries])=>[language,[...entries].sort((a,b)=>b[0].length-a[0].length).map(([from,to])=>({regex:new RegExp('\\b'+from+'\\b','g'),to}))])) as Record<Exclude<Language,'tr'>,{regex:RegExp;to:string}[]>;
export function assistantCommand(text:string,language:Language){
 if(language==='tr')return text;
 let result=normalized(text);
 for(const {regex,to} of compiled[language])result=result.replace(regex,to);
 return result.replace(/\s+/g,' ').trim();
}
