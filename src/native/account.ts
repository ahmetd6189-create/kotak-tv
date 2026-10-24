import * as SecureStore from 'expo-secure-store';
import {AccountClient} from './account-core';
const key='kotak.account.refresh.v1';
export const account=new AccountClient({
 getItem:()=>SecureStore.getItemAsync(key),
 setItem:value=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
 removeItem:()=>SecureStore.deleteItemAsync(key),
});
