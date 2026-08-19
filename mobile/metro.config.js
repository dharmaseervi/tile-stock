const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const config = getDefaultConfig(__dirname);

// Allow react-native-tcp-socket to resolve its src files
config.resolver.sourceExts = [...config.resolver.sourceExts, "cjs"];
module.exports = withNativeWind(getDefaultConfig(__dirname), {
  input: "./global.css",
});