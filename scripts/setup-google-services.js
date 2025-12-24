#!/usr/bin/env node

/**
 * Script to write google-services.json or GoogleServices-Info.plist from EAS secret during build
 * This allows google-services files to be available in EAS builds
 * without committing them to the repository
 */

const fs = require("fs");
const path = require("path");

// Auto-detect platform from environment variables or command line args
let platform = "android"; // default platform

// First, try to detect from EAS Build environment variable
// EAS sets EAS_BUILD_PLATFORM or we can check other indicators
if (process.env.EAS_BUILD_PLATFORM) {
  const easPlatform = process.env.EAS_BUILD_PLATFORM.toLowerCase();
  if (easPlatform === "ios" || easPlatform === "android") {
    platform = easPlatform;
  }
} else if (process.env.PLATFORM) {
  // Alternative environment variable
  const envPlatform = process.env.PLATFORM.toLowerCase();
  if (envPlatform === "ios" || envPlatform === "android") {
    platform = envPlatform;
  }
} else {
  // Fall back to command line args (but ignore if they're malformed)
  const argv = process.argv.slice(2);
  const platformFlagIndex = argv.findIndex((arg) => arg === "--platform");
  if (platformFlagIndex !== -1 && argv[platformFlagIndex + 1]) {
    const value = argv[platformFlagIndex + 1].toLowerCase();
    if (value === "android" || value === "ios") {
      platform = value;
    }
    // If invalid, just use default - don't exit with error
  }

  // Also check if we can infer from build context
  // If ios/ directory exists, we're likely building for iOS
  const iosDir = path.join(__dirname, "..", "ios");
  if (fs.existsSync(iosDir)) {
    // Check if this is an iOS build by looking for Xcode project files
    const xcodeProj = fs
      .readdirSync(iosDir)
      .find((f) => f.endsWith(".xcodeproj") || f.endsWith(".xcworkspace"));
    if (xcodeProj) {
      platform = "ios";
    }
  }
}

const fileName =
  platform === "android" ? "google-services.json" : "GoogleServices-Info.plist";
console.log(`Setting up ${fileName} for ${platform} platform...`);

const GOOGLE_SERVICES_SECRET = process.env.GOOGLE_SERVICES_JSON;
// For iOS, write to the DawnNaglichWellness directory where Xcode expects it
const OUTPUT_PATH =
  platform === "ios"
    ? path.join(__dirname, "..", "ios", "DawnNaglichWellness", fileName)
    : path.join(__dirname, "..", fileName);

if (!GOOGLE_SERVICES_SECRET) {
  console.warn(
    `⚠ WARNING: GOOGLE_SERVICES_JSON environment variable is not set`,
  );
  console.warn(
    `⚠ Skipping ${fileName} setup. If you need Firebase, set the EAS secret:`,
  );
  console.warn(
    `  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(cat ${fileName})"`,
  );
  // Don't exit with error - allow build to continue if file already exists
  if (fs.existsSync(OUTPUT_PATH)) {
    console.log(`✓ ${fileName} already exists, continuing...`);
    process.exit(0);
  }
  process.exit(0); // Exit successfully to allow build to continue
}

try {
  if (platform === "ios") {
    // For iOS, the secret might be JSON or PLIST format
    // Try to parse as JSON first, if it fails, assume it's already PLIST format
    let plistContent;
    try {
      const jsonData = JSON.parse(GOOGLE_SERVICES_SECRET);
      // If it's JSON, we need to convert to PLIST format
      // For now, if it's valid JSON, write it as-is (assuming it's the plist content as JSON string)
      // Actually, if the secret contains the plist XML, it should be written directly
      plistContent = GOOGLE_SERVICES_SECRET;
    } catch {
      // Not JSON, assume it's already PLIST format
      plistContent = GOOGLE_SERVICES_SECRET;
    }
    fs.writeFileSync(OUTPUT_PATH, plistContent, "utf8");
  } else {
    // For Android, parse and write as JSON
    const googleServices = JSON.parse(GOOGLE_SERVICES_SECRET);
    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(googleServices, null, 2),
      "utf8",
    );
  }

  console.log(`✓ Successfully wrote ${fileName}`);
} catch (error) {
  console.error(`ERROR: Failed to write ${fileName}:`, error.message);
  // Don't exit with error if file already exists
  if (fs.existsSync(OUTPUT_PATH)) {
    console.log(`✓ ${fileName} already exists, continuing...`);
    process.exit(0);
  }
  process.exit(1);
}
