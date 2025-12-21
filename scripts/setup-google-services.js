#!/usr/bin/env node

/**
 * Script to write google-services.json from EAS secret during build
 * This allows google-services.json to be available in EAS builds
 * without committing it to the repository
 */

const fs = require('fs');
const path = require('path');

const GOOGLE_SERVICES_SECRET = process.env.GOOGLE_SERVICES_JSON;
const OUTPUT_PATH = path.join(__dirname, '..', 'google-services.json');

if (!GOOGLE_SERVICES_SECRET) {
  console.error('ERROR: GOOGLE_SERVICES_JSON environment variable is not set');
  console.error('Please set it as an EAS secret using:');
  console.error('  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(cat google-services.json)"');
  process.exit(1);
}

try {
  // Parse the JSON to validate it
  const googleServices = JSON.parse(GOOGLE_SERVICES_SECRET);
  
  // Write the file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(googleServices, null, 2), 'utf8');
  
  console.log('✓ Successfully wrote google-services.json');
} catch (error) {
  console.error('ERROR: Failed to write google-services.json:', error.message);
  process.exit(1);
}

