---
name: Fix Web Icons and Client Assistant Connection
overview: Fix missing icons on web by properly loading Expo vector icon fonts, and fix the client assistant connection by removing CORS and using Firebase Hosting rewrites via standard callable functions.
todos:
  - id: remove-cors
    content: "Remove cors: true from all Firebase functions in functions/src/index.ts"
    status: pending
  - id: load-fonts
    content: Add font loading in app/_layout.tsx using expo-font to load FontAwesome6 fonts for web
    status: pending
  - id: fix-function-calls
    content: Replace httpsCallableFromURL with standard httpsCallable in ClientAssistant.tsx to use Firebase Hosting rewrites
    status: pending
---

# Fix Web Icons and Client Assistant Connection

## Issues Identified

1. **Icons missing on web**: Font files from `@expo/vector-icons` are failing to load with "OTS parsing error: invalid sfntVersion" errors. The fonts need to be properly loaded using `expo-font`.
2. **Client assistant connection failure**: The assistant is using `httpsCallableFromURL` with CORS enabled. Since Firebase Hosting rewrites handle routing `/api/FUNCTION_NAME` to functions, CORS is unnecessary and should be removed. The function should use standard Firebase callable functions.

## Solution

### 1. Remove CORS from Firebase Functions

**Problem**: Functions have `cors: true` enabled, but since requests go through Firebase Hosting rewrites (same-origin), CORS is not needed and can cause issues.**Fix**:

- Remove `cors: true` from all function configurations in `functions/src/index.ts`
- Functions will be accessed via `/api/FUNCTION_NAME` rewrites in `firebase.json` (already configured)

**Files to modify**:

- `functions/src/index.ts` - Remove `cors: true` from all `onCall` configurations:
- `getCalendarEventsSecure`
- `createCalendarEventSecure`
- `confirmCalendarEventSecure`
- `cancelCalendarEventSecure`
- `generateGeminiResponse`

### 2. Fix Icon Loading for Web

**Problem**: Expo vector icons need proper font loading on web. The current setup doesn't explicitly load the fonts.**Fix**:

- Use `expo-font` to load FontAwesome6 fonts explicitly in `app/_layout.tsx`
- Load fonts from `@expo/vector-icons` package
- Ensure fonts are loaded before rendering the app
- Handle font loading errors gracefully

**Files to modify**:

- `app/_layout.tsx` - Add font loading using `useFonts` from `expo-font` and `FontAwesome6` font files

### 3. Fix Client Assistant Firebase Function Calls

**Problem**: `ClientAssistant.tsx` uses `httpsCallableFromURL` with manual URL construction and emulator detection. Since Firebase Hosting rewrites handle routing, we should use standard callable functions.**Fix**:

- Replace `httpsCallableFromURL` with standard `httpsCallable` from `firebase/functions`
- Remove manual URL construction and emulator detection logic
- Use `httpsCallable(functions, 'generateGeminiResponse')` directly
- The Firebase SDK will automatically use the correct endpoint via the rewrites

**Files to modify**:

- `components/ClientAssistant.tsx` - Replace URL-based calls with standard callable functions

## Implementation Details

### Remove CORS (`functions/src/index.ts`)

- Remove `cors: true` from all 5 function configurations
- Keep all other configuration (secrets, etc.) unchanged
- Functions will work via Firebase Hosting rewrites without CORS

### Font Loading (`app/_layout.tsx`)

- Import `useFonts` from `expo-font`
- Import FontAwesome6 font files from `@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/`
- Load FontAwesome6_Solid and FontAwesome6_Regular fonts
- Show loading state until fonts are loaded
- Handle font loading errors gracefully

### Function Call Update (`components/ClientAssistant.tsx`)

- Replace `httpsCallableFromURL` import with `httpsCallable`
- Remove emulator detection logic (lines 175-190)
- Remove manual URL construction
- Use `httpsCallable(functions, 'generateGeminiResponse')` directly
- Simplify error handling

## Testing

After implementation:

1. Verify icons render correctly on web (check browser console for font errors)
2. Test client assistant chat functionality
3. Verify function calls work via Firebase Hosting rewrites (no CORS errors)