---
name: Fix Firebase Functions API Calls Across Project
overview: "Fix multiple issues with Firebase Functions API calls: broken URL construction in calendarService, incorrect function signatures, missing native platform support, and improper request/response handling."
todos:
  - id: fix-calendar-service-urls
    content: Fix undefined URL variables in confirmEventSecure and cancelEventSecure methods
    status: completed
  - id: add-native-support
    content: Add native platform support to all calendarService methods using Firebase Hosting domain
    status: completed
  - id: fix-request-format
    content: "Wrap all POST request bodies in { data: ... } format for callable functions"
    status: completed
  - id: fix-response-parsing
    content: "Fix response parsing to handle callable function format { result: { data: ... } }"
    status: completed
  - id: fix-function-signature
    content: Update getEventsSecureV2 to accept optional timeMin and timeMax parameters
    status: completed
  - id: add-headers
    content: Add Content-Type headers to all fetch requests
    status: completed
---

# Fi

x Firebase Functions API Calls Across Project

## Issues Identified

### 1. **calendarService.ts** - Critical Bugs

- **Lines 70, 83**: `confirmEventSecure` and `cancelEventSecure` use undefined `url` variable
- Missing native platform support (only handles web)
- Missing proper request format (should wrap in `{ data: ... }` for callable functions)
- Missing Content-Type headers
- Incorrect response parsing (callable functions return `{ result: { data: ... } }`)

### 2. **calendarService.ts** - Function Signature Mismatch

- **Line 4**: `getEventsSecureV2()` doesn't accept parameters
- **Lines 28-30 in AdminDashboard.tsx**: Called with `timeMin` and `timeMax` parameters
- **Lines 59-61 in Booking.tsx**: Called with `timeMin` and `timeMax` parameters
- This will cause runtime errors

### 3. **calendarService.ts** - Missing Native Platform URLs

- All methods only handle web platform
- Need to add native platform support using Firebase Hosting domain (`https://dawn-naglich.firebaseapp.com/api/...`)

## Files to Fix

### `services/calendarService.ts`

1. Fix `confirmEventSecure` and `cancelEventSecure` URL construction
2. Add native platform support to all methods
3. Fix request format to wrap in `{ data: ... }`
4. Add Content-Type headers
5. Fix response parsing for callable function format
6. Update `getEventsSecureV2` to accept optional `timeMin` and `timeMax` parameters

### `components/AdminDashboard.tsx`

- No changes needed (will work once calendarService is fixed)

### `components/Booking.tsx`

- No changes needed (will work once calendarService is fixed)

## Implementation Details

### Fix `getEventsSecureV2` Signature

```typescript
async getEventsSecureV2(timeMin?: string, timeMax?: string): Promise<any[]>
```



### Fix URL Construction Pattern

All methods should follow this pattern:

```typescript
let url: string;
if (Platform.OS === 'web') {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isEmulator = origin.includes("localhost") || origin.includes("127.0.0.1");
  url = isEmulator
    ? "http://127.0.0.1:5001/dawn-naglich/us-central1/FUNCTION_NAME"
    : `${origin}/api/FUNCTION_NAME`;
} else {
  url = "https://dawn-naglich.firebaseapp.com/api/FUNCTION_NAME";
}
```



### Fix Request Format

All POST requests should wrap data:

```typescript
body: JSON.stringify({
  data: { ...actualData }
})
```



### Fix Response Parsing

Handle callable function response format:

```typescript
const result = await response.json();
const data = result.result?.data || result;
```



### Add Missing Headers

```typescript
headers: {
  'Content-Type': 'application/json',
}
```



## Testing Checklist

- [ ] `getEventsSecureV2()` works with and without parameters
- [ ] `createEventSecure()` works on web and native
- [ ] `confirmEventSecure()` works on web and native
- [ ] `cancelEventSecure()` works on web and native