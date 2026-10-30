import {NativeModules,Platform} from 'react-native';
type Launcher={requestIcon:(id:string)=>Promise<boolean>;iconStatus:()=>Promise<{current:string;pending:string|null;error:string|null}>};
const module=NativeModules.KotakAppearance as Launcher|undefined;
export const supportsLauncherIcon=()=>Platform.OS==='android'&&!!module;
export async function requestLauncherIcon(id:string|null){if(!supportsLauncherIcon())throw new Error('Takım simgesi için Android APK güncellemesi gerekiyor.');await module!.requestIcon(id||'default');}
export async function launcherIconStatus(){return module?.iconStatus();}
