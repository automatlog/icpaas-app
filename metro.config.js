const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// SignalR and some modern libraries use .mjs files which Metro doesn't 
// resolve by default in all versions.
config.resolver.sourceExts.push('mjs');

module.exports = withNativeWind(config, { input: './global.css' });
