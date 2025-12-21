---
name: Fix Three.js support and deploy CORS fixes
overview: Fix the Three.js runtime error by configuring Metro to handle .mjs files correctly, and deploy the updated Cloud Functions to resolve CORS issues.
todos:
  - id: update-metro-three
    content: Update metro.config.js to include 'mjs' in sourceExts for Three.js support
    status: completed
  - id: deploy-functions
    content: Deploy updated Cloud Functions to apply CORS configuration
    status: completed
  - id: rebuild-web
    content: Rebuild web app with clean cache to apply Metro config changes
    status: completed
---
