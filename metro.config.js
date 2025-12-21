const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Configure resolver to handle pnpm symlinks correctly
config.resolver = {
  ...config.resolver,
  // Enable symlink resolution for pnpm
  unstable_enableSymlinks: true,
  // Ensure node_modules resolution works with pnpm
  nodeModulesPaths: [
    ...(config.resolver.nodeModulesPaths || []),
  ],
  // Three.js uses .mjs for modular builds
  sourceExts: [...(config.resolver.sourceExts || []), 'mjs', 'cjs', 'js', 'jsx', 'ts', 'tsx', 'json'],
};

// Configure transformer for web exports
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = withNativeWind(config, { input: "./global.css" });
