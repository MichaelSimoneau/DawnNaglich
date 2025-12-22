---
name: Fix Firebase Auth Login Issues
overview: Fix Firebase Auth initialization to use AsyncStorage persistence, resolve "Component auth has not been registered yet" error, and replace deprecated SafeAreaView with react-native-safe-area-context.
todos:
  - id: install-async-storage
    content: Install @react-native-async-storage/async-storage package
    status: pending
  - id: update-firebase-config
    content: Update firebaseConfig.ts to use initializeAuth with AsyncStorage persistence
    status: pending
    dependencies:
      - install-async-storage
  - id: replace-safeareaview-layout
    content: Replace SafeAreaView in app/_layout.tsx with react-native-safe-area-context
    status: pending
  - id: replace-safeareaview-assistant
    content: Replace SafeAreaView in components/AdminVoiceAssistant.tsx with react-native-safe-area-context
    status: pending
---

#Fix Firebase Auth Login Issues

## Problems Identified

1. **Firebase Auth AsyncStorage**: Using `getAuth()` instead of `initializeAuth()` with AsyncStorage persistence, causing auth state to not persist between sessions
2. **Firebase auth component not registered**: Error suggests auth is accessed before initialization completes
3. **SafeAreaView deprecation**: Using deprecated `SafeAreaView` from `react-native` instead of `react-native-safe-area-context`

## Implementation Plan

### 1. Install AsyncStorage Package

- Add `@react-native-async-storage/async-storage` to `package.json` dependencies if not already present
- Run `pnpm install` to install the package

### 2. Update Firebase Configuration

Update [`firebaseConfig.ts`](firebaseConfig.ts) to:

- Import `initializeAuth` and `getReactNativePersistence` from `firebase/auth`
- Import `ReactNativeAsyncStorage` from `@react-native-async-storage/async-storage`
- Replace `getAuth(app)` with `initializeAuth(app, { persistence: getReactNativePersistence(ReactNativeAsyncStorage) })`
- Handle platform-specific initialization (web vs native)
- Ensure proper error handling for initialization failures

### 3. Replace Deprecated SafeAreaView

Update files using deprecated `SafeAreaView`:

- [`app/_layout.tsx`](app/_layout.tsx): Replace `SafeAreaView` import from `react-native` with `SafeAreaView` from `react-native-safe-area-context`
- [`components/AdminVoiceAssistant.tsx`](components/AdminVoiceAssistant.tsx): Replace `SafeAreaView` import from `react-native` with `SafeAreaView` from `react-native-safe-area-context`

### 4. Ensure Proper Initialization Order

- Verify that Firebase Auth is initialized before any components try to use it
- Check that `UserContext` and `Login` component handle the case where auth might be undefined during initialization

## Files to Modify

1. `package.json` - Add AsyncStorage dependency
2. `firebaseConfig.ts` - Update to use `initializeAuth` with AsyncStorage persistence
3. `app/_layout.tsx` - Replace SafeAreaView import
4. `components/AdminVoiceAssistant.tsx` - Replace SafeAreaView import

## Testing

After implementation, verify:

- Firebase Auth warning about AsyncStorage is gone
- Auth state persists between app sessions
- No "Component auth has not been registered yet" errors