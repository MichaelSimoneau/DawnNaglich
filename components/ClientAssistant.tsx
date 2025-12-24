import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  PanResponder,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Linking,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";

const FACILITY_ADDRESS = "31005 Bainbridge Rd, Solon, OH 44139";
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(FACILITY_ADDRESS)}`;

type HeightState = "min" | "mid" | "full";

const ClientAssistant: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth > 768;

  // Mobile Heights - Start larger so text is visible
  const H_MIN = windowHeight * 0.5;
  const H_MID = windowHeight * 0.75;
  const H_FULL = windowHeight - 60;

  // Desktop Dimensions
  const DESKTOP_WIDTH = 400;
  const DESKTOP_HEIGHT = 600;

  const [heightState, setHeightState] = useState<HeightState>("mid");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState<
    { role: "ai" | "user"; text: string }[]
  >([
    {
      role: "ai",
      text: "Welcome to Dawn's Wellness Sanctuary. I can explain Muscle Activation techniques, help you navigate the schedule, or provide directions to our facility. How are you feeling today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const heightAnim = useRef(new Animated.Value(0)).current;
  const chatScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change or loading state changes
    // Use setTimeout to ensure DOM updates complete, especially on web
    const scrollTimer = setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollToEnd({ animated: true });
      }
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [messages, loading]);

  const animateTo = (state: HeightState) => {
    let target = 0;

    if (isDesktop) {
      // On desktop, we just animate to full fixed height when open
      target = DESKTOP_HEIGHT;
    } else {
      target = H_MIN;
      if (state === "mid") target = H_MID;
      if (state === "full") target = H_FULL;

      if (isKeyboardVisible && state !== "full") {
        target = windowHeight * 0.5;
      }
    }

    setHeightState(state);
    Animated.spring(heightAnim, {
      toValue: target,
      useNativeDriver: false,
      friction: 9,
      tension: 35,
    }).start();
  };

  useEffect(() => {
    if (isOpen) {
      // Start at mid height so content is visible
      const initialHeight = isDesktop ? DESKTOP_HEIGHT : H_MID;
      heightAnim.setValue(initialHeight);
      animateTo(heightState);
    } else {
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isOpen, isKeyboardVisible, isDesktop, heightState]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isDesktop, // Disable on desktop
        onMoveShouldSetPanResponder: (_, gs) =>
          !isDesktop && Math.abs(gs.dy) > 10,
        onPanResponderRelease: (_, gs) => {
          if (isDesktop) return;
          if (gs.dy < -50) {
            if (heightState === "min") animateTo("mid");
            else if (heightState === "mid") animateTo("full");
          } else if (gs.dy > 50) {
            if (heightState === "full") animateTo("mid");
            else if (heightState === "mid") animateTo("min");
            else if (heightState === "min") onClose();
          }
        },
      }),
    [heightState, isKeyboardVisible, isDesktop, windowHeight],
  );

  const handleGetDirections = () => {
    Linking.openURL(DIRECTIONS_URL);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    // Scroll to bottom immediately after adding user message
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollToEnd({ animated: true });
      }
    }, 50);

    try {
      // Build conversation history (excluding the current user message we just added)
      const conversationHistory = messages
        .slice(0, -1) // Exclude the user message we just added
        .map((msg) => ({
          role: msg.role,
          text: msg.text,
        }));

      let result: { success: boolean; text: string };
      
      // On web, use the /api/ path for deployed sites to go through Firebase Hosting rewrites
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const origin = window.location.origin;
        const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
        
        // Use direct function URL for localhost, /api/ path for deployed
        const apiUrl = isLocal
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/generateGeminiResponse"
          : `${origin}/api/generateGeminiResponse`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              conversationHistory,
              userMessage: userMsg,
              userRole: 'client',
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        // Handle both direct function response and wrapped response
        result = responseData.result?.data || responseData as { success: boolean; text: string };
      } else {
        // For native, use Firebase SDK
        if (!functions) {
          throw new Error("Functions not initialized");
        }
        
        const generateResponse = httpsCallable(functions, 'generateGeminiResponse');
        const callableResult = await generateResponse({
          conversationHistory,
          userMessage: userMsg,
          userRole: 'client',
        });
        
        result = callableResult.data as { success: boolean; text: string };
      }
      
      if (result.success && result.text) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: result.text,
          },
        ]);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (e) {
      console.error("ClientAssistant API error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            e instanceof Error && e.message.includes("not initialized")
              ? "Service configuration issue. Please contact support."
              : "I'm having trouble connecting right now. Please try again in a moment, or use the booking calendar to schedule directly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Styles for Desktop
  const desktopStyles = isDesktop
    ? {
        right: 32,
        bottom: 32,
        width: DESKTOP_WIDTH,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderRadius: 24,
      }
    : {};

  return (
    <Animated.View
      style={[
        styles.sheet,
        desktopStyles,
        { height: heightAnim },
        !isOpen && ({ pointerEvents: "none" } as { pointerEvents: "none" }),
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          {!isDesktop && <View style={styles.handleBar} />}
        </View>

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Wellness Guide</Text>
            <Text style={styles.headerStatus}>Session Assistant</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleGetDirections}
              style={styles.actionIcon}
            >
              <FontAwesome6 name="location-dot" size={16} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.actionIcon}>
              <FontAwesome6 name="xmark" size={16} color="rgba(209, 250, 229, 0.4)" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={chatScrollRef}
          className="flex-1 p-6 space-y-6 scroll-smooth no-scrollbar"
          contentContainerStyle={{ gap: 24 }}
        >
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.messageRow,
                msg.role === "user" ? styles.userRow : styles.aiRow,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.role === "user" ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === "user" ? styles.userText : styles.aiText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingContainer}>
              <View className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" />
              <View className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <View className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </View>
          )}
        </ScrollView>

        <View
          style={[styles.inputArea, isKeyboardVisible && { paddingBottom: 10 }]}
        >
          <TextInput
            style={styles.input}
            placeholder="Ask about Muscle Activation..."
            placeholderTextColor="#10B98188"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              (!input.trim() || loading) && { opacity: 0.5 },
            ]}
          >
            <FontAwesome6 name="paper-plane" size={18} color="#022C22" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(2, 44, 34, 0.98)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 30,
    zIndex: 2000,
    borderTopWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.1)",
  },
  handleArea: {
    width: "100%",
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.05)",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#FFF" },
  headerStatus: {
    fontSize: 9,
    fontWeight: "800",
    color: "#10B981",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerActions: { flexDirection: "row", gap: 12 },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  messageRow: { marginBottom: 12, flexDirection: "row" },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", padding: 18, borderRadius: 24 },
  userBubble: { backgroundColor: "#064E3B", borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#ECFDF5" },
  aiText: { color: "#D1FAE5" },
  inputArea: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.05)",
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 25,
    paddingHorizontal: 20,
    color: "#FFF",
    fontSize: 15,
  },
  sendBtn: {
    width: 50,
    height: 50,
    backgroundColor: "#10B981",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: 16,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 16,
    width: 80,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
});

export default ClientAssistant;
