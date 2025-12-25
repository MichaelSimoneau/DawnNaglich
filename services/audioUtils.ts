export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createBlob(data: Float32Array): {
  data: string;
  mimeType: string;
} {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: "audio/pcm;rate=16000",
  };
}

/**
 * Convert native audio data (from expo-av recording) to PCM format
 * Note: This is a placeholder for native audio conversion
 * In production, you would need to decode the native audio format (M4A) to PCM
 * This typically requires a native module or audio processing library
 */
export function convertNativeAudioToPCM(
  audioData: ArrayBuffer | Uint8Array
): Float32Array {
  // For now, this is a placeholder
  // In a real implementation, you would:
  // 1. Decode the M4A/AAC audio file
  // 2. Convert to PCM format
  // 3. Resample to 16kHz if needed
  // 4. Convert to mono if needed
  
  // Placeholder: assume input is already PCM data
  if (audioData instanceof Uint8Array) {
    // Convert Uint8Array to Int16Array, then to Float32Array
    const int16Data = new Int16Array(audioData.buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }
    return float32Data;
  }
  
  // If ArrayBuffer, convert to Uint8Array first
  const uint8Data = new Uint8Array(audioData);
  const int16Data = new Int16Array(uint8Data.buffer);
  const float32Data = new Float32Array(int16Data.length);
  for (let i = 0; i < int16Data.length; i++) {
    float32Data[i] = int16Data[i] / 32768.0;
  }
  return float32Data;
}

/**
 * Create API-compatible blob format from native audio data
 */
export function createBlobFromNative(
  audioData: ArrayBuffer | Uint8Array
): {
  data: string;
  mimeType: string;
} {
  // Convert native audio to PCM Float32Array
  const pcmData = convertNativeAudioToPCM(audioData);
  
  // Convert Float32Array to PCM blob format
  return createBlob(pcmData);
}

/**
 * Read audio file and convert to PCM format
 * This is a helper for reading expo-av recording files
 */
export async function readAudioFileToPCM(
  fileUri: string
): Promise<Float32Array> {
  // In a real implementation, you would:
  // 1. Read the file using expo-file-system
  // 2. Decode the audio format (M4A/AAC) to PCM
  // 3. Return Float32Array
  
  // Placeholder implementation
  // Note: This requires file system access and audio decoding
  // For now, return empty array as placeholder
  console.warn("readAudioFileToPCM: Not fully implemented - requires audio decoding library");
  return new Float32Array(0);
}
