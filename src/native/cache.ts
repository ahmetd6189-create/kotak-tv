import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCacheStore } from './cache-store';
const cache = createCacheStore(AsyncStorage);
export const cacheCatalog = cache.save;
export const cachedCatalog = cache.read;
export const removeCache = cache.remove;
