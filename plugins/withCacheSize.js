const { withGradleProperties } = require('expo/config-plugins');
module.exports = function withCacheSize(config) {
 return withGradleProperties(config, config => {
  config.modResults = config.modResults.filter(p => !(p.type === 'property' && p.key === 'AsyncStorage_db_size_in_MB'));
  config.modResults.push({type:'property',key:'AsyncStorage_db_size_in_MB',value:'128'});
  return config;
 });
};
