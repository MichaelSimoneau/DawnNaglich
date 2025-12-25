---
name: Fix AdminVoiceAssistant API Errors
overview: Fix the `proxyGeminiLiveMessage` function to use the correct Google GenAI SDK API (`ai.models.generateContent()` instead of `ai.getGenerativeModel()`), matching the pattern used in `generateGeminiResponse`. Also investigate and fix the `getCalendarEventsSecure` 500 error.
todos:
  - id: fix-proxy-api
    content: Replace ai.getGenerativeModel() with ai.models.generateContent() in proxyGeminiLiveMessage
    status: pending
  - id: fix-function-response
    content: Update function response handling to use correct API format
    status: pending
    dependencies:
      - fix-proxy-api
  - id: fix-media-message
    content: Update media and message handling to use correct API format
    status: pending
    dependencies:
      - fix-proxy-api
  - id: investigate-calendar-error
    content: Investigate getCalendarEventsSecure 500 error and add better error handling
    status: pending
---

# Fix AdminVoiceAssistant API Errors

## Problem Analysis

The `AdminVoiceAssistant` component is experiencing multiple errors:

1. **Primary Error**: `proxyGeminiLiveMessage` throws `ai.getGenerativeModel is not a function` (500 Internal Server Error)

- **Root Cause**: The function uses `ai.getGenerativeModel()` which doesn't exist in the Google GenAI SDK
- **Correct API**: Should use `ai.models.generateContent()` as shown in `generateGeminiResponse` function

2. **Secondary Error**: `getCalendarEventsSecure` returns 500 Internal Server Error

- **Error Message**: "Failed to fetch calendar events."
- **Possible Causes**: Error in `getCalendarEventsCore` function, possibly related to calendar sync logic or Firestore access

3. **Expected Errors** (403 Forbidden):

- `getCalendarConfig` - Admin only, expected when not authenticated as admin
- `listAvailableCalendars` - Admin only, expected when not authenticated as admin

## Solution

### 1. Fix `proxyGeminiLiveMessage` API Usage

**File**: `functions/src/index.ts` (starting at line 810)**Current Incorrect Code** (lines 833-837):

```typescript
const model = ai.getGenerativeModel({
  model: 'gemini-2.5-pro',
  systemInstruction: systemInstruction,
  tools: [{ functionDeclarations: allToolDeclarations }],
});
```

**What to Change**:

1. **Remove** the `const model = ai.getGenerativeModel(...)` line (line 833-837)
2. **Replace** all instances of `model.generateContent(...)` with `ai.models.generateContent({ model: 'gemini-2.5-pro', contents: [...], config: {...} })`

**Correct Pattern** (from `generateGeminiResponse` at line 653):

```typescript
let result = await ai.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: contents,
  config: {
    systemInstruction: dynamicSystemInstruction,
    tools: [{ functionDeclarations: allToolDeclarations }],
  },
});
```



### 2. Detailed Code Changes

#### Change 1: Function Response Handling (lines 839-868)

**Current Code**:

```typescript
if (functionResponse) {
  const result = await model.generateContent([
    {
      role: 'model',
      parts: [
        {
          functionResponse: {
            name: functionResponse.name,
            response: functionResponse.response,
          },
        },
      ],
    },
  ]);
  const response = await result.response;
  const text = response.text();
  // ... rest of code
}
```

**Replace With**:

```typescript
if (functionResponse) {
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [
      {
        role: 'model',
        parts: [
          {
            functionResponse: {
              name: functionResponse.name,
              response: functionResponse.response,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: allToolDeclarations }],
    },
  });
  const response = await result.response;
  const text = response.text();
  // ... rest of code (keep as is)
}
```

**Key Changes**:

- Change `model.generateContent([...])` to `ai.models.generateContent({ model: 'gemini-2.5-pro', contents: [...], config: {...} })`
- Move `contents` array into the `contents` property
- Add `config` object with `systemInstruction` and `tools`

#### Change 2: Media Input Handling (lines 875-883)

**Current Code**:

```typescript
if (media) {
  result = await model.generateContent([
    {
      inlineData: {
        data: media.data,
        mimeType: media.mimeType,
      },
    },
  ]);
}
```

**Replace With**:

