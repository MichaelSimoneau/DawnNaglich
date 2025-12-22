---
name: Fix iOS Google OAuth Redirect URI
overview: "Fix the iOS Google OAuth \"Error 400: invalid_request\" by using the REVERSED_CLIENT_ID from GoogleService-Info.plist as the redirect URI scheme instead of the custom \"dawn-naglich://auth\" scheme, and register it in Info.plist."
todos:
  - id: add-reversed-client-id-to-info-plist
    content: Add REVERSED_CLIENT_ID to CFBundleURLSchemes in ios/DawnNaglichWellness/Info.plist
    status: completed
  - id: update-login-redirect-uri
    content: Update components/Login.tsx to use REVERSED_CLIENT_ID as redirect URI scheme for iOS
    status: completed
  - id: verify-google-console
    content: Verify REVERSED_CLIENT_ID redirect URI is registered in Google Cloud Console (manual step)
    status: completed
---

# Fix iOS Google OAuth Redirect URI Error

## Problem

The app is getting "Error 400: invalid_request" because Google OAuth on iOS doesn't accept the custom redirect URI `dawn-naglich://auth`. iOS requires using the **REVERSED_CLIENT_ID** from `GoogleService-Info.plist` as the redirect URI scheme.

## Solution

### 1. Add REVERSED_CLIENT_ID to iOS Info.plist

Add the REVERSED_CLIENT_ID (`com.googleusercontent.apps.333181114084-jlhi5ji8j3mc20mecaf0lo7u5urse2ip`) to the `CFBundleURLSchemes` array in [ios/DawnNaglichWellness/Info.plist](ios/DawnNaglichWellness/Info.plist). This allows the app to handle the OAuth callback.

### 2. Update Login Component to Use REVERSED_CLIENT_ID for iOS

Modify [components/Login.tsx](components/Login.tsx) to:

- Read the REVERSED_CLIENT_ID from `GoogleService-Info.plist` (or use it directly)
- Use the REVERSED_CLIENT_ID as the redirect URI scheme for iOS instead of `dawn-naglich://auth`
- Keep the custom scheme for other purposes if needed

### 3. Verify Google Cloud Console Configuration

Ensure the REVERSED_CLIENT_ID redirect URI is registered in Google Cloud Console for the iOS OAuth client. The format should be: `com.googleusercontent.apps.333181114084-jlhi5ji8j3mc20mecaf0lo7u5urse2ip:/`

## Implementation Details

**Files to modify:**

- `ios/DawnNaglichWellness/Info.plist` - Add REVERSED_CLIENT_ID to URL schemes
- `components/Login.tsx` - Update redirect URI logic for iOS

**Key values:**