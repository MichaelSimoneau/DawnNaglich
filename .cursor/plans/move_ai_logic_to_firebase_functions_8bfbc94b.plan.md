---
name: Move AI Logic to Firebase Functions
overview: Move sensitive AI operations from client-side components to Firebase Functions to secure API keys, improve performance, and enable advanced AI features. This includes creating server-side proxies for Gemini Live API and managing system instructions centrally.
todos:
  - id: create-live-session-function
    content: Create createGeminiLiveSession Firebase Function to initialize Live API connection server-side
    status: completed
  - id: create-live-proxy-function
    content: Create proxyGeminiLiveMessage Firebase Function for bidirectional message streaming
    status: completed
    dependencies:
      - create-live-session-function
  - id: move-system-instructions
    content: Move system instructions to server-side in generateGeminiResponse function
    status: completed
  - id: create-function-declarations
    content: Create functionDeclarations.ts module to centralize tool definitions
    status: completed
  - id: update-admin-assistant
    content: Update AdminVoiceAssistant.tsx to use Firebase Functions instead of direct API
    status: completed
    dependencies:
      - create-live-session-function
      - create-live-proxy-function
  - id: update-client-assistant
    content: Update ClientAssistant.tsx to remove hardcoded system instruction and pass role context
    status: completed
    dependencies:
      - move-system-instructions
  - id: add-firebase-rewrites
    content: Add Firebase Hosting rewrites for new functions in firebase.json
    status: completed
    dependencies:
      - create-live-session-function
      - create-live-proxy-function
---

# Move AI Logic to Firebase Functions

## Security Issues Identified

1. **CRITICAL**: `AdminVoiceAssistant.tsx` uses `EXPO_PUBLIC_GEMINI_API_KEY` directly on the client, exposing the API key in the client bundle
2. System instructions are hardcoded in client components, making updates difficult
3. Client-side AI logic limits advanced features and rate limiting

## What Should Be Moved

### 1. AdminVoiceAssistant - Gemini Live API Proxy (HIGH PRIORITY)

**Current State:**

- `AdminVoiceAssistant.tsx` connects directly to Gemini Live API from client
- Uses `EXPO_PUBLIC_GEMINI_API_KEY` (exposed in client bundle)
- Handles audio streaming, function calling, and transcription on client

**Should Move:**

- Create `createGeminiLiveSession` Firebase Function to initialize Live API connection
- Create `proxyGeminiLiveMessage` Firebase Function to handle bidirectional message streaming
- Move API key management entirely to server-side
- System instructions should be server-managed

**Keep Client-Side:**

- Audio capture and playback (requires browser APIs)
- UI rendering and state management
- Real-time audio streaming (can be proxied through function)

### 2. ClientAssistant - System Instruction Management

**Current State:**

- System instruction hardcoded in `ClientAssistant.tsx` (line 192-195)
- Already uses `generateGeminiResponse` function (good!)

**Should Move:**

- Move system instruction to server-side in `generateGeminiResponse` function
- Allow versioning and A/B testing of system instructions
- Make system instructions configurable per user role

### 3. Function Declarations for AdminVoiceAssistant

**Current State:**

- Function declarations defined in `AdminVoiceAssistant.tsx` (lines 93-153)
- These define the tools available to the AI

**Should Move:**

- Move function declarations to server-side
- Allow dynamic tool configuration
- Centralize tool definitions for consistency

## Implementation Plan

### Phase 1: Secure AdminVoiceAssistant (Critical)

1. **Create `createGeminiLiveSession` function** (`functions/src/index.ts`)

- Initialize Gemini Live API connection server-side
- Return session configuration to client
- Use `GEMINI_API_KEY` secret (already configured)

2. **Create `proxyGeminiLiveMessage` function** (`functions/src/index.ts`)

- Handle bidirectional message streaming
- Proxy audio data between client and Gemini API
- Manage function calling server-side
- Return audio responses and transcriptions

3. **Update `AdminVoiceAssistant.tsx`**

- Remove direct Gemini API connection
- Connect to Firebase Functions instead
- Keep audio capture/playback on client
- Stream audio through function proxy

### Phase 2: Enhance ClientAssistant

1. **Update `generateGeminiResponse` function** (`functions/src/index.ts`)

- Move system instruction to server-side
- Add system instruction versioning
- Support role-based system instructions
- Remove system instruction from client call

2. **Update `ClientAssistant.tsx`**

- Remove hardcoded system instruction
- Pass user role/context to function
- Let server determine appropriate system instruction

### Phase 3: Centralize Function Declarations

1. **Create function declarations module** (`functions/src/functionDeclarations.ts`)

- Define all tool declarations server-side
- Support dynamic tool configuration
- Export for use in both functions

2. **Update `generateGeminiLiveSession`**

- Use server-side function declarations
- Allow tool configuration per session

## Files to Create/Modify

### New Files:

- `functions/src/functionDeclarations.ts` - Centralized function declarations
- `functions/src/systemInstructions.ts` - System instruction templates

### Files to Modify:

- `functions/src/index.ts` - Add new functions
- `components/AdminVoiceAssistant.tsx` - Use Firebase Functions instead of direct API
- `components/ClientAssistant.tsx` - Remove system instruction, pass role context
- `firebase.json` - Add rewrites for new functions

## Technical Considerations

1. **Real-time Audio Streaming:**

- Firebase Functions have timeout limits (540s for v2)
- May need WebSocket-like connection or streaming approach
- Consider using Firebase Realtime Database or Firestore for message passing
- Alternative: Use HTTP streaming with Server-Sent Events

2. **Function Calling:**

- Calendar operations already go through `CalendarService` (uses Firebase Functions)
- Function calling can be handled server-side in the proxy

3. **Audio Processing:**

- Keep `audioUtils.ts` client-side (requires browser AudioContext)
- Send encoded audio data to function
- Receive encoded audio responses from function

## Benefits

1. **Security**: API keys never exposed to client
2. **Performance**: Server-side processing, rate limiting, caching
3. **Maintainability**: Centralized AI logic, easier updates