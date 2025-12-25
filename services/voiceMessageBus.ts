import { Platform } from "react-native";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QueuedCommand {
  id: string;
  audioChunk: { data: string; mimeType: string };
  timestamp: number;
  retryCount: number;
}

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export type StateChangeCallback = (state: {
  connectionState: ConnectionState;
  queuedCount: number;
  isProcessing: boolean;
}) => void;

export type ResponseCallback = (response: {
  success: boolean;
  text?: string;
  functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }>;
  audio?: string;
  turnComplete?: boolean;
}) => void;

const QUEUE_STORAGE_KEY = "@voice_message_bus:queue";
const SESSION_CONFIG_STORAGE_KEY = "@voice_message_bus:session_config";

class VoiceMessageBus {
  private queue: QueuedCommand[] = [];
  private connectionState: ConnectionState = "DISCONNECTED";
  private isProcessing = false;
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();
  private responseCallback: ResponseCallback | null = null;
  private sessionConfig: Record<string, unknown> | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize and load persisted queue from storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load persisted queue
      const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (storedQueue) {
        const parsedQueue = JSON.parse(storedQueue) as QueuedCommand[];
        // Filter out old commands (older than 1 hour)
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.queue = parsedQueue.filter((cmd) => cmd.timestamp > oneHourAgo);
        
        // Persist cleaned queue
        if (this.queue.length !== parsedQueue.length) {
          await this.persistQueue();
        }
      }

      // Load persisted session config
      const storedConfig = await AsyncStorage.getItem(SESSION_CONFIG_STORAGE_KEY);
      if (storedConfig) {
        this.sessionConfig = JSON.parse(storedConfig);
      }

