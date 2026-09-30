const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Migrations do Drizzle são arquivos .sql importados pelo migrations.js.
    sourceExts: [...defaultConfig.resolver.sourceExts, 'sql'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
