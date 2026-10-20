const {withAppBuildGradle}=require('expo/config-plugins');
module.exports=config=>withAppBuildGradle(config,config=>{
 const marker='// Kotak VLC packaging';
 if(!config.modResults.contents.includes(marker))config.modResults.contents+=`
${marker}
android {
    packagingOptions {
        jniLibs { pickFirsts += ['**/libc++_shared.so'] }
    }
}
// LibVLC requires its C++ runtime. Pick-first alone depends on dependency order.
// Replace only this project's merged output; never mutate the shared Gradle cache.
tasks.configureEach { nativeTask ->
    if (nativeTask.name.startsWith('merge') && nativeTask.name.endsWith('NativeLibs')) {
        nativeTask.doLast {
            def vlcInputs = nativeTask.externalLibNativeLibs.files.findAll {
                it.toString().contains('libvlc-all')
            }
            def copied = 0
            vlcInputs.each { input ->
                fileTree(input).matching { include '**/libc++_shared.so' }.files.each { source ->
                    def abi = source.parentFile.name
                    def output = new File(nativeTask.outputDir.get().asFile, 'lib/' + abi)
                    project.copy { from source; into output }
                    def target = new File(output, 'libc++_shared.so')
                    if (!java.util.Arrays.equals(source.bytes, target.bytes)) {
                        throw new GradleException('Kotak VLC C++ runtime verification failed: ' + abi)
                    }
                    copied++
                    logger.lifecycle('Kotak VLC runtime verified: ' + abi)
                }
            }
            if (copied == 0) throw new GradleException('Kotak VLC native runtime was not found')
        }
    }
}
`;
 return config;
});
