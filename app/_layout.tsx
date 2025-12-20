import '../global.css';
import React, { useState } from 'react';
import { View, StatusBar, TouchableOpacity, Text, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { UserRole } from '../types';
import { UserProvider, useUser } from '../UserContext';

import AdminDashboard from '../components/AdminDashboard';
import ClientAssistant from '../components/ClientAssistant';
import SnowOverlay from '../components/SnowOverlay';
import Logo from '../components/Logo';

function RootLayoutContent() {
  const { user, initializing } = useUser();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSnowing, setIsSnowing] = useState(false);

  const handleLogout = () => { if (auth) signOut(auth); };

  if (initializing) return (
    <View className="flex-1 bg-emerald-950 justify-center items-center">
      <ActivityIndicator size="large" color="#10B981" />
      <Text className="mt-5 text-[12px] text-emerald-400 font-black tracking-[8px]">DAWN NAGLICH</Text>
    </View>
  );

  if (user?.role === UserRole.ADMIN) return <AdminDashboard />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-emerald-950">
        <StatusBar barStyle="light-content" />
        {isSnowing && <SnowOverlay />}
        
        {/* Shared Navigation - Minimal for all pages, can be extended in pages */}
        <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 pt-8 pb-5 backdrop-blur-3xl bg-emerald-950/80 border-b border-emerald-500/20 safe-top">
          <div className="flex items-center gap-4 lg:gap-8">
            <Logo color="#10B981" size={Platform.OS === 'web' ? 42 : 36} />
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            {user && (
              <TouchableOpacity onPress={handleLogout} className="p-2 opacity-50">
                <i className="fa-solid fa-power-off text-emerald-400"></i>
              </TouchableOpacity>
            )}
          </div>
        </nav>

        <Stack screenOptions={{ headerShown: false }} />

        {/* FABs */}
        {!isAssistantOpen && (
          <View className="absolute bottom-10 right-8 gap-4 z-[1001]">
            <TouchableOpacity 
              onPress={() => setIsSnowing(!isSnowing)} 
              className={`w-12 h-12 rounded-full items-center justify-center border ${isSnowing ? 'bg-emerald-400 border-white' : 'bg-emerald-950/90 border-emerald-400/40'}`}
            >
              <i className={`fa-solid fa-snowflake ${isSnowing ? 'text-white' : 'text-emerald-400'} text-lg`}></i>
            </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsAssistantOpen(true)} 
            className="w-[60px] h-[60px] rounded-full bg-emerald-600 items-center justify-center"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-white text-xl"></i>
          </TouchableOpacity>
          </View>
        )}

        <ClientAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
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

