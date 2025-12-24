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
import { decode, decodeAudioData, createBlob } from "../services/audioUtils";
import { CalendarService } from "../services/calendarService";
import { PendingAction, TranscriptItem } from "../types";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const AdminVoiceAssistant: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [, setIsConnecting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  
  // Sync pendingAction state with ref
  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);

  // Fluid Transcription State
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentOutput, setCurrentOutput] = useState("");

  const audioContextInputRef = useRef<AudioContext | null>(null);
  const audioContextOutputRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const sessionConfigRef = useRef<Record<string, unknown> | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);

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

    startAssistant();

    return () => {
      if (audioContextInputRef.current?.state !== "closed") {
        audioContextInputRef.current?.close();
      }
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
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom of transcript
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [transcripts, currentInput, currentOutput]);

  const startAssistant = async () => {
    setIsConnecting(true);
    try {
      let sessionData: { success: boolean; config?: Record<string, unknown> };
      
      // On web, use the /api/ path for deployed sites to go through Firebase Hosting rewrites
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const origin = window.location.origin;
        const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
        
        // Use direct function URL for localhost, direct Cloud Functions URL for deployed
        // Firebase Hosting rewrites don't work reliably with callable functions via HTTP
        const apiUrl = isLocal
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/createGeminiLiveSession"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/createGeminiLiveSession";
        
        const requestBody = {
          data: {},
        };
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("HTTP error response:", errorText);
          console.error("Request URL:", apiUrl);
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 200)}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error("Non-JSON response:", text.substring(0, 500));
          throw new Error(`Expected JSON but got ${contentType}`);
        }

        const responseData = await response.json();
        console.log("AdminVoiceAssistant createGeminiLiveSession response:", JSON.stringify(responseData, null, 2));
        
        // Check for error responses first (Firebase callable functions return errors in { error: {...} } format)
        if (responseData.error) {
          const errorMsg = responseData.error.message || JSON.stringify(responseData.error);
          console.error("Function returned error:", errorMsg);
          throw new Error(`Function error: ${errorMsg}`);
        }
        
        // Firebase callable functions via HTTP return: { result: { success, config } } or { result: { data: {...} } }
        if (responseData.result?.success !== undefined) {
          // Direct result format: { result: { success, config } }
          sessionData = responseData.result as { success: boolean; config?: Record<string, unknown> };
        } else if (responseData.result?.data) {
          // Wrapped data format: { result: { data: { success, config } } }
          sessionData = responseData.result.data as { success: boolean; config?: Record<string, unknown> };
        } else if (responseData.data) {
          sessionData = responseData.data as { success: boolean; config?: Record<string, unknown> };
        } else if (responseData.success !== undefined) {
          sessionData = responseData as { success: boolean; config?: Record<string, unknown> };
        } else {
          console.error("Unexpected response format:", responseData);
          throw new Error(`Unexpected response format from server: ${JSON.stringify(responseData).substring(0, 200)}`);
        }
      } else {
        // For native, use Firebase SDK
        if (!functions) {
          throw new Error("Functions not initialized");
        }
        
        const createGeminiLiveSession = httpsCallable(functions, 'createGeminiLiveSession');
        const sessionResult = await createGeminiLiveSession({});
        sessionData = sessionResult.data as { success: boolean; config?: Record<string, unknown> };
      }

      if (!sessionData.success) {
        throw new Error("Failed to create AI session");
      }

      const sessionConfig = sessionData.config;
      sessionConfigRef.current = sessionConfig;
      
      // In a full implementation, we would connect to a WebSocket proxy here.
      // For Phase 1, we adapt the UI to show we're connected and ready.
      setIsActive(true);
      setIsConnecting(false);

      audioContextInputRef.current = new (
        window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      )({ sampleRate: 16000 });
      audioContextOutputRef.current = new (
        window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      )({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const source = audioContextInputRef.current!.createMediaStreamSource(stream);
      const scriptProcessor = audioContextInputRef.current!.createScriptProcessor(4096, 1, 1);
      
      let audioBufferQueue: Float32Array[] = [];
      let isProcessing = false;

      scriptProcessor.onaudioprocess = async (event) => {
        if (isProcessing) return; // Prevent overlapping requests
        isProcessing = true;

        const inputData = event.inputBuffer.getChannelData(0);
        const mediaData = createBlob(inputData);

        // Queue audio for batching (send every few chunks to reduce HTTP overhead)
        audioBufferQueue.push(inputData);
        if (audioBufferQueue.length < 3) {
          isProcessing = false;
          return;
        }

      audioBufferQueue = [];

        // Proxy audio chunk to backend
        try {
          let data: {
            success: boolean;
            text?: string;
            functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }>;
            audio?: string;
            turnComplete?: boolean;
          };
          
          // On web, use the /api/ path for deployed sites to go through Firebase Hosting rewrites
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const origin = window.location.origin;
            const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
            
            // Use direct function URL for localhost, direct Cloud Functions URL for deployed
            // Firebase Hosting rewrites don't work reliably with callable functions via HTTP
            const apiUrl = isLocal
              ? "http://127.0.0.1:5001/dawn-naglich/us-central1/proxyGeminiLiveMessage"
              : "https://us-central1-dawn-naglich.cloudfunctions.net/proxyGeminiLiveMessage";
            
            const requestBody = {
              data: {
                media: mediaData,
                config: sessionConfig,
              },
            };
            
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error("HTTP error response:", errorText);
              console.error("Request URL:", apiUrl);
              throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 200)}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              const text = await response.text();
              console.error("Non-JSON response:", text.substring(0, 500));
              throw new Error(`Expected JSON but got ${contentType}`);
            }

            const responseData = await response.json();
            console.log("AI Proxy Response:", JSON.stringify(responseData, null, 2));
            
            // Check for error responses first (Firebase callable functions return errors in { error: {...} } format)
            if (responseData.error) {
              const errorMsg = responseData.error.message || JSON.stringify(responseData.error);
              console.error("Function returned error:", errorMsg);
              throw new Error(`Function error: ${errorMsg}`);
            }
            
            // Firebase callable functions via HTTP return: { result: { success, ... } } or { result: { data: {...} } }
            let proxyResult;
            if (responseData.result?.success !== undefined) {
              // Direct result format: { result: { success, ... } }
              proxyResult = responseData.result;
            } else if (responseData.result?.data) {
              // Wrapped data format: { result: { data: {...} } }
              proxyResult = responseData.result.data;
            } else if (responseData.data) {
              proxyResult = responseData.data;
            } else if (responseData.success !== undefined) {
              proxyResult = responseData;
            } else {
              console.error("Unexpected response format:", responseData);
              throw new Error(`Unexpected response format from server: ${JSON.stringify(responseData).substring(0, 200)}`);
            }
            
            data = proxyResult as typeof data;
          } else {
            // For native, use Firebase SDK
            if (!functions) {
              throw new Error("Functions not initialized");
            }
            
            const proxyGeminiLiveMessage = httpsCallable(functions, 'proxyGeminiLiveMessage');
            const proxyResult = await proxyGeminiLiveMessage({
              media: mediaData,
              config: sessionConfig,
            });

            console.log("AI Proxy Response:", proxyResult.data); // Validation Log
            data = proxyResult.data as typeof data;
          }
          
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
        } catch (e) {
          console.error("Proxy error:", e);
        } finally {
          isProcessing = false;
        }
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContextInputRef.current!.destination);

    } catch (e) {
      console.error(e);
      setIsConnecting(false);
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
                  `${e.summary || 'Event'} at ${new Date(e.start.dateTime).toLocaleTimeString()}`,
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
      // On web, use the /api/ path for deployed sites to go through Firebase Hosting rewrites
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const origin = window.location.origin;
        const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
        
        // Use direct function URL for localhost, /api/ path for deployed
        const apiUrl = isLocal
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/proxyGeminiLiveMessage"
          : `${origin}/api/proxyGeminiLiveMessage`;
        
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        const proxyGeminiLiveMessage = httpsCallable(functions, 'proxyGeminiLiveMessage');
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
    if (!audioContextOutputRef.current) return;

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
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: false,
    }).start(() => onClose());
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
            <View style={[styles.dot, isActive ? styles.dotActive : null]} />
            <Text style={styles.statusText}>
              {isActive ? "LIVE" : "CONNECTING"}
            </Text>
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
              Start speaking to Becky...
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
