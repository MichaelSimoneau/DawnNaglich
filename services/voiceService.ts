import { Platform } from "react-native";
import { createBlob } from "./audioUtils";
import AudioStreamingModule from "../expo-audio-streaming/src/AudioStreamingModule";

export interface AudioChunk {
  data: string;
  mimeType: string;
}

export type AudioChunkCallback = (chunk: AudioChunk) => void;

class VoiceService {
  private isRecording = false;
  private audioChunkCallback: AudioChunkCallback | null = null;
  
  // Web-specific
  private audioContextInputRef: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;
  private audioBufferQueue: Float32Array[] = [];
  private isProcessing = false;
  
  // Native-specific
  private nativeModuleUnsubscribe: (() => void) | null = null;

  /**
   * Check if voice recording is supported on the current platform
   */
  isSupported(): boolean {
    if (Platform.OS === "web") {
      return (
        typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        !!navigator.mediaDevices.getUserMedia
      );
    }
    // Check if native module is available
    return AudioStreamingModule.isSupported();
  }

  /**
   * Start recording audio immediately
   */
  async startRecording(onChunk: AudioChunkCallback): Promise<void> {
    if (this.isRecording) {
      console.warn("VoiceService: Already recording");
      return;
    }

    if (!this.isSupported()) {
      throw new Error(`Voice recording not supported on platform: ${Platform.OS}`);
    }

    this.audioChunkCallback = onChunk;

    if (Platform.OS === "web") {
      await this.startWebRecording();
    } else {
      await this.startNativeRecording();
    }

    this.isRecording = true;
  }

  /**
   * Stop recording audio
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    if (Platform.OS === "web") {
      await this.stopWebRecording();
    } else {
      await this.stopNativeRecording();
    }

    this.isRecording = false;
    this.audioChunkCallback = null;
  }

  /**
   * Get current recording state
   */
  getRecordingState(): boolean {
    return this.isRecording;
  }

  // Web implementation
  private async startWebRecording(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Web Audio API not available");
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;

      // Create AudioContext with 16kHz sample rate
      const AudioContextClass =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported");
      }

      this.audioContextInputRef = new AudioContextClass({ sampleRate: 16000 });

      // Create script processor for audio processing
      const source = this.audioContextInputRef.createMediaStreamSource(stream);
      this.scriptProcessor = this.audioContextInputRef.createScriptProcessor(4096, 1, 1);

      this.audioBufferQueue = [];
      this.isProcessing = false;

      this.scriptProcessor.onaudioprocess = (event) => {
        if (this.isProcessing || !this.audioChunkCallback) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Queue audio for batching (send every few chunks to reduce HTTP overhead)
        this.audioBufferQueue.push(inputData);
        if (this.audioBufferQueue.length < 3) {
          return;
        }

        // Process batched audio
        this.processWebAudioBatch();
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContextInputRef.destination);
    } catch (error) {
      console.error("VoiceService: Error starting web recording", error);
      throw error;
    }
  }

  private processWebAudioBatch(): void {
    if (this.isProcessing || !this.audioChunkCallback || this.audioBufferQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Combine batched audio chunks
      const totalLength = this.audioBufferQueue.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedAudio = new Float32Array(totalLength);
      let offset = 0;
      
      for (const chunk of this.audioBufferQueue) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to blob format
      const mediaData = createBlob(combinedAudio);
      
      // Call callback with audio chunk
      this.audioChunkCallback(mediaData);

      // Clear queue
      this.audioBufferQueue = [];
    } catch (error) {
      console.error("VoiceService: Error processing web audio batch", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async stopWebRecording(): Promise<void> {
    // Stop script processor
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.scriptProcessor = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContextInputRef && this.audioContextInputRef.state !== "closed") {
      try {
        await this.audioContextInputRef.close();
      } catch (e) {
        // Ignore close errors
      }
      this.audioContextInputRef = null;
    }

    this.audioBufferQueue = [];
    this.isProcessing = false;
  }

  // Native implementation using expo-audio-streaming module
  private async startNativeRecording(): Promise<void> {
    try {
      if (!AudioStreamingModule.isSupported()) {
        throw new Error("Audio streaming module not supported on this platform");
      }

      // Set up audio chunk callback
      this.nativeModuleUnsubscribe = AudioStreamingModule.onAudioChunk((chunk) => {
        if (this.audioChunkCallback) {
          this.audioChunkCallback(chunk);
        }
      });

      // Start recording
      await AudioStreamingModule.startRecording();
    } catch (error) {
      console.error("VoiceService: Error starting native recording", error);
      throw error;
    }
  }

  private async stopNativeRecording(): Promise<void> {
    try {
      // Unsubscribe from audio chunks
      if (this.nativeModuleUnsubscribe) {
        this.nativeModuleUnsubscribe();
        this.nativeModuleUnsubscribe = null;
      }

      // Stop recording
      await AudioStreamingModule.stopRecording();
    } catch (error) {
      console.error("VoiceService: Error stopping native recording", error);
    }
  }
}

// Export singleton instance
export const voiceService = new VoiceService();

