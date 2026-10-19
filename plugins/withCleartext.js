// Sağlayıcının HTTP yayınlarını Android release yapısında da açabilmek için.
const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");
module.exports = function withCleartext(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    application.$["android:usesCleartextTraffic"] = "true";
    return config;
  });
};