```typescript
if (media) {
  result = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: media.data,
              mimeType: media.mimeType,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: allToolDeclarations }],
    },
  });
}
```

**Key Changes**:

- Change `model.generateContent([...])` to `ai.models.generateContent({ model: 'gemini-2.5-pro', contents: [...], config: {...} })`
- Wrap the inlineData in a proper content structure with `role: 'user'` and `parts` array
- Add `config` object with `systemInstruction` and `tools`

#### Change 3: Message Input Handling (lines 884-885)

**Current Code**:

```typescript
} else if (message) {
  result = await model.generateContent(message);
}
```

**Replace With**:

```typescript
} else if (message) {
  // Handle message input - could be string or array
  const contents = typeof message === 'string' 
    ? [{ role: 'user', parts: [{ text: message }] }]
    : message;
  
  result = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: allToolDeclarations }],
    },
  });
}
```

**Key Changes**:

- Change `model.generateContent(message)` to `ai.models.generateContent({ model: 'gemini-2.5-pro', contents: [...], config: {...} })`
- Normalize message input to proper content format if it's a string
- Add `config` object with `systemInstruction` and `tools`

### 3. Fix Calendar Events Error

**File**: `functions/src/index.ts` (function `getCalendarEventsCore` starting at line 168)**Potential Issues**:

- The function might be throwing an unhandled error when accessing Firestore or Google Calendar API
- The error message "Failed to fetch calendar events." suggests the catch block in `getCalendarEventsSecure` is catching an error

**What to Check**:

1. Verify that `getAppCalendarId()` doesn't throw errors
2. Ensure Firestore access is working correctly
3. Check if calendar sync logic is causing issues

**Action**: Add better error logging to identify the exact failure point:**In `getCalendarEventsCore`** (around line 175):

- Wrap the `getAppCalendarId()` call in try-catch and log errors
- Wrap the calendar API calls in try-catch and log specific errors
- Ensure all errors are properly caught and logged before being re-thrown

**In `getCalendarEventsSecure`** (around line 318):

- The function already calls `getCalendarEventsCore` and should catch errors
- Verify the error handling is working correctly
- Add more detailed error messages

### 4. Implementation Steps

1. **Remove the incorrect `model` variable** (line 833-837)

- Delete: `const model = ai.getGenerativeModel({...});`

2. **Update function response handling** (lines 839-868)

- Replace `model.generateContent([...])` with `ai.models.generateContent({ model: 'gemini-2.5-pro', contents: [...], config: {...} })`
- Ensure the `contents` array structure matches the expected format
- Include `config` with `systemInstruction` and `tools`

3. **Update media input handling** (lines 875-883)

- Replace `model.generateContent([...])` with `ai.models.generateContent({ model: 'gemini-2.5-pro', contents: [...], config: {...} })`
- Wrap inlineData in proper content structure with `role: 'user'` and `parts` array
- Include `config` with `systemInstruction` and `tools`

4. **Update message input handling** (lines 884-885)

- Replace `model.generateContent(message)` with `ai.models.generateContent({ model: 'gemini-2.5-pro', contents: [...], config: {...} })`
- Normalize message to proper content format
- Include `config` with `systemInstruction` and `tools`

5. **Add error logging to calendar function**

- Add try-catch blocks around critical operations in `getCalendarEventsCore`
- Log specific error messages to help diagnose the 500 error
- Ensure errors are properly propagated

### 5. Testing Checklist

After making changes, verify:

- [ ] `proxyGeminiLiveMessage` accepts audio input without errors
- [ ] `proxyGeminiLiveMessage` accepts text message input without errors  
- [ ] `proxyGeminiLiveMessage` handles function responses correctly
- [ ] Function calls are properly detected and returned
- [ ] `getCalendarEventsSecure` works correctly (or at least provides better error messages)
- [ ] AdminVoiceAssistant can process audio and respond correctly
- [ ] Tool calls from Gemini are executed and responses sent back correctly

### 6. Reference Implementation

The correct pattern is demonstrated in `generateGeminiResponse` function (lines 653-660):

```typescript
let result = await ai.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: contents,
  config: {
    systemInstruction: dynamicSystemInstruction,
    tools: [{ functionDeclarations: allToolDeclarations }],
  },
});

```