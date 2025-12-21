---
name: fix-threejs-and-cors-local
overview: Fix the Three.js crash by resolving bundling issues locally, then address CORS using firebase rewrites and local emulation.
todos:
  - id: fix-snow-imports
    content: Refactor SnowOverlay.tsx to use explicit named imports from 'three'
    status: completed
  - id: verify-three-local
    content: Build web and run firebase hosting emulator to verify Three.js fix
    status: completed
    dependencies:
      - fix-snow-imports
  - id: fix-cors-client
    content: Update calendarService.ts to use relative paths /api/... with httpsCallableFromURL
    status: completed
    dependencies:
      - verify-three-local
  - id: verify-api-local
    content: Run full firebase emulators (hosting + functions) to verify API calls
    status: completed
    dependencies:
      - fix-cors-client
---

# Fix Three.js Crash & CORS (Local Emulator Focus)

We will stop deploying to production and fix the issues locally using Firebase Emulators and Metro.

### 1. Fix Three.js Runtime Error (`reading 'S'`)

The error `TypeError: Cannot read properties of undefined (reading 'S')` in `SnowOverlay` is likely due to incorrect bundling of `three` (aggressive tree-shaking or module resolution) when using `import * as THREE`.

- **Refactor `components/SnowOverlay.tsx`**: 
- Change imports to explicit named imports to ensure the bundler includes exactly what is needed.
- specifically import `AdditiveBlending` and `Points` directly from `three`.
- Remove wildcard import `import * as THREE`.

### 2. Verify Fix Locally (No Deploy)

- **Build Web**: Run `pnpm build:web --clear` to generate a fresh `dist` folder.
- **Serve Locally**: Use `pnpm exec firebase emulators:start --only hosting` to serve the `dist` folder locally.
- **Test**: Open the local URL (usually `http://127.0.0.1:5000`) in the browser.
- **Success Criteria**: The page loads, the snow animation plays, and there are no `TypeError` messages in the console.

### 3. Fix CORS via Rewrite (Same-Origin)

The CORS error persists because the client is requesting the cross-origin Cloud Functions URL (`https://us-central1...`) instead of the Hosting URL with the `/api` rewrite (`https://dawn-naglich.web.app/api/...`).

- **Update `services/calendarService.ts`**:
- Modify `getEventsSecure`, `createEventSecure`, etc., to use `httpsCallableFromURL`.
- **Critical**: Use `window.location.origin` to construct an absolute URL that points to the *current hosting origin* (e.g., `http://localhost:5000/api/getCalendarEventsSecure` when local, or `https://dawn-naglich.web.app/api/...` when deployed).
- This forces the request to go through the Firebase Hosting Rewrite rule, which proxies it to the function. This is a **Same-Origin** request, bypassing CORS completely.

### 4. Verify API Locally

- **Run Full Emulators**: Run `pnpm exec firebase emulators:start` (starts Hosting AND Functions emulators).
- **Test**: Use the app locally to fetch calendar events.
- **Success Criteria**: 
- Network request goes to `http://localhost:5000/api/getCalendarEventsSecure`.
- No CORS error.
- Data is returned (or mock data if functions aren't fully mocked, but the connection should work).

### 5. Final Deploy