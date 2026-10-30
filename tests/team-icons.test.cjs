const {test}=require('node:test');const assert=require('node:assert/strict');
const plugin=require('../plugins/withTeamIcons');const teams=require('../src/native/team-directory.json').teams;const icons=require('../native/team-icons.json');
test('Team launcher aliases preserve deep links and retain exactly one default launcher',()=>{
 const main={$:{'android:name':'.MainActivity'},'intent-filter':[
 {action:[{$:{'android:name':'android.intent.action.MAIN'}}],category:[{$:{'android:name':'android.intent.category.LAUNCHER'}}]},
 {action:[{$:{'android:name':'android.intent.action.VIEW'}}],data:[{$:{'android:scheme':'kotaktv'}}]}
 ]};
 const manifest={application:[{activity:[main]}]};
 plugin.applyManifest(manifest,'com.kotaktv.app');const app=manifest.application[0];assert.equal(app.activity[0]['intent-filter'].length,1);assert.equal(app.activity[0]['intent-filter'][0].data[0].$['android:scheme'],'kotaktv');
 const first=JSON.stringify(manifest);plugin.applyManifest(manifest,'com.kotaktv.app');assert.equal(JSON.stringify(manifest),first);assert.equal(app['activity-alias'].length,teams.length+1);assert.equal(app['activity-alias'].filter(a=>a.$['android:enabled']==='true').length,1);
});
test('Every selectable team has a bundled PNG; no build-time network dependency',()=>{for(const team of teams){const data=Buffer.from(icons[team.id],'base64');assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),108);assert.equal(data.readUInt32BE(20),108);}});
test('Native package registration is idempotent and rejects incompatible templates',()=>{const source='PackageList(this).packages.apply {\n}';const changed=plugin.register(source);assert.equal(plugin.register(changed),changed);assert.equal((changed.match(/add\(KotakAppearancePackage\(\)\)/g)||[]).length,1);assert.throws(()=>plugin.register('unrecognized template'),/unsupported/);});
