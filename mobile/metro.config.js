const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("wasm");
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "@huggingface/transformers") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "node_modules/@huggingface/transformers/dist/transformers.web.js"),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
