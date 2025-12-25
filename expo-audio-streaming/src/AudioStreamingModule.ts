import { NativeModules, NativeEventEmitter, Platform } from "react-native";

export interface AudioChunk {
  data: string;
  mimeType: string;
}

const { AudioStreamingModule } = NativeModules;

const eventEmitter = AudioStreamingModule
  ? new NativeEventEmitter(AudioStreamingModule)
  : null;

export interface AudioStreamingModuleInterface {
  /**
   * Check if audio streaming is supported on the current platform
   */
  isSupported(): boolean;

  /**
   * Start recording audio and streaming chunks
   */
  startRecording(): Promise<void>;

  /**
   * Stop recording audio
   */
  stopRecording(): Promise<void>;

  /**
   * Check if currently recording
   */
  isRecording(): Promise<boolean>;

  /**
   * Set callback for audio chunks
   */
  onAudioChunk(callback: (chunk: AudioChunk) => void): () => void;
}

class AudioStreamingModuleImpl implements AudioStreamingModuleInterface {
  private audioChunkCallback: ((chunk: AudioChunk) => void) | null = null;
  private eventSubscription: any = null;

  isSupported(): boolean {
    if (Platform.OS === "web") {
      return false; // Use Web Audio API on web
    }
    return !!AudioStreamingModule;
  }

  async startRecording(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error(
        `Audio streaming not supported on platform: ${Platform.OS}`
      );
    }

    if (!AudioStreamingModule) {
      throw new Error("AudioStreamingModule native module not available");
    }

    // Set up event listener if not already set
    if (!this.eventSubscription && eventEmitter) {
      this.eventSubscription = eventEmitter.addListener(
        "onAudioChunk",
        (event: { data: string; mimeType: string }) => {
          if (this.audioChunkCallback) {
            this.audioChunkCallback({
              data: event.data,
              mimeType: event.mimeType,
            });
          }
        }
      );
    }

    try {
      await AudioStreamingModule.startRecording();
    } catch (error) {
      // Clean up event listener on error
      if (this.eventSubscription) {
        this.eventSubscription.remove();
        this.eventSubscription = null;
      }
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    if (!AudioStreamingModule) {
      return;
    }

    await AudioStreamingModule.stopRecording();

    // Remove event listener
    if (this.eventSubscription) {
      this.eventSubscription.remove();
      this.eventSubscription = null;
    }
  }

  async isRecording(): Promise<boolean> {
    if (!AudioStreamingModule) {
      return false;
    }

    return await AudioStreamingModule.isRecording();
  }

  onAudioChunk(callback: (chunk: AudioChunk) => void): () => void {
    this.audioChunkCallback = callback;

    // Set up event listener if not already set
    if (!this.eventSubscription && eventEmitter) {
      this.eventSubscription = eventEmitter.addListener(
        "onAudioChunk",
        (event: { data: string; mimeType: string }) => {
          if (this.audioChunkCallback) {
            this.audioChunkCallback({
              data: event.data,
              mimeType: event.mimeType,
            });
          }
        }
      );
    }

    // Return unsubscribe function
    return () => {
      this.audioChunkCallback = null;
      if (this.eventSubscription) {
        this.eventSubscription.remove();
        this.eventSubscription = null;
      }
    };
  }
}

export default new AudioStreamingModuleImpl();

