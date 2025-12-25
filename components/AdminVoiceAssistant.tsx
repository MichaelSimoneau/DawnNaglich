import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6 } from "@expo/vector-icons";
import { decode, decodeAudioData, encode } from "../services/audioUtils";
import { voiceService } from "../services/voiceService";
import { voiceMessageBus } from "../services/voiceMessageBus";
import { CalendarService } from "../services/calendarService";
import { PendingAction, TranscriptItem } from "../types";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";
import { Audio } from "expo-av";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const AdminVoiceAssistant: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  // Connection and listening state
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  
  // Sync pendingAction state with ref
  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);

  // Fluid Transcription State
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentOutput, setCurrentOutput] = useState("");

  // Audio output
  const audioContextOutputRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nativeSoundRef = useRef<Audio.Sound | null>(null);
  const nativeAudioQueueRef = useRef<Array<{ data: string; timestamp: number }>>([]);
  
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const sessionConfigRef = useRef<Record<string, unknown> | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const messageBusUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Entrance animation
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();

    // Pulse animation for the orb
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    ).start();

    // Initialize voice assistant - START LISTENING IMMEDIATELY
    initializeVoiceAssistant();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom of transcript
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [transcripts, currentInput, currentOutput]);

  const cleanup = async () => {
    // Stop recording
    if (isListening) {
      await voiceService.stopRecording();
    }

    // Unsubscribe from message bus
    if (messageBusUnsubscribeRef.current) {
      messageBusUnsubscribeRef.current();
    }

    // Clear response callback
    voiceMessageBus.setResponseCallback(null);

    // Cleanup audio output
    if (Platform.OS === "web") {
      if (audioContextOutputRef.current?.state !== "closed") {
        audioContextOutputRef.current?.close();
      }
      sourcesRef.current.forEach((s) => {
        try {
          s.stop();
        } catch {
          // Ignore cleanup errors
        }
      });
    } else {
      // Cleanup native audio
      if (nativeSoundRef.current) {
        try {
          await nativeSoundRef.current.unloadAsync();
        } catch {
          // Ignore cleanup errors
        }
        nativeSoundRef.current = null;
      }
      nativeAudioQueueRef.current = [];
    }
    };

  // Handle responses from backend (called by message bus or directly)
  const handleBackendResponse = async (data: {
            success: boolean;
            text?: string;
            functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }>;
            audio?: string;
            turnComplete?: boolean;
  }) => {
          // Handle function calls
          if (data.functionCalls && Array.isArray(data.functionCalls)) {
            for (const fc of data.functionCalls) {
              await handleFunctionCall(fc, sessionConfigRef.current);
            }
          }

          // Handle text response
          if (data.success && data.text) {
            setCurrentOutput((prev) => prev + data.text);
          }

          // Handle audio response
          if (data.audio) {
            await playAudioResponse(data.audio);
          }

          // Handle turn completion
          if (data.turnComplete) {
            // Move current input/output to transcripts
            setTranscripts((prev) => {
              const newTranscripts = [...prev];
              if (currentInput) {
                newTranscripts.push({
                  id: Date.now() + "-in",
                  role: "user",
                  text: currentInput,
                  isComplete: true,
                } as TranscriptItem);
                setCurrentInput("");
              }
              if (currentOutput) {
                newTranscripts.push({
                  id: Date.now() + "-out",
                  role: "model",
                  text: currentOutput,
                  isComplete: true,
                } as TranscriptItem);
                setCurrentOutput("");
              }
              return newTranscripts;
            });
          }
  };

  const initializeVoiceAssistant = async () => {
    try {
      // STEP 1: Start listening IMMEDIATELY (before backend connection)
      setIsListening(true);
      setIsConnecting(true);

      // Show immediate response message
      setCurrentOutput("I am still connecting, one moment, please.");

      // Initialize audio output context for web (for playback)
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const AudioContextClass =
          window.AudioContext ||
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        
        if (AudioContextClass) {
          audioContextOutputRef.current = new AudioContextClass({ sampleRate: 24000 });
        }
      } else {
        // Initialize native audio mode for playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      }

      // Initialize message bus (loads persisted queue if any)
      await voiceMessageBus.initialize();

      // Start recording immediately
      await voiceService.startRecording((audioChunk) => {
        // Queue audio chunk in message bus
        voiceMessageBus.queueCommand(audioChunk).catch((error) => {
          console.error("VoiceAssistant: Error queueing command", error);
        });
      });

      // Subscribe to message bus state changes
      messageBusUnsubscribeRef.current = voiceMessageBus.onStateChange((state) => {
        setQueuedCount(state.queuedCount);
        setIsConnected(state.connectionState === "CONNECTED");
        setIsConnecting(state.connectionState === "CONNECTING");
      });

      // STEP 2: Connect to backend (happens in parallel with listening)
      await connectToBackend();

    } catch (error) {
      console.error("VoiceAssistant: Error initializing", error);
      setIsConnecting(false);
      setCurrentOutput("Error initializing voice assistant. Please try again.");
    }
  };

  const connectToBackend = async () => {
    try {
      setIsConnecting(true);

      let sessionData: { success: boolean; config?: Record<string, unknown> };
      
      // On web, use HTTP fetch
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const origin = window.location.origin;
        const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
        
        const apiUrl = isLocal
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/createGeminiLiveSession"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/createGeminiLiveSession";
        
        const requestBody = {
          data: {},
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
        console.log("AdminVoiceAssistant createGeminiLiveSession response:", JSON.stringify(responseData, null, 2));
        
        // Check for error responses
        if (responseData.error) {
          const errorMsg = responseData.error.message || JSON.stringify(responseData.error);
          throw new Error(`Function error: ${errorMsg}`);
        }
        
        // Parse response
        if (responseData.result?.success !== undefined) {
          sessionData = responseData.result as { success: boolean; config?: Record<string, unknown> };
        } else if (responseData.result?.data) {
          sessionData = responseData.result.data as { success: boolean; config?: Record<string, unknown> };
        } else if (responseData.data) {
          sessionData = responseData.data as { success: boolean; config?: Record<string, unknown> };
        } else if (responseData.success !== undefined) {
          sessionData = responseData as { success: boolean; config?: Record<string, unknown> };
        } else {
          throw new Error(`Unexpected response format: ${JSON.stringify(responseData).substring(0, 200)}`);
        }
      } else {
        // For native, use Firebase SDK
        if (!functions) {
          throw new Error("Functions not initialized");
        }
        
        const createGeminiLiveSession = httpsCallable(functions, "createGeminiLiveSession");
        const sessionResult = await createGeminiLiveSession({});
        sessionData = sessionResult.data as { success: boolean; config?: Record<string, unknown> };
      }

      if (!sessionData.success) {
        throw new Error("Failed to create AI session");
      }

      const sessionConfig = sessionData.config;
      sessionConfigRef.current = sessionConfig;
      await voiceMessageBus.setSessionConfig(sessionConfig || {});

      // STEP 3: Mark as connected - this will trigger queue processing
      voiceMessageBus.setConnected(true, sessionConfig);
      setIsConnecting(false);
      setIsConnected(true);

      // Clear the "connecting" message
      setCurrentOutput("");

      // Set up response handler for message bus
      voiceMessageBus.setResponseCallback(handleBackendResponse);

    } catch (error) {
      console.error("VoiceAssistant: Error connecting to backend", error);
      setIsConnecting(false);
      setCurrentOutput("Error connecting to backend. Commands are queued and will be processed when connection is restored.");
      
      // Retry connection after delay
      setTimeout(() => {
        connectToBackend();
      }, 3000);
    }
  };

  const handleFunctionCall = async (
    fc: { id: string; name: string; args?: Record<string, unknown> },
    sessionConfig: Record<string, unknown> | null,
  ) => {
    let toolResult = "Processing...";
    const args = fc.args || {};

    try {
      if (fc.name === "getCalendarEvents") {
        const items = await CalendarService.getEventsSecureV2();
        toolResult = items.length
          ? items
              .map(
                (e: { summary?: string; start: { dateTime: string } }) =>
                  `${e.summary || "Event"} at ${new Date(e.start.dateTime).toLocaleTimeString()}`,
              )
              .join(", ")
          : "Schedule is clear.";
      } else if (fc.name === "createCalendarEvent") {
        const newPendingAction: PendingAction = {
          type: "create",
          data: args,
          summary: (args.summary as string) || "Create calendar event",
        };
        setPendingAction(newPendingAction);
        pendingActionRef.current = newPendingAction;
        toolResult = "Queued for confirmation.";
      } else if (fc.name === "cancelCalendarEvent") {
        const newPendingAction: PendingAction = {
          type: "cancel",
          data: { eventId: args.eventId as string },
          summary: (args.summary as string) || "Cancel calendar event",
        };
        setPendingAction(newPendingAction);
        pendingActionRef.current = newPendingAction;
        toolResult = "Cancellation queued.";
      } else if (fc.name === "confirmPendingAction") {
        const currentPending = pendingActionRef.current;
        if (currentPending) {
          if (currentPending.type === "create") {
            await CalendarService.createEventSecure(currentPending.data);
          } else if (currentPending.type === "cancel") {
            await CalendarService.cancelEventSecure(currentPending.data.eventId);
          }
          toolResult = "Executed.";
          setPendingAction(null);
          pendingActionRef.current = null;
        } else {
          toolResult = "No active queue.";
        }
      }

      // Send tool response back to the proxy
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const origin = window.location.origin;
        const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
        
        const apiUrl = isLocal
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/proxyGeminiLiveMessage"
          : `${origin}/api/proxyGeminiLiveMessage`;
        
        await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              functionResponse: {
                id: fc.id,
                name: fc.name,
                response: { result: toolResult },
              },
              config: sessionConfig || {},
            },
          }),
        });
      } else {
        // For native, use Firebase SDK
        if (!functions) throw new Error("Functions not initialized");
        const proxyGeminiLiveMessage = httpsCallable(functions, "proxyGeminiLiveMessage");
        await proxyGeminiLiveMessage({
          functionResponse: {
            id: fc.id,
            name: fc.name,
            response: { result: toolResult },
          },
          config: sessionConfig || {},
        });
      }
    } catch (error) {
      console.error("Function call error:", error);
    }
  };

  const playAudioResponse = async (audioData: string) => {
    if (Platform.OS === "web") {
      // Web audio playback using AudioContext
      if (!audioContextOutputRef.current) {
        return;
      }

      try {
        const ctx = audioContextOutputRef.current;
        nextStartTimeRef.current = Math.max(
          nextStartTimeRef.current,
          ctx.currentTime,
        );
        const audioBuffer = await decodeAudioData(
          decode(audioData),
          ctx,
          24000,
          1,
        );
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.addEventListener("ended", () =>
          sourcesRef.current.delete(source),
        );
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        sourcesRef.current.add(source);
      } catch (error) {
        console.error("Audio playback error:", error);
      }
    } else {
      // Native audio playback using expo-av Audio.Sound
      try {
        // Decode base64 audio data
        const audioBytes = decode(audioData);
        
        // Convert to WAV format for native playback
        // Create a simple WAV header for PCM data
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = audioBytes.length;
        const fileSize = 36 + dataSize;

        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        
        // RIFF header
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        
        writeString(0, "RIFF");
        view.setUint32(4, fileSize, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // audio format (PCM)
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, "data");
        view.setUint32(40, dataSize, true);

        // Combine header and audio data
        const wavData = new Uint8Array(wavHeader.byteLength + audioBytes.length);
        wavData.set(new Uint8Array(wavHeader), 0);
        wavData.set(audioBytes, wavHeader.byteLength);

        // Convert to base64 WAV data URI
        // expo-av Audio.Sound supports data URIs on both iOS and Android
        const base64Wav = encode(wavData);
        const dataUri = `data:audio/wav;base64,${base64Wav}`;

        // Create and play sound from data URI
        const { sound } = await Audio.Sound.createAsync(
          { uri: dataUri },
          { shouldPlay: true, volume: 1.0 }
        );

        // Store reference for cleanup
        if (nativeSoundRef.current) {
          await nativeSoundRef.current.unloadAsync();
        }
        nativeSoundRef.current = sound;

        // Clean up when playback finishes
        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) {
            try {
              await sound.unloadAsync();
            } catch (error) {
              // Ignore cleanup errors
              console.warn("Error cleaning up audio:", error);
            }
            if (nativeSoundRef.current === sound) {
              nativeSoundRef.current = null;
            }
          }
        });
      } catch (error) {
        console.error("Native audio playback error:", error);
      }
    }
  };

  const handleClose = () => {
    cleanup();
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: false,
    }).start(() => onClose());
  };

  // Determine status text and indicator
  const getStatusText = () => {
    if (isConnected) return "LIVE";
    if (isConnecting) return "CONNECTING";
    if (isListening) return "LISTENING";
    return "INACTIVE";
  };

  const getStatusDotActive = () => {
    return isConnected || isListening;
  };

  return (
    <Animated.View
      style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
            <FontAwesome6 name="chevron-down" size={14} color="rgba(255, 255, 255, 0.4)" />
            <Text style={styles.backText}>Minimize Assistant</Text>
          </TouchableOpacity>
          <View style={styles.statusIndicator}>
            <View style={[styles.dot, getStatusDotActive() ? styles.dotActive : null]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
            {queuedCount > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{queuedCount}</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.transcriptStream}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
        >
          {transcripts.map((t) => (
            <View key={t.id} style={styles.narrativeItem}>
              <Text
                style={[
                  styles.narrativeText,
                  t.role === "user" ? styles.userText : styles.modelText,
                ]}
              >
                {t.text}
              </Text>
            </View>
          ))}

          {currentInput ? (
            <View style={styles.narrativeItem}>
              <Text
                style={[
                  styles.narrativeText,
                  styles.userText,
                  styles.streamingText,
                ]}
              >
                {currentInput}
              </Text>
            </View>
          ) : null}

          {currentOutput ? (
            <View style={styles.narrativeItem}>
              <Text
                style={[
                  styles.narrativeText,
                  styles.modelText,
                  styles.streamingText,
                ]}
              >
                {currentOutput}
              </Text>
            </View>
          ) : null}

          {!currentInput && !currentOutput && transcripts.length === 0 && (
            <Text style={styles.placeholderText}>
              {isConnecting && !isConnected
                ? "I am still connecting, one moment, please."
                : "Start speaking to Becky..."}
            </Text>
          )}
        </ScrollView>

        <View style={styles.bottomSection}>
          {pendingAction && (
            <Animated.View style={styles.confirmBanner}>
              <View style={styles.bannerInfo}>
                <Text style={styles.bannerLabel}>PENDING UPDATE</Text>
                <Text style={styles.bannerSummary}>
                  {pendingAction.summary}
                </Text>
              </View>
              <Text style={styles.bannerPrompt}>Say &quot;Yes&quot; to confirm</Text>
            </Animated.View>
          )}

          <View style={styles.visualizerContainer}>
            <Animated.View
              style={[
                styles.orbContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.orbGlow} />
              <View style={styles.orbCore} />
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
    zIndex: 1000,
  },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 40,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 12 },
  backText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#475569" },
  dotActive: { backgroundColor: "#14B8A6" },
  statusText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  queueBadge: {
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  queueBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
  },

  transcriptStream: { flex: 1, paddingHorizontal: 40 },
  transcriptContent: { paddingVertical: 40 },
  narrativeItem: { marginBottom: 32 },
  narrativeText: {
    fontSize: 28,
    lineHeight: 42,
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  userText: { color: "#94A3B8" },
  modelText: { color: "#F8FAFC" },
  streamingText: { opacity: 0.7 },
  placeholderText: {
    color: "#334155",
    fontSize: 24,
    fontWeight: "300",
    textAlign: "center",
    marginTop: "20%",
  },

  bottomSection: { paddingBottom: 60, paddingHorizontal: 24 },
  confirmBanner: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 24,
    borderRadius: 32,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    marginBottom: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerInfo: { flex: 1 },
  bannerLabel: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 4,
  },
  bannerSummary: { color: "#FDE68A", fontSize: 15, fontWeight: "500" },
  bannerPrompt: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.6,
  },

  visualizerContainer: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  orbContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  orbGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
  },
  orbCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#14B8A6",
  },
});

export default AdminVoiceAssistant;
