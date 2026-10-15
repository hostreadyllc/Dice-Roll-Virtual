/**
 * Signs Android release builds with the Play upload key when these
 * environment variables are set (they are in the GitHub "Play bundle" build):
 *   UPLOAD_STORE_FILE, UPLOAD_STORE_PASSWORD, UPLOAD_KEY_ALIAS, UPLOAD_KEY_PASSWORD
 * Without them, release builds keep Expo's default debug signing (test APKs).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING = `
        release {
            if (System.getenv("UPLOAD_STORE_FILE")) {
                storeFile file(System.getenv("UPLOAD_STORE_FILE"))
                storePassword System.getenv("UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("UPLOAD_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes('UPLOAD_STORE_FILE')) {
      g = g.replace(/signingConfigs\s*\{/, (m) => m + SIGNING);
      // In the release build type, use the upload key when it's available.
      g = g.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
        '$1signingConfig System.getenv("UPLOAD_STORE_FILE") ? signingConfigs.release : signingConfigs.debug',
      );
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
