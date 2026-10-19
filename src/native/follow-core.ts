import type {Entry,Guide,Program} from './iptv';
import {normalized,mediaTitle,scheduleFor,guideKey} from './catalog-tools';
export type FollowRule={id:string;kind:'team'|'series'|'movies';label:string;playlistId?:string;seriesId?:string;leadMinutes:number;createdAt:number};
export function teamName(value:string){return normalized(value).replace(/\breal\s*madrid(?:in|un|nin)?\b/g,'real madrid').replace(/\bbarcelona(?:nin|in)?\b/g,'barcelona').replace(/\b(galatasaray|fenerbahce|besiktas|trabzonspor)(?:nin|in|un)?\b/g,'$1').replace(/\b(in|nin|un|nun)\b/g,' ').replace(/\s+/g,' ').trim();}
export function followsSeries(rule:FollowRule,item:Entry){return rule.kind==='series'&&(!rule.playlistId||rule.playlistId===item.playlistId)&&(rule.seriesId&&item.seriesId?rule.seriesId===item.seriesId:(guideKey(mediaTitle(item.name))===guideKey(mediaTitle(rule.label))||guideKey(item.group)===guideKey(rule.label)));}
export function newFollowItems(previous:Entry[]|null,current:Entry[],rules:FollowRule[]){
 if(!previous)return [];
 const known=new Set(previous.map(e=>e.id));
 return rules.filter(r=>r.kind!=='team').map(rule=>({rule,items:current.filter(e=>!known.has(e.id)&&(rule.kind==='movies'?e.kind==='movie':e.kind==='episode'&&followsSeries(rule,e)))})).filter(x=>x.items.length);
}
export function followedMatches(entries:Entry[],guide:Guide,rules:FollowRule[],now=Date.now()){
 const out:{rule:FollowRule;channel:Entry;program:Program;id:string}[]=[];const seen=new Set<string>();
 for(const rule of rules.filter(r=>r.kind==='team')){
  const wanted=guideKey(teamName(rule.label));if(wanted.length<3)continue;
  for(const channel of entries){if(channel.kind!=='live')continue;for(const program of scheduleFor(channel,guide)){
   if(/ozet|tekrar|highlight|antrenman|analiz|studyo/.test(normalized(program.title)))continue;
   if(program.start<=now||program.start>now+86400000||!guideKey(teamName(program.title)).includes(wanted))continue;
   // HD/SD variants often repeat the same EPG. Send one reminder for the same fixture/start time.
   const id=`kotak-follow-${rule.id}-${program.start}-${guideKey(program.title)}`;
   if(seen.has(id))continue;seen.add(id);out.push({rule,channel,program,id});
  }}
 }
 return out.sort((a,b)=>a.program.start-b.program.start);
}
