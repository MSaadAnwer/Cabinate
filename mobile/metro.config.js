const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
// The pure HTTP/session utilities are shared with the separate Vite prototype.
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, "../shared")];
module.exports = config;
