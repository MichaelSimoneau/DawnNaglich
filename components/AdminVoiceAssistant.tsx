import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
} from "react-native";
import {
  GoogleGenAI,
  Modality,
  LiveServerMessage,
  Type,
  FunctionDeclaration,
} from "@google/genai";
import { decode, decodeAudioData, createBlob } from "../services/audioUtils";
import { CalendarService } from "../services/calendarService";
import { PendingAction, TranscriptItem } from "../types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const AdminVoiceAssistant: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  // Fluid Transcription State
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentOutput, setCurrentOutput] = useState("");

  const audioContextInputRef = useRef<AudioContext | null>(null);
  const audioContextOutputRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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
      sessionRef.current?.close();
      sourcesRef.current.forEach((s) => {
        try {
          s.stop();
        } catch (e) {}
      });
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom of transcript
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [transcripts, currentInput, currentOutput]);

  // Becky's toolbox
  const getEventsDeclaration: FunctionDeclaration = {
    name: "getCalendarEvents",
    parameters: {
      type: Type.OBJECT,
      description:
        "Fetch current schedule. Essential for context before booking or cancelling.",
      properties: {
        timeMin: { type: Type.STRING },
        timeMax: { type: Type.STRING },
      },
      required: ["timeMin", "timeMax"],
    },
  };

  const createEventDeclaration: FunctionDeclaration = {
    name: "createCalendarEvent",
    parameters: {
      type: Type.OBJECT,
      description:
        "Pre-schedule a session. This triggers a confirmation request to Dawn.",
      properties: {
        clientName: { type: Type.STRING },
        service: { type: Type.STRING },
        startTime: { type: Type.STRING },
        endTime: { type: Type.STRING },
        summary: {
          type: Type.STRING,
          description: "A brief summary of what you are doing.",
        },
      },
      required: ["clientName", "service", "startTime", "endTime", "summary"],
    },
  };

  const cancelEventDeclaration: FunctionDeclaration = {
    name: "cancelCalendarEvent",
    parameters: {
      type: Type.OBJECT,
      description:
        "Remove a session. This triggers a confirmation request to Dawn.",
      properties: {
        eventId: { type: Type.STRING },
        summary: {
          type: Type.STRING,
          description: "Briefly state which event is being removed.",
        },
      },
      required: ["eventId", "summary"],
    },
  };

  const confirmActionDeclaration: FunctionDeclaration = {
    name: "confirmPendingAction",
    parameters: {
      type: Type.OBJECT,
      description:
        'Call this ONLY when Dawn explicitly confirms the previous request (e.g. says "Yes", "Do it", "Confirm").',
      properties: {},
      required: [],
    },
  };

  const startAssistant = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextInputRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 16000 });
      audioContextOutputRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source =
              audioContextInputRef.current!.createMediaStreamSource(stream);
            const scriptProcessor =
              audioContextInputRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              sessionPromise.then((s) =>
                s.sendRealtimeInput({ media: createBlob(inputData) }),
              );
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInputRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Interruption handling
            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                try {
                  source.stop();
                } catch (e) {}
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }

            // Function Calling
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                let toolResult = "Processing...";
                // Fix: Cast fc.args to any to resolve unknown type issues
                const args = (fc.args || {}) as any;
                if (fc.name === "getCalendarEvents") {
                  const items = await CalendarService.getEventsSecureV2(
                    args.timeMin,
                    args.timeMax,
                  );
                  toolResult = items.length
                    ? items
                        .map(
                          (e) =>
                            `${e.summary} at ${new Date(e.start.dateTime).toLocaleTimeString()}`,
                        )
                        .join(", ")
                    : "Schedule is clear.";
                } else if (fc.name === "createCalendarEvent") {
                  setPendingAction({
                    type: "create",
                    data: args,
                    summary: args.summary,
                  });
                  toolResult = "Queued for confirmation.";
                } else if (fc.name === "cancelCalendarEvent") {
                  setPendingAction({
                    type: "cancel",
                    data: { eventId: args.eventId },
                    summary: args.summary,
                  });
                  toolResult = "Cancellation queued.";
                } else if (fc.name === "confirmPendingAction") {
                  if (pendingAction) {
                    if (pendingAction.type === "create")
                      await CalendarService.createEventSecure(
                        pendingAction.data,
                      );
                    else if (pendingAction.type === "cancel")
                      await CalendarService.cancelEventSecure(
                        pendingAction.data.eventId,
                      );
                    toolResult = "Executed.";
                    setPendingAction(null);
                  } else {
                    toolResult = "No active queue.";
                  }
                }
                sessionPromise.then((s) =>
                  s.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: toolResult },
                    },
                  }),
                );
              }
            }

            // Transcription Stream
            if (message.serverContent?.outputTranscription) {
              setCurrentOutput(
                (prev) =>
                  prev + message.serverContent!.outputTranscription!.text,
              );
            } else if (message.serverContent?.inputTranscription) {
              setCurrentInput(
                (prev) =>
                  prev + message.serverContent!.inputTranscription!.text,
              );
            }

            if (message.serverContent?.turnComplete) {
              setTranscripts((prev) => [
                ...prev,
                ...(currentInput
                  ? [
                      {
                        id: Date.now() + "-in",
                        role: "user",
                        text: currentInput,
                        isComplete: true,
                      } as TranscriptItem,
                    ]
                  : []),
                ...(currentOutput
                  ? [
                      {
                        id: Date.now() + "-out",
                        role: "model",
                        text: currentOutput,
                        isComplete: true,
                      } as TranscriptItem,
                    ]
                  : []),
              ]);
              setCurrentInput("");
              setCurrentOutput("");
            }

            // Audio Playback
            const audioData =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextOutputRef.current) {
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
            }
          },
          onerror: () => setIsConnecting(false),
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          tools: [
            {
              functionDeclarations: [
                getEventsDeclaration,
                createEventDeclaration,
                cancelEventDeclaration,
                confirmActionDeclaration,
              ],
            },
          ],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: `You are 'Becky', the elite, intuitive digital concierge for Dawn Naglich Wellness. 
          Current Time: ${new Date().toLocaleString()}.
          
          BECKY'S PROTOCOL:
          - You are the gatekeeper of Dawn's schedule. Dawn focuses on Muscle Activation and healing; you handle the logistics.
          - Your primary tool is the calendar. Always check availability before suggesting times.
          - You are warm, professional, and highly efficient. Use short, punchy sentences.
          - PROTOCOL FOR CHANGES: When Dawn asks to book or cancel, you must confirm the details verbally ("Okay, booking Michael for Muscle Activation at 10 AM, shall I confirm?").
          - EXECUTION: Only call 'confirmPendingAction' when Dawn gives explicit verbal confirmation.
          - PRIVACY: You only share schedule details with Dawn or Michael.
          - If the system is busy or has an error, politely inform Dawn and suggest checking the manual dashboard.`,
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      setIsConnecting(false);
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
            <Text className="fa-solid fa-chevron-down text-white/40" />
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
              <Text style={styles.bannerPrompt}>Say "Yes" to confirm</Text>
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
