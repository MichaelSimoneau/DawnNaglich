const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin to add Google services for Firebase on both Android and iOS
 * - Android: Adds Google services Gradle plugin to process google-services.json
 * - iOS: Adds GoogleService-Info.plist to the Xcode project
 */
const withGoogleServices = (config) => {
  // Modify root-level build.gradle to add the plugin dependency
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      // Check if the plugin is already added
      if (
        !config.modResults.contents.includes("com.google.gms.google-services")
      ) {
        // Add the plugin dependency in the plugins block
        const pluginsBlock = /plugins\s*\{([^}]*)\}/s;
        const match = config.modResults.contents.match(pluginsBlock);

        if (match) {
          // Add the Google services plugin to existing plugins block
          const newPluginsBlock = match[0].replace(
            match[1],
            match[1] +
              "\n  id 'com.google.gms.google-services' version '4.4.4' apply false",
          );
          config.modResults.contents = config.modResults.contents.replace(
            pluginsBlock,
            newPluginsBlock,
          );
        } else {
          // If no plugins block exists, add one
          const buildscriptMatch =
            config.modResults.contents.match(/buildscript\s*\{/);
          if (buildscriptMatch) {
            const insertPos =
              config.modResults.contents.indexOf("buildscript {");
            config.modResults.contents =
              config.modResults.contents.slice(0, insertPos) +
              "plugins {\n  id 'com.google.gms.google-services' version '4.4.4' apply false\n}\n\n" +
              config.modResults.contents.slice(insertPos);
          } else {
            // Add at the top of the file
            config.modResults.contents =
              "plugins {\n  id 'com.google.gms.google-services' version '4.4.4' apply false\n}\n\n" +
              config.modResults.contents;
          }
        }
      }
    }
    return config;
  });

  // Modify app-level build.gradle to apply the plugin
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      // Check if the plugin is already applied
      if (
        !config.modResults.contents.includes(
          "id 'com.google.gms.google-services'",
        )
      ) {
        // Find the plugins block in app/build.gradle
        const pluginsBlock = /plugins\s*\{([^}]*)\}/s;
        const match = config.modResults.contents.match(pluginsBlock);

        if (match) {
          // Add the Google services plugin to existing plugins block
          const newPluginsBlock = match[0].replace(
            match[1],
            match[1] + "\n  id 'com.google.gms.google-services'",
          );
          config.modResults.contents = config.modResults.contents.replace(
            pluginsBlock,
            newPluginsBlock,
          );
        } else {
          // If no plugins block exists, add one after android application plugin
          const androidAppMatch = config.modResults.contents.match(
            /apply plugin:\s*['"]com\.android\.application['"]/,
          );
          if (androidAppMatch) {
            const insertPos = androidAppMatch.index + androidAppMatch[0].length;
            config.modResults.contents =
              config.modResults.contents.slice(0, insertPos) +
              "\napply plugin: 'com.google.gms.google-services'" +
              config.modResults.contents.slice(insertPos);
          } else {
            // Try to find plugins block with id syntax
            const idMatch = config.modResults.contents.match(
              /id\s+['"]com\.android\.application['"]/,
            );
            if (idMatch) {
              // Add plugins block
              const insertPos = idMatch.index;
              const before = config.modResults.contents.slice(0, insertPos);
              const after = config.modResults.contents.slice(insertPos);
              const pluginsStart = before.lastIndexOf("plugins {");
              if (pluginsStart !== -1) {
                // Add to existing plugins block
                const pluginsEnd = before.indexOf("}", pluginsStart);
                config.modResults.contents =
                  before.slice(0, pluginsEnd) +
                  "\n  id 'com.google.gms.google-services'" +
                  before.slice(pluginsEnd) +
                  after;
              } else {
                // Add new plugins block
                config.modResults.contents =
                  before +
                  "\nplugins {\n  id 'com.google.gms.google-services'\n}\n" +
                  after;
              }
            } else {
              // Fallback: add at the top
              config.modResults.contents =
                "plugins {\n  id 'com.google.gms.google-services'\n}\n\n" +
                config.modResults.contents;
            }
          }
        }
      }
    }
    return config;
  });

  // iOS: Copy GoogleService-Info.plist to iOS project directory
  // The file will be automatically included in the Xcode project during prebuild
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const sourcePlistPath = path.join(
        config.modRequest.projectRoot,
        "GoogleService-Info.plist",
      );
      const iosProjectRoot = config.modRequest.platformProjectRoot;
      const targetPlistPath = path.join(
        iosProjectRoot,
        "GoogleService-Info.plist",
      );

      // Check if GoogleService-Info.plist exists in project root
      if (fs.existsSync(sourcePlistPath)) {
        // Copy the file to the iOS project directory
        if (!fs.existsSync(iosProjectRoot)) {
          fs.mkdirSync(iosProjectRoot, { recursive: true });
        }
        fs.copyFileSync(sourcePlistPath, targetPlistPath);
        console.log("✓ Copied GoogleService-Info.plist to iOS project");
      } else {
        console.warn(
          "⚠ GoogleService-Info.plist not found in project root. iOS Firebase may not work correctly.",
        );
      }

      return config;
    },
  ]);

  return config;
};

module.exports = withGoogleServices;
