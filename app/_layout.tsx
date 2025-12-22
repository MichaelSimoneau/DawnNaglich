import "../global.css";
import "react-native-reanimated";
import React, { useState, useEffect } from "react";
import {
  View,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FontAwesome6 } from "@expo/vector-icons";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { UserRole } from "../types";
import { UserProvider, useUser } from "../UserContext";

import AdminDashboard from "../components/AdminDashboard";
import ClientAssistant from "../components/ClientAssistant";
import Login from "../components/Login";

// Lazy load SnowOverlay to avoid Three.js import issues
const SnowOverlay = React.lazy(() => import("../components/SnowOverlay"));

// Check if we're before December 26, 2025
const isBeforeSnowEndDate = () => {
  const snowEndDate = new Date("2025-12-26T23:59:59");
  const now = new Date();
  return now < snowEndDate;
};

function RootLayoutContent() {
  const { user, initializing } = useUser();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSnowing, setIsSnowing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Initialize snow state based on date
  useEffect(() => {
    setIsSnowing(isBeforeSnowEndDate());
  }, []);

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  const handleSnowToggle = () => {
    setIsSnowing(!isSnowing);
  };

  const handleAssistantToggle = () => {
    setIsAssistantOpen(true);
  };

  if (initializing)
    return (
      <View className="flex-1 bg-emerald-950 justify-center items-center">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="mt-5 text-[12px] text-emerald-400 font-black tracking-[8px]">
          DAWN NAGLICH
        </Text>
      </View>
    );

  if (user?.role === UserRole.ADMIN) return <AdminDashboard />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-emerald-950">
        <StatusBar barStyle="light-content" />
        {isSnowing && (
          <React.Suspense fallback={null}>
            <SnowOverlay />
          </React.Suspense>
        )}

        <Stack screenOptions={{ headerShown: false }} />

        {/* FABs */}
        {!isAssistantOpen && (
          <View className="absolute bottom-10 right-8 gap-4 z-[1001] items-center">
            <Pressable
              onPress={handleSnowToggle}
              className={`w-12 h-12 rounded-full items-center justify-center border ${isSnowing ? "bg-emerald-400 border-white" : "bg-emerald-950/90 border-emerald-400/40"}`}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
              {...(Platform.OS === "web"
                ? {
                    // @ts-ignore - prevent default button behavior on web
                    onClick: (e: any) => {
                      if (e && e.preventDefault) {
                        e.preventDefault();
                      }
                      if (e && e.stopPropagation) {
                        e.stopPropagation();
                      }
                    },
                  }
                : {})}
            >
              <FontAwesome6
                name="snowflake"
                size={18}
                color={isSnowing ? "#FFFFFF" : "#10B981"}
              />
            </Pressable>
            <TouchableOpacity
              onPress={handleAssistantToggle}
              activeOpacity={0.7}
              className="w-[60px] h-[60px] rounded-full bg-emerald-600 items-center justify-center"
            >
              <FontAwesome6 name="wand-magic-sparkles" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <ClientAssistant
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />

        {/* Login Modal */}
        {showLogin && (
          <View className="absolute inset-0 z-[2000] bg-emerald-950">
            <TouchableOpacity
              className="absolute top-[30px] left-[30px] z-[2001] flex-row items-center p-3 bg-white/5 rounded-[20px]"
              onPress={() => setShowLogin(false)}
            >
              <FontAwesome6 name="arrow-left" size={14} color="#D1FAE5" />
              <Text className="text-white font-black text-[10px] uppercase tracking-[2px] ml-3">
                Close
              </Text>
            </TouchableOpacity>
            <Login onLoginComplete={() => setShowLogin(false)} />
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <RootLayoutContent />
    </UserProvider>
  );
}
