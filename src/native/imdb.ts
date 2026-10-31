import type {Entry} from './iptv';
import {requestText} from './iptv';
import {mediaTitle,normalized} from './catalog-tools';
export type ImdbInfo={title:string;rating:number;id:string;poster:string;released?:string;year?:string;plot?:string;genre?:string;updatedAt:number};
export function metadataKey(item:Entry){return `${item.kind==='movie'?'movie':'series'}:${normalized(mediaTitle(item.name))}`;}
export async function lookupImdb(item:Entry,key:string,signal?:AbortSignal):Promise<ImdbInfo|null>{
 const type=item.kind==='movie'?'movie':'series';const title=mediaTitle(item.name);const year=item.name.match(/\b(?:19|20)\d{2}\b/)?.[0];
 const params=new URLSearchParams({apikey:key,type,plot:"full",...(item.imdbId?{i:item.imdbId}:{t:title,...(year?{y:year}:{})})});
 const response=await requestText(`https://www.omdbapi.com/?${params}`,signal,8000);const data=JSON.parse(response.text);
 if(data.Response!=='True'){
  if(/api key|limit|request limit/i.test(String(data.Error)))throw new Error('IMDb veri anahtarı geçersiz veya günlük sorgu sınırı dolmuş.');
  return null;
 }
 if(data.Type!==type || !/^tt\d+$/.test(data.imdbID))return null;
 if(!item.imdbId&&normalized(data.Title)!==normalized(title))return null;
 const rating=Number(data.imdbRating);if(!Number.isFinite(rating)||rating<=0||rating>10)return null;
 return {title:data.Title,rating,id:data.imdbID,poster:typeof data.Poster==='string'&&data.Poster.startsWith('https://')?data.Poster:'',released:data.Released!=="N/A"?data.Released:undefined,year:data.Year,plot:data.Plot!=="N/A"?data.Plot:undefined,genre:data.Genre,updatedAt:Date.now()};
}
