const {withAppBuildGradle}=require('expo/config-plugins');
module.exports=config=>withAppBuildGradle(config,config=>{
 const marker='// Kotak VLC packaging';
 if(!config.modResults.contents.includes(marker))config.modResults.contents+=`\n${marker}\nandroid {\n    packagingOptions {\n        jniLibs { pickFirsts += ['**/libc++_shared.so'] }\n    }\n}\n`;
 return config;
});
