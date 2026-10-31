import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { PlaylistConfig } from "./iptv";
const INDEX = "kotak.playlists.v2";
export async function savedPlaylists(): Promise<PlaylistConfig[]> {
  const ids: string[] = JSON.parse((await AsyncStorage.getItem(INDEX)) || "[]");
  const values = await Promise.all(
    ids.map((id) => SecureStore.getItemAsync(`kotak.${id}`)),
  );
  return values.filter((v): v is string => !!v).map((v) => JSON.parse(v));
}
export async function savePlaylist(config: PlaylistConfig): Promise<void> {
  await SecureStore.setItemAsync(`kotak.${config.id}`, JSON.stringify(config));
  const ids: string[] = JSON.parse((await AsyncStorage.getItem(INDEX)) || "[]");
  await AsyncStorage.setItem(
    INDEX,
    JSON.stringify([...new Set([...ids, config.id])]),
  );
}
export async function deletePlaylist(id: string): Promise<void> {
  const ids: string[] = JSON.parse((await AsyncStorage.getItem(INDEX)) || "[]");
  await AsyncStorage.setItem(
    INDEX,
    JSON.stringify(ids.filter((value) => value !== id)),
  );
  await SecureStore.deleteItemAsync(`kotak.${id}`);
}
