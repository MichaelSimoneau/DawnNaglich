const { withAndroidManifest, withInfoPlist } = require("@expo/config-plugins");

/**
 * Expo config plugin for expo-audio-streaming
 * Configures native permissions and module linking
 */
const withAudioStreaming = (config) => {
  // Configure Android permissions
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    // Add RECORD_AUDIO permission if not already present
    const hasRecordAudioPermission = manifest["uses-permission"].some(
      (perm) => perm.$["android:name"] === "android.permission.RECORD_AUDIO"
    );

    if (!hasRecordAudioPermission) {
      manifest["uses-permission"].push({
        $: {
          "android:name": "android.permission.RECORD_AUDIO",
        },
      });
    }

    return config;
  });

  // Configure iOS permissions
  config = withInfoPlist(config, (config) => {
    const { modResults } = config;

    // Add NSMicrophoneUsageDescription if not already present
    if (!modResults.NSMicrophoneUsageDescription) {
      modResults.NSMicrophoneUsageDescription =
        "This app needs microphone access for voice assistant features.";
    }

    return config;
  });

  return config;
};

module.exports = withAudioStreaming;

