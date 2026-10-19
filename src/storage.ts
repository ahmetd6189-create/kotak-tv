import AsyncStorage from '@react-native-async-storage/async-storage';

const memory = new Map<string, string>();

export async function hydrateStorage(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (!keys.length) return;
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (key && value != null) memory.set(key, value);
  }
}

export const appStorage = {
  getItem(key: string): string | null {
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  removeItem(key: string): void {
    memory.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
};
