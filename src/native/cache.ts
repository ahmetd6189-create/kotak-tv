import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCacheStore } from './cache-store';
const cache = createCacheStore(AsyncStorage);
export const cacheCatalog = (id:string,entries:import("./iptv").Entry[])=>cache.save(id,entries.filter(e=>e.kind==="live"),{});
export const cacheVod = (id:string,entries:import("./iptv").Entry[])=>cache.save(`vod.${id}`,entries.filter(e=>e.kind!=="live"),{});
export const cachedVod = (id:string)=>cache.read(`vod.${id}`);
export const cacheGuide = (id:string,guide:import("./iptv").Guide)=>cache.save(`guide.${id}`,[],guide);
export const cachedGuide = (id:string)=>cache.read(`guide.${id}`);
export const cachedCatalog = cache.read;
export const removeCache = async(id:string)=>{await cache.remove(id);await cache.remove(`vod.${id}`);await cache.remove(`guide.${id}`)};

