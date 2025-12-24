import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { auth } from "../firebaseConfig";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { User } from "../types";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

// Complete auth session for expo-auth-session
if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

interface LoginProps {
  onLoginComplete?: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginComplete }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Configure Google OAuth for native platforms
  // iOS requires using REVERSED_CLIENT_ID from GoogleServices-Info.plist
  const redirectUri =
    Platform.OS !== "web"
      ? Platform.OS === "ios"
        ? makeRedirectUri({
            scheme: "com.googleusercontent.apps.333181114084-jlhi5ji8j3mc20mecaf0lo7u5urse2ip",
          })
        : makeRedirectUri({
            scheme: "dawn-naglich",
            path: "auth",
          })
      : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    redirectUri,
  });

  // Handle native OAuth response
  React.useEffect(() => {
    if (response?.type === "success" && Platform.OS !== "web" && auth) {
      const { id_token, access_token } = response.params;
      if (id_token) {
        const credential = GoogleAuthProvider.credential(
          id_token,
          access_token,
        );
        signInWithCredential(auth, credential)
          .then(() => {
            // Success - auth state change will trigger onLoginComplete
          })
          .catch((error) => {
            console.error("Firebase credential sign-in error:", error);
            alert("Authentication failed. Please try again.");
            setLoading(false);
          });
      }
    }
  }, [response]);

  // Track initial auth state to only call onLoginComplete on sign-in transition
  const [wasUnauthenticated, setWasUnauthenticated] = useState(true);

  // Check initial auth state
  useEffect(() => {
    if (auth) {
      setWasUnauthenticated(!auth.currentUser);
    }
  }, []);

  // Listen for auth state changes to call onLoginComplete when user signs in
  useEffect(() => {
    if (!auth || !onLoginComplete) return;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Only call onLoginComplete if user was previously unauthenticated and now is authenticated
      if (firebaseUser && wasUnauthenticated && onLoginComplete) {
        // User successfully signed in (transition from unauthenticated to authenticated)
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "Guest",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          role: "client" as any, // Will be determined by UserContext
        };
        // Update state to prevent multiple calls
        setWasUnauthenticated(false);
        setLoading(false);
        // Small delay to ensure state is updated
        setTimeout(() => {
          onLoginComplete(user);
        }, 100);
      } else if (!firebaseUser) {
        // User signed out, reset state
        setWasUnauthenticated(true);
      }
    });

    return () => unsubscribe();
  }, [onLoginComplete, wasUnauthenticated]);

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      if (Platform.OS === "web") {
        // Web: Use Firebase popup
        if (auth) {
          const provider = new GoogleAuthProvider();
          provider.addScope("https://www.googleapis.com/auth/calendar");
          provider.addScope("https://www.googleapis.com/auth/calendar.events");
          await signInWithPopup(auth, provider);
          // onLoginComplete will be called via auth state change listener
        }
      } else {
        // Native: Use expo-auth-session
        if (request) {
          await promptAsync();
          // onLoginComplete will be called via auth state change listener after credential sign-in
        } else {
          alert(
            "OAuth not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID environment variables.",
          );
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      alert("Authentication failed. Please try again.");
      setLoading(false);
    }
    // Don't set loading to false here for successful cases - let auth state change handle it
  };

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (auth) {
        if (isSignUp) {
          await createUserWithEmailAndPassword(auth, email, password);
          // onLoginComplete will be called via auth state change listener
        } else {
          await signInWithEmailAndPassword(auth, email, password);
          // onLoginComplete will be called via auth state change listener
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("An unknown error occurred");
      }
      setLoading(false);
    }
    // Don't set loading to false here - let auth state change handle it
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.brandSection}>
          <Text style={styles.brandName}>Dawn Naglich</Text>
          <Text style={styles.brandTagline}>WELLNESS & MUSCLE ACTIVATION</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isSignUp ? "Create an Account" : "Secure Sign In"}
          </Text>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#064E3B" />
            ) : (
              <>
                <Image
                  source={{
                    uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
                  }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.footerLink}>
                {isSignUp ? " Sign In" : " Create One"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#022C22" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 25 },
  brandSection: { alignItems: "center", marginBottom: 40 },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: "#10B981",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "3deg" }],
    marginBottom: 20,
  },
  logoEmoji: { fontSize: 32 },
  brandName: { fontSize: 36, fontWeight: "700", color: "#ECFDF5" },
  brandTagline: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
    opacity: 0.6,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 40,
    padding: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 25,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 14,
    marginBottom: 25,
  },
  googleIcon: { width: 20, height: 20, marginRight: 12 },
  googleBtnText: { color: "#064E3B", fontWeight: "600", fontSize: 16 },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  dividerText: {
    marginHorizontal: 15,
    color: "#10B981",
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.5,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: "#FFF",
  },
  submitBtn: {
    backgroundColor: "#10B981",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#022C22", fontSize: 18, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  footerText: { color: "#94A3B8", fontSize: 14 },
  footerLink: { color: "#10B981", fontWeight: "700", fontSize: 14 },
});

export default Login;