      this.isInitialized = true;
      this.notifyStateChange();
    } catch (error) {
      console.error("VoiceMessageBus: Error initializing", error);
      this.isInitialized = true; // Continue even if persistence fails
    }
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      // Limit queue size for storage (keep last 100 commands)
      const queueToStore = this.queue.slice(-100);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueToStore));
    } catch (error) {
      console.error("VoiceMessageBus: Error persisting queue", error);
    }
  }

  /**
   * Persist session config to storage
   */
  private async persistSessionConfig(): Promise<void> {
    try {
      if (this.sessionConfig) {
        await AsyncStorage.setItem(SESSION_CONFIG_STORAGE_KEY, JSON.stringify(this.sessionConfig));
      } else {
        await AsyncStorage.removeItem(SESSION_CONFIG_STORAGE_KEY);
      }
    } catch (error) {
      console.error("VoiceMessageBus: Error persisting session config", error);
    }
  }

  /**
   * Queue an audio chunk command
   */
  async queueCommand(audioChunk: { data: string; mimeType: string }): Promise<string> {
    await this.initialize();

    const command: QueuedCommand = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      audioChunk,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(command);
    await this.persistQueue();
    this.notifyStateChange();
    return command.id;
  }

  /**
   * Set connection state
   */
  setConnected(connected: boolean, sessionConfig?: Record<string, unknown>): void {
    const previousState = this.connectionState;
    
    if (connected) {
      this.connectionState = "CONNECTED";
      if (sessionConfig) {
        this.sessionConfig = sessionConfig;
        // Persist session config asynchronously (fire and forget)
        this.persistSessionConfig().catch((error) => {
          console.error("VoiceMessageBus: Error persisting session config", error);
        });
      }
      
      // Start processing queue if we just connected
      if (previousState !== "CONNECTED") {
        this.startProcessingQueue();
      }
    } else {
      this.connectionState = connected === false ? "DISCONNECTED" : "CONNECTING";
      this.stopProcessingQueue();
    }

    this.notifyStateChange();
  }

  /**
   * Set connection state explicitly
   */
  setConnectionState(state: ConnectionState, sessionConfig?: Record<string, unknown>): void {
    this.connectionState = state;
    if (sessionConfig) {
      this.sessionConfig = sessionConfig;
      this.persistSessionConfig().catch((error) => {
        console.error("VoiceMessageBus: Error persisting session config", error);
      });
    }

    if (state === "CONNECTED") {
      this.startProcessingQueue();
    } else {
      this.stopProcessingQueue();
    }

    this.notifyStateChange();
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get all queued commands
   */
  getQueue(): QueuedCommand[] {
    return [...this.queue];
  }

  /**
   * Clear the queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (error) {
      console.error("VoiceMessageBus: Error clearing persisted queue", error);
    }
    this.notifyStateChange();
  }

  /**
   * Process the queue (send commands to backend)
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.connectionState !== "CONNECTED" || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyStateChange();

    try {
      // Process commands in batches (send every 3 chunks to reduce HTTP overhead)
      const batchSize = 3;
      const batch = this.queue.splice(0, batchSize);

      if (batch.length === 0) {
        return;
      }

      // Combine audio chunks if multiple in batch
      let combinedChunk: { data: string; mimeType: string };
      
      if (batch.length === 1) {
        combinedChunk = batch[0].audioChunk;
      } else {
        // For multiple chunks, we'll send them sequentially for now
        // In a WebSocket implementation, we could send them all at once
        combinedChunk = batch[0].audioChunk;
      }

      // Send to backend and get response
      const response = await this.sendToBackend(combinedChunk);

      // Call response callback if set
      if (this.responseCallback && response) {
        this.responseCallback(response);
      }

      // Remove processed commands from queue
      // (already removed via splice above)
      
      // Persist updated queue
      await this.persistQueue();

      // If there are more commands, continue processing
      if (this.queue.length > 0 && this.connectionState === "CONNECTED") {
        // Process next batch after a short delay
        setTimeout(() => {
          this.processQueue();
        }, 100);
      }
    } catch (error) {
      console.error("VoiceMessageBus: Error processing queue", error);
      
      // Retry failed commands (up to 3 times)
      const failedCommands = this.queue.filter((cmd) => cmd.retryCount < 3);
      failedCommands.forEach((cmd) => {
        cmd.retryCount++;
      });

      // Set error state temporarily
      this.connectionState = "ERROR";
      this.notifyStateChange();

      // Retry connection after delay
      setTimeout(() => {
        if (this.connectionState === "ERROR") {
          this.connectionState = "CONNECTED";
          this.notifyStateChange();
          this.processQueue();
        }
      }, 2000);
    } finally {
      this.isProcessing = false;
      this.notifyStateChange();
    }
  }

  /**
   * Send audio chunk to backend
   */
  private async sendToBackend(
    audioChunk: { data: string; mimeType: string }
  ): Promise<{
    success: boolean;
    text?: string;
    functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }>;
    audio?: string;
    turnComplete?: boolean;
  }> {
    if (!this.sessionConfig) {
      throw new Error("Session config not set");
    }

    // On web, use HTTP fetch
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const origin = window.location.origin;
      const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");

      const apiUrl = isLocal
        ? "http://127.0.0.1:5001/dawn-naglich/us-central1/proxyGeminiLiveMessage"
        : "https://us-central1-dawn-naglich.cloudfunctions.net/proxyGeminiLiveMessage";

      const requestBody = {
        data: {
          media: audioChunk,
          config: this.sessionConfig,
        },
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 200)}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      const responseData = await response.json();
      console.log("VoiceMessageBus: Backend response", responseData);

      // Check for error responses
      if (responseData.error) {
        const errorMsg = responseData.error.message || JSON.stringify(responseData.error);
        throw new Error(`Function error: ${errorMsg}`);
      }

      // Parse response
      let proxyResult;
      if (responseData.result?.success !== undefined) {
        proxyResult = responseData.result;
      } else if (responseData.result?.data) {
        proxyResult = responseData.result.data;
      } else if (responseData.data) {
        proxyResult = responseData.data;
      } else if (responseData.success !== undefined) {
        proxyResult = responseData;
      } else {
        throw new Error(`Unexpected response format: ${JSON.stringify(responseData).substring(0, 200)}`);
      }

      return proxyResult as {
        success: boolean;
        text?: string;
        functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }>;
        audio?: string;
        turnComplete?: boolean;
      };
    } else {
      // For native, use Firebase SDK
      if (!functions) {
        throw new Error("Functions not initialized");
      }

      const proxyGeminiLiveMessage = httpsCallable(functions, "proxyGeminiLiveMessage");
      const proxyResult = await proxyGeminiLiveMessage({
        media: audioChunk,
        config: this.sessionConfig,
      });

      return proxyResult.data as {
        success: boolean;
        text?: string;
        functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }>;
        audio?: string;
        turnComplete?: boolean;
      };
    }
  }

  /**
   * Start processing queue automatically
   */
  private startProcessingQueue(): void {
    if (this.processingInterval) {
      return;
    }

    // Process queue periodically
    this.processingInterval = setInterval(() => {
      if (this.connectionState === "CONNECTED" && this.queue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, 500); // Check every 500ms

    // Also process immediately
    this.processQueue();
  }

  /**
   * Stop processing queue
   */
  private stopProcessingQueue(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);

    // Immediately call with current state
    callback({
      connectionState: this.connectionState,
      queuedCount: this.queue.length,
      isProcessing: this.isProcessing,
    });

    // Return unsubscribe function
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of state change
   */
  private notifyStateChange(): void {
    const state = {
      connectionState: this.connectionState,
      queuedCount: this.queue.length,
      isProcessing: this.isProcessing,
    };

    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error("VoiceMessageBus: Error in state change callback", error);
      }
    });
  }

  /**
   * Get session config
   */
  getSessionConfig(): Record<string, unknown> | null {
    return this.sessionConfig;
  }

  /**
   * Set session config
   */
  async setSessionConfig(config: Record<string, unknown>): Promise<void> {
    this.sessionConfig = config;
    await this.persistSessionConfig();
  }

  /**
   * Set response callback to handle backend responses
   */
  setResponseCallback(callback: ResponseCallback | null): void {
    this.responseCallback = callback;
  }
}

// Export singleton instance
export const voiceMessageBus = new VoiceMessageBus();

