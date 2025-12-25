---
name: Enhance Voice Module for Native and Web
overview: Transform AdminVoiceAssistant into a unified voice module that works seamlessly on web and native (especially Android), with immediate client-side listening, command queueing, and a message bus pattern. The assistant will respond instantly before backend connection and process queued commands once connected.
todos:
  - id: create-voice-service
    content: "Create unified voiceService.ts with platform-specific implementations (web: Web Audio API, native: expo-av)"
    status: completed
  - id: create-message-bus
    content: Create voiceMessageBus.ts for command queueing and connection state management
    status: completed
  - id: enhance-audio-utils
    content: Add native audio conversion utilities to audioUtils.ts (convertNativeAudioToPCM, createBlobFromNative)
    status: completed
    dependencies:
      - create-voice-service
  - id: refactor-admin-voice
    content: Refactor AdminVoiceAssistant.tsx to use voiceService and voiceMessageBus, implement immediate listening and instant response
    status: completed
    dependencies:
      - create-voice-service
      - create-message-bus
      - enhance-audio-utils
  - id: test-web
    content: Test voice module on web platform - verify immediate listening, queueing, and connection flow
    status: pending
    dependencies:
      - refactor-admin-voice
  - id: test-android
    content: Test voice module on Android - verify native audio recording, permissions, format conversion, and queue processing
    status: pending
    dependencies:
      - refactor-admin-voice
  - id: test-ios
    content: Test voice module on iOS - verify native audio recording, permissions, and queue processing
    status: pending
    dependencies:
      - refactor-admin-voice
---

# Enhance Voice Module for Native and Web

## Overview

The current `AdminVoiceAssistant` only works on web using Web Audio API, has no native support, waits for backend connection before listening, and uses inefficient HTTP polling. This plan transforms it into a unified, responsive voice assistant that works on all platforms with immediate listening, command queueing, and a message bus architecture.

## Current Issues

1. **Platform Limitation**: Only works on web (uses `AudioContext`, `getUserMedia`, `ScriptProcessorNode`)
2. **No Native Support**: No implementation for iOS/Android using expo-av
3. **Delayed Listening**: Waits for backend connection before starting to listen
4. **No Immediate Feedback**: No response before backend is ready
5. **No Command Queue**: Commands are lost if backend isn't ready
6. **Inefficient Communication**: Uses HTTP polling instead of real-time pattern

## Architecture

### Voice Service Layer (`services/voiceService.ts`)

Create a unified voice service that abstracts platform differences:

- **Web**: Uses Web Audio API (`AudioContext`, `getUserMedia`)
- **Native**: Uses `expo-av` (`Audio.Recording`) for recording
- **Unified Interface**: Same API for both platforms

### Message Bus Pattern (`services/voiceMessageBus.ts`)

Implement a client-side message bus for command queueing:

- **Command Queue**: Store audio chunks and commands before backend connection
- **Connection State**: Track backend connection status
- **Message Processing**: Process queued messages once connected
- **Event Emitter**: Notify components of state changes

### Enhanced AdminVoiceAssistant

Refactor to use the new services:

- **Immediate Listening**: Start recording as soon as component mounts
- **Instant Response**: Show "I am still connecting, one moment, please" immediately
- **Queue Management**: Queue commands until backend is ready
- **WebSocket Ready**: Architecture supports WebSocket upgrade (backend changes needed)

## Implementation Plan

### Phase 1: Create Unified Voice Service

**File**: `services/voiceService.ts`

- Abstract audio recording interface
- Platform detection (`Platform.OS`)
- Web implementation using existing Web Audio API code
- Native implementation using `expo-av`:
- Request microphone permissions
- Create `Audio.Recording` instance
- Configure for 16kHz sample rate (PCM)
- Stream audio chunks via `onRecordingStatusUpdate`
- Convert native audio format to base64 PCM for API

**Key Functions**:

- `startRecording()`: Start listening immediately
- `stopRecording()`: Stop listening
- `onAudioChunk(callback)`: Callback for audio data chunks
- `isSupported()`: Check platform support

### Phase 2: Create Message Bus Service

**File**: `services/voiceMessageBus.ts`

- Command queue storage (in-memory array)
- Connection state management
- Message processing pipeline
- Event emitter for state changes

**Key Functions**:

