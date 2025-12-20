import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Head from 'expo-router/head';
import { useUser } from '../UserContext';

import Login from '../components/Login';
import ClientLanding from '../components/ClientLanding';
import { PAGES } from '../content';
import Booking from '../components/Booking';
import Footer from '../components/Footer';

export default function Home() {
  const { user } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [activeLandingPage, setActiveLandingPage] = useState(0);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [agendaOffset, setAgendaOffset] = useState(Dimensions.get('window').height);
  
  const verticalScrollRef = useRef<ScrollView>(null);
  const lastScrollY = useRef(0);
  const { height: windowHeight } = Dimensions.get('window');

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = Math.abs(currentY - lastScrollY.current);
    lastScrollY.current = currentY;
    if (activeSlotId && diff > 50) {
      setActiveSlotId(null);
    }
  };

  useEffect(() => {
    const currentPage = PAGES[activeLandingPage];
    const pageTitle = `Dawn Naglich | ${currentPage.label}`;
    try {
      const targetHash = `#${currentPage.id}`;
      if (typeof window !== 'undefined' && window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } catch (e) {}
    if (typeof document !== 'undefined') {
      document.title = pageTitle;
    }
  }, [activeLandingPage]);

  const scrollToAgenda = () => {
    verticalScrollRef.current?.scrollTo({ y: agendaOffset, animated: true });
  };

  if (showLogin) return (
    <View className="flex-1 bg-emerald-950">
      <TouchableOpacity 
        className="absolute top-[30px] left-[30px] z-[200] flex-row items-center p-3 bg-white/5 rounded-[20px]" 
        onPress={() => setShowLogin(false)}
      >
        <i className="fa-solid fa-arrow-left text-emerald-100"></i>
        <Text className="text-white font-black text-[10px] uppercase tracking-[2px] ml-3">Home</Text>
      </TouchableOpacity>
      <Login onLoginComplete={() => setShowLogin(false)} />
    </View>
  );

  return (
    <View className="flex-1 bg-emerald-950">
      <Head>
        <title>Dawn Naglich Wellness | Reclaim Motion</title>
        <meta name="description" content="Elite Muscle Activation & Functional Realignment for high-performance recovery." />
        {/* Replace with actual verification code when provided */}
        <meta name="google-site-verification" content="GSC_VERIFICATION_PLACEHOLDER" />
      </Head>

      {/* Nav override or extension for Home page */}
      <View className="fixed top-0 left-0 right-0 z-[110] px-6 pt-8 pb-5 flex-row items-center justify-between pointer-events-none">
        <View className="flex-1" /> {/* Spacer for Logo in _layout */}

        <View className="flex-row items-center gap-3 px-6 py-3 rounded-full bg-emerald-950/40 backdrop-blur-xl border border-emerald-500/10 pointer-events-auto">
          {PAGES.map((_, dotIdx) => (
            <TouchableOpacity
              key={dotIdx}
              onPress={() => setActiveLandingPage(dotIdx)}
              className={`h-2 rounded-full transition-all duration-500 ${activeLandingPage === dotIdx ? 'w-10 bg-emerald-400' : 'w-2 bg-emerald-400/20'}`}
            />
          ))}
        </View>

        <View className="flex-1 flex-row justify-end pointer-events-auto">
          <TouchableOpacity 
            onPress={() => user ? scrollToAgenda() : setShowLogin(true)}
            className="px-5 py-2 bg-emerald-400 rounded-xl hover:bg-white transition-all active:scale-95"
          >
            <Text className="text-emerald-950 text-[10px] font-black uppercase tracking-widest">
              {user ? 'My Sessions' : 'Login'}
            </Text>
          </TouchableOpacity>
          {user && <View className="w-12" />} {/* Spacer for Logout icon in _layout */}
        </View>
      </View>

      <ScrollView 
        ref={verticalScrollRef} 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        <View style={{ width: '100%', height: windowHeight }}>
          <ClientLanding 
            onBookNow={scrollToAgenda} 
            onLoginClick={() => setShowLogin(true)}
            isLoggedIn={!!user} 
            activePageIndex={activeLandingPage} 
            onNavigateToPage={setActiveLandingPage}
          />
        </View>

        <View 
          onLayout={(event) => {
            const layout = event.nativeEvent.layout;
            if (layout.y > 0) setAgendaOffset(layout.y);
          }}
          className="w-full bg-white z-[20]"
          style={{ minHeight: windowHeight }}
        >
          <View className="px-10 pt-[120px] pb-5 bg-white">
             <Text className="text-[42px] font-black color-[#064e3b] tracking-[-2px] uppercase">Schedule</Text>
             <Text className="text-[11px] font-bold color-[#94A3B8] uppercase tracking-[2px] mt-1">Select a window for realignment</Text>
          </View>
          
          <Booking 
            activeSlotId={activeSlotId} 
            onSlotSelect={setActiveSlotId} 
          />

          <Footer />
        </View>
      </ScrollView>
    </View>
  );
}

