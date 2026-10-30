const {withAndroidManifest,withMainApplication,withDangerousMod}=require('expo/config-plugins');
const fs=require('fs');const path=require('path');
const teams=require('../src/native/team-directory.json').teams;
const suffix=id=>'Team_'+id.replace(/[^a-zA-Z0-9]/g,'_');
const resource=id=>'kotak_'+id.replace(/[^a-z0-9]/g,'_');
function applyManifest(manifest,pkg){
 const app=manifest.application[0];app.$={...(app.$||{}),'android:icon':'@drawable/kotak_default','android:roundIcon':'@drawable/kotak_default'};const main=app.activity.find(a=>a.$['android:name']==='.MainActivity'||a.$['android:name']===pkg+'.MainActivity');
 if(!main)throw new Error('Kotak: MainActivity missing');
 main['intent-filter']=(main['intent-filter']||[]).filter(f=>!(f.category||[]).some(c=>['android.intent.category.LAUNCHER','android.intent.category.LEANBACK_LAUNCHER'].includes(c.$['android:name'])));
 app['activity-alias']=(app['activity-alias']||[]).filter(a=>!a.$['android:name'].startsWith(pkg+'.KotakIcon'));
 for(const id of ['default',...teams.map(t=>t.id)])app['activity-alias'].push({$:{'android:name':pkg+'.KotakIcon'+(id==='default'?'Default':suffix(id)),'android:targetActivity':main.$['android:name'],'android:enabled':id==='default'?'true':'false','android:exported':'true','android:label':'Kotak TV','android:icon':id==='default'?'@drawable/kotak_default':'@drawable/'+resource(id)},'intent-filter':[{action:[{$:{'android:name':'android.intent.action.MAIN'}}],category:[{$:{'android:name':'android.intent.category.LAUNCHER'}},{$:{'android:name':'android.intent.category.LEANBACK_LAUNCHER'}}]}]});
 return manifest;
}
function register(source){if(source.includes('add(KotakAppearancePackage())'))return source;const anchor='PackageList(this).packages.apply {';if(!source.includes(anchor))throw new Error('Kotak: unsupported MainApplication template');return source.replace(anchor,anchor+'\n              add(KotakAppearancePackage())');}
function kotlin(pkg){return `package ${pkg}
import android.content.ComponentName
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class KotakAppearancePackage : ReactPackage {
 override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(KotakAppearanceModule(context))
 override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
class KotakAppearanceModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), LifecycleEventListener {
 private val prefs = context.getSharedPreferences("kotak.launcher", 0)
 private val handler = Handler(Looper.getMainLooper())
 private var background = false
 private val aliases = mapOf(${['"default" to "Default"',...teams.map(t=>JSON.stringify(t.id)+' to '+JSON.stringify(suffix(t.id)))].join(',')})
 init { context.addLifecycleEventListener(this) }
 override fun getName() = "KotakAppearance"
 @ReactMethod fun requestIcon(id: String, promise: Promise) {
  if (!aliases.containsKey(id)) { promise.reject("INVALID_ICON", "Unknown team icon"); return }
  if (!prefs.edit().putString("pending", id).commit()) { promise.reject("STORAGE", "Icon preference could not be saved"); return }
  promise.resolve(true)
 }
 @ReactMethod fun iconStatus(promise: Promise) {
  val result = Arguments.createMap()
  result.putString("current", prefs.getString("current", "default"))
  result.putString("pending", prefs.getString("pending", null))
  result.putString("error", prefs.getString("error", null))
  promise.resolve(result)
 }
 override fun onHostResume() { background = false }
 override fun onHostDestroy() {}
 override fun onHostPause() { background = true; handler.postDelayed({ if (background) applyPending() }, 800) }
 private fun applyPending() {
  val id = prefs.getString("pending", null) ?: return
  val selected = aliases[id] ?: return
  val pm = context.packageManager
  try {
   val names = aliases.values.map { ComponentName(context.packageName, context.packageName + ".KotakIcon" + it) }
   val target = ComponentName(context.packageName, context.packageName + ".KotakIcon" + selected)
   if (Build.VERSION.SDK_INT >= 33) {
    pm.setComponentEnabledSettings(names.map { PackageManager.ComponentEnabledSetting(it, if(it == target) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP) })
   } else {
    // Always enable the new entry first: the app must retain a launchable icon.
    pm.setComponentEnabledSetting(target, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
    names.filter { it != target }.forEach { pm.setComponentEnabledSetting(it, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP) }
   }
   prefs.edit().putString("current", id).remove("pending").remove("error").apply()
  } catch(e: Exception) { prefs.edit().putString("error", "Launcher could not apply the icon").apply() }
 }
 override fun invalidate() { context.removeLifecycleEventListener(this); handler.removeCallbacksAndMessages(null); super.invalidate() }
}
`;}
module.exports=config=>{
 const pkg=config.android?.package;if(!pkg)throw new Error('Android package required');
 config=withAndroidManifest(config,c=>{c.modResults.manifest=applyManifest(c.modResults.manifest,pkg);return c;});
 config=withMainApplication(config,c=>{c.modResults.contents=register(c.modResults.contents);return c;});
 return withDangerousMod(config,['android',async c=>{
  const base=path.join(c.modRequest.platformProjectRoot,'app/src/main');
  const java=path.join(base,'java',...pkg.split('.'));fs.mkdirSync(java,{recursive:true});fs.writeFileSync(path.join(java,'KotakAppearancePackage.kt'),kotlin(pkg));
  const dest=path.join(base,'res/drawable');fs.mkdirSync(dest,{recursive:true});fs.copyFileSync(path.join(__dirname,'../native/default-icon.xml'),path.join(dest,'kotak_default.xml'));const icons=require('../native/team-icons.json');
  for(const team of teams){if(!icons[team.id])throw new Error('Missing team icon: '+team.id);fs.writeFileSync(path.join(dest,resource(team.id)+'.png'),Buffer.from(icons[team.id],'base64'));}
  return c;
 }]);
};
module.exports.applyManifest=applyManifest;module.exports.register=register;module.exports.kotlin=kotlin;