- `queueCommand(audioChunk)`: Add command to queue
- `setConnected(connected)`: Update connection state
- `processQueue()`: Send queued commands to backend
- `clearQueue()`: Clear pending commands
- `onStateChange(callback)`: Subscribe to state changes

### Phase 3: Enhance Audio Utils for Native

**File**: `services/audioUtils.ts`Add native audio conversion utilities:

- `convertNativeAudioToPCM(audioData)`: Convert expo-av format to PCM
- `createBlobFromNative(data)`: Create API-compatible blob format
- Platform-specific audio format handling

### Phase 4: Refactor AdminVoiceAssistant

**File**: `components/AdminVoiceAssistant.tsx`**Changes**:

1. **Immediate Listening**:

- Start recording in `useEffect` on mount (before backend connection)
- Show "I am still connecting, one moment, please" immediately
- Display connection status indicator

2. **Use Voice Service**:

- Replace Web Audio API code with `voiceService`
- Use `voiceMessageBus` for command queueing
- Handle audio chunks via message bus

3. **Connection Flow**:
   ```typescript
            // Pseudo-code flow:
    1. Component mounts → Start recording immediately
    2. Show "connecting" message to user
    3. Queue audio chunks in message bus
    4. Connect to backend (createGeminiLiveSession)
    5. Once connected → Process queued commands
    6. Continue streaming new audio chunks
   ```




4. **State Management**:

- `isListening`: Always true once started
- `isConnecting`: Backend connection status
- `isConnected`: Backend ready to process
- `queuedCommands`: Count of queued items

5. **UI Updates**:

- Show "I am still connecting, one moment, please" when `isConnecting && !isConnected`
- Display queue count badge
- Visual indicator for listening vs connected state

### Phase 5: WebSocket Architecture (Future-Ready)

**Note**: Current backend uses HTTP callable functions. For WebSocket support:

- Design message bus to support WebSocket adapter
- Keep HTTP adapter for current backend
- Add WebSocket adapter when backend supports it

**File**: `services/voiceWebSocketAdapter.ts` (future)

- WebSocket connection management
- Real-time bidirectional communication
- Automatic reconnection
- Message serialization/deserialization

## Technical Details

### Native Audio Recording (expo-av)

```typescript
// Example structure
const recording = new Audio.Recording();
await recording.prepareToRecordAsync({
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
});

await recording.startAsync();
```



### Message Bus Queue Structure

```typescript
interface QueuedCommand {
  id: string;
  audioChunk: { data: string; mimeType: string };
  timestamp: number;
  retryCount: number;
}
```



### Connection States

- `DISCONNECTED`: Backend not connected
- `CONNECTING`: Backend connection in progress
- `CONNECTED`: Backend ready, processing commands
- `ERROR`: Connection error, retrying

## Files to Modify

1. **New Files**:

- `services/voiceService.ts` - Unified voice recording service
- `services/voiceMessageBus.ts` - Command queue and message bus
- `services/voiceWebSocketAdapter.ts` - Future WebSocket support (optional)

2. **Modified Files**:

- `components/AdminVoiceAssistant.tsx` - Refactor to use new services
- `services/audioUtils.ts` - Add native audio conversion utilities

3. **Dependencies**:

- `expo-av` already installed (verify version compatibility)
- May need to add `@react-native-async-storage/async-storage` for queue persistence (optional)

## Testing Strategy

1. **Web**: Verify immediate listening, queueing, and connection flow
2. **Android**: Test native audio recording, permissions, and format conversion
3. **iOS**: Test native audio recording and permissions
4. **Connection Scenarios**:

- Fast connection (no queue needed)
- Slow connection (queue builds up)
- Connection failure (queue persists, retry)
- Offline mode (queue persists)

## Backend Considerations

**Current**: Backend uses HTTP callable functions (`createGeminiLiveSession`, `proxyGeminiLiveMessage`)**Future WebSocket Support** (requires backend changes):

- Backend would need WebSocket endpoint
- Real-time bidirectional streaming
- Session management via WebSocket
- Message bus can be upgraded to use WebSocket adapter

For now, the message bus will use HTTP with efficient batching and queueing.

## Success Criteria

1. ✅ Voice assistant starts listening immediately on component mount
2. ✅ Shows "I am still connecting, one moment, please" before backend ready
3. ✅ Commands are queued and processed once backend connects