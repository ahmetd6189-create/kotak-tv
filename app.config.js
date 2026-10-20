const source=require('./app.json').expo;
module.exports=()=>{
 const config=JSON.parse(JSON.stringify(source));config.scheme='kotaktv';
 const domain=process.env.EXPO_PUBLIC_LINK_HOST;
 if(domain){if(!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain))throw new Error('EXPO_PUBLIC_LINK_HOST yalnız alan adı olmalı.');config.android.intentFilters=[{action:'VIEW',autoVerify:true,data:[{scheme:'https',host:domain,pathPrefix:'/join/'}],category:['BROWSABLE','DEFAULT']}];config.ios.associatedDomains=[`applinks:${domain}`];}
 return config;
};
