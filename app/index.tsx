import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { useUser } from "../UserContext";

import Login from "../components/Login";
import ClientLanding from "../components/ClientLanding";
import { PAGES } from "../content";
import Booking from "../components/Booking";
import Footer from "../components/Footer";

export default function Home() {
  const { user } = useUser();
  const { height: windowHeight } = useWindowDimensions();
  const [showLogin, setShowLogin] = useState(false);
  const [activeLandingPage, setActiveLandingPage] = useState(0);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [agendaOffset, setAgendaOffset] = useState(windowHeight || 800);

  const verticalScrollRef = useRef<ScrollView>(null);
  const lastScrollY = useRef(0);

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
      if (
        typeof window !== "undefined" &&
        window.location.hash !== targetHash
      ) {
        window.history.replaceState(null, "", targetHash);
      }
    } catch (e) {}
    if (typeof document !== "undefined") {
      document.title = pageTitle;
    }
  }, [activeLandingPage]);

  const scrollToAgenda = () => {
    verticalScrollRef.current?.scrollTo({ y: agendaOffset, animated: true });
  };

  const scrollToTop = () => {
    verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleLoginComplete = () => {
    setShowLogin(false);
    // Scroll back to top (ClientLanding) after successful login
    setTimeout(() => {
      scrollToTop();
      // Also reset to first landing page
      setActiveLandingPage(0);
    }, 100);
  };

  if (showLogin)
    return (
      <View className="flex-1 bg-emerald-950">
        <TouchableOpacity
          className="absolute top-[30px] left-[30px] z-[200] flex-row items-center p-3 bg-white/5 rounded-[20px]"
          onPress={() => setShowLogin(false)}
        >
          <FontAwesome6 name="arrow-left" size={14} color="#D1FAE5" />
          <Text className="text-white font-black text-[10px] uppercase tracking-[2px] ml-3">
            Home
          </Text>
        </TouchableOpacity>
        <Login onLoginComplete={handleLoginComplete} />
      </View>
    );

  return (
    <View className="flex-1 bg-emerald-950">
      <ScrollView
        ref={verticalScrollRef}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        <View style={{ width: "100%", height: windowHeight, minHeight: 600 }}>
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
            <Text className="text-[42px] font-black text-[#064e3b] tracking-tighter uppercase">
              Schedule
            </Text>
            <Text className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[2px] mt-1">
              Select a window for realignment
            </Text>
          </View>

          <Booking activeSlotId={activeSlotId} onSlotSelect={setActiveSlotId} />

          <Footer />
        </View>
      </ScrollView>
    </View>
  );
}
