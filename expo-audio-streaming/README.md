# expo-audio-streaming

Expo module for real-time audio streaming on iOS and Android. Provides PCM audio chunks in real-time, matching Web Audio API behavior on web platforms.

## Features

- Real-time PCM audio streaming (16kHz, mono, 16-bit)
- Immediate audio capture on start
- Base64 encoded PCM data chunks
- Event-based streaming architecture
- Permission handling
- Cross-platform (iOS & Android)

## Installation

This module is included as a local dependency in the project. To use it:

1. Add to `app.json` plugins:
```json
{
  "plugins": [
    "./expo-audio-streaming/app.plugin.js"
  ]
}
```

2. Add to `package.json`:
```json
{
  "dependencies": {
    "expo-audio-streaming": "file:./expo-audio-streaming"
  }
}
```

3. Run `npx expo prebuild` to configure native projects

## Usage

```typescript
import AudioStreamingModule from 'expo-audio-streaming';

// Set up audio chunk callback
const unsubscribe = AudioStreamingModule.onAudioChunk((chunk) => {
  console.log('Audio chunk:', chunk.data); // base64 PCM data
  console.log('MIME type:', chunk.mimeType); // "audio/pcm;rate=16000"
});

// Start recording
await AudioStreamingModule.startRecording();

// Stop recording
await AudioStreamingModule.stopRecording();

// Clean up
unsubscribe();
```

## API

### `isSupported(): boolean`
Check if audio streaming is supported on the current platform.

### `startRecording(): Promise<void>`
Start recording audio and streaming chunks. Requests microphone permission if needed.

### `stopRecording(): Promise<void>`
Stop recording audio.

### `isRecording(): Promise<boolean>`
Check if currently recording.

### `onAudioChunk(callback: (chunk: AudioChunk) => void): () => void`
Set callback for audio chunks. Returns unsubscribe function.

## Audio Format

- **Sample Rate**: 16000 Hz
- **Channels**: Mono (1 channel)
- **Bit Depth**: 16-bit PCM
- **Encoding**: Base64 encoded PCM data
- **MIME Type**: `audio/pcm;rate=16000`

## Permissions

- **Android**: `RECORD_AUDIO` permission (configured via plugin)
- **iOS**: `NSMicrophoneUsageDescription` (configured via plugin)

## Platform Support

- ✅ iOS 13+
- ✅ Android API 23+
- ❌ Web (use Web Audio API instead)

## Architecture

- **Android**: Uses `AudioRecord` API for real-time PCM capture
- **iOS**: Uses `AVAudioEngine` with input node tap for real-time PCM capture
- **Events**: Audio chunks are sent via React Native events

