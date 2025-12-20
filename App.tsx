import './global.css';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, TouchableOpacity, Text, SafeAreaView, ActivityIndicator, ScrollView, Dimensions, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { auth, isDemo } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { User, UserRole } from './types';
import { ADMIN_EMAILS } from './constants';

import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ClientLanding, { PAGES } from './components/ClientLanding';
import Booking from './components/Booking';
import ClientAssistant from './components/ClientAssistant';
import SnowOverlay from './components/SnowOverlay';
import Logo from './components/Logo';

const App: React.FC = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [activeLandingPage, setActiveLandingPage] = useState(0);
  const [isSnowing, setIsSnowing] = useState(false);
  
  // Lifted State: Manage active booking slot here to control collapse on scroll
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  const verticalScrollRef = useRef<ScrollView>(null);
  const { height: windowHeight } = Dimensions.get('window');
  
  // Track scroll for collapse logic
  const lastScrollY = useRef(0);
  const [agendaOffset, setAgendaOffset] = useState(windowHeight);

  // Scroll Handler: Collapses active slot if user scrolls significantly
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = Math.abs(currentY - lastScrollY.current);

    // Update tracker
    lastScrollY.current = currentY;

    // If a slot is open and we scroll more than 50px, collapse it
    if (activeSlotId && diff > 50) {
      setActiveSlotId(null);
    }
  };

  useEffect(() => {
    // Force scroll to top on mount to prevent "loading without landing"
    setTimeout(() => {
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 100);
  }, []);

  useEffect(() => {
    const currentPage = PAGES[activeLandingPage];
    const pageTitle = `Dawn Naglich | ${currentPage.label}`;
    try {
      const targetHash = `#${currentPage.id}`;
      if (window.location.hash !== targetHash && !window.location.protocol.startsWith('blob')) {
        window.history.replaceState(null, '', targetHash);
      }
    } catch (e) {}
    document.title = pageTitle;
  }, [activeLandingPage]);

  useEffect(() => {
    if (!auth) { setInitializing(false); return; }
    const subscriber = onAuthStateChanged(auth, (u) => {
      if (u) {
        const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === u.email?.toLowerCase());
        setUser({ 
          id: u.uid, 
          email: u.email!, 
          name: u.displayName || 'Guest', 
          role: isAdmin ? UserRole.ADMIN : UserRole.CLIENT 
        });
        setShowLogin(false);
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return subscriber;
  }, []);

  const handleLogout = () => { if (auth) signOut(auth); else setUser(null); };
  
  const scrollToTop = () => {
    setActiveLandingPage(0);
    verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const scrollToAgenda = () => {
    // Scroll to the measured offset of the Booking component
    verticalScrollRef.current?.scrollTo({ y: agendaOffset, animated: true });
  };

  if (initializing) return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.splashLogo}>DAWN NAGLICH</Text>
    </View>
  );

  if (user?.role === UserRole.ADMIN) return <AdminDashboard />;

  if (showLogin) return (
    <View style={{ flex: 1, backgroundColor: '#022c22' }}>
      <TouchableOpacity style={styles.backButton} onPress={() => setShowLogin(false)}>
        <i className="fa-solid fa-arrow-left text-emerald-100"></i>
        <Text style={styles.backButtonText}>Home</Text>
      </TouchableOpacity>
      <Login onLoginComplete={u => setUser(u)} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {isSnowing && <SnowOverlay />}

      {/* Fixed Nav */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 pt-8 pb-5 backdrop-blur-3xl bg-emerald-950/80 border-b border-emerald-500/20 safe-top">
        <div className="flex items-center gap-4 lg:gap-8">
          <Logo onPress={scrollToTop} color="#10B981" size={Platform.OS === 'web' ? 42 : 36} />
        </div>

        <div className="flex items-center gap-3 lg:gap-5">
          <button 
            onClick={() => user ? scrollToAgenda() : setShowLogin(true)}
            className="px-5 py-2 bg-emerald-400 text-emerald-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl active:scale-95"
          >
            {user ? 'My Sessions' : 'Reserve Time'}
          </button>
          
          {user && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <i className="fa-solid fa-power-off text-emerald-400"></i>
            </TouchableOpacity>
          )}
        </div>
      </nav>
      
      {/* 
        CRITICAL: overflow-visible is needed on the ScrollView container for sticky headers to work 
        in React Native Web because RN wraps the content in a div that sometimes defaults to overflow:hidden.
      */}
      <ScrollView 
        ref={verticalScrollRef} 
        style={styles.mainScroll} 
        contentContainerStyle={{ flexGrow: 1, overflow: 'visible' }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        {/* SECTION 1: Carousel Section - Forced Height to Window Height */}
        <View style={{ width: '100%', height: windowHeight, zIndex: 10 }}>
          <ClientLanding 
            onBookNow={scrollToAgenda} 
            onLoginClick={() => setShowLogin(true)}
            isLoggedIn={!!user} 
            activePageIndex={activeLandingPage} 
            onNavigateToPage={setActiveLandingPage}
          />
        </View>

        {/* SECTION 2: Agenda Section */}
        <View 
          style={styles.agendaWrapper}
          onLayout={(event) => {
            const layout = event.nativeEvent.layout;
            // Capture the exact Y position where the agenda starts
            if (layout.y > 0) setAgendaOffset(layout.y);
          }}
        >
          <View style={styles.agendaHeader}>
             <Text style={styles.agendaTitle}>Schedule</Text>
             <Text style={styles.agendaSub}>Select a window for realignment</Text>
          </View>
          
          {/* Pass the lifted state down to Booking */}
          <Booking 
            activeSlotId={activeSlotId} 
            onSlotSelect={setActiveSlotId} 
          />
        </View>
      </ScrollView>

      {/* FABs */}
      {!isAssistantOpen && (
        <View style={styles.fabCluster}>
          <TouchableOpacity onPress={() => setIsSnowing(!isSnowing)} style={[styles.fabSnow, isSnowing ? styles.fabSnowActive : styles.fabSnowInactive]}>
            <i className={`fa-solid fa-snowflake ${isSnowing ? 'text-white' : 'text-emerald-400'} text-lg`}></i>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsAssistantOpen(true)} style={styles.fabAssistant}>
            <i className="fa-solid fa-wand-magic-sparkles text-white text-xl"></i>
          </TouchableOpacity>
        </View>
      )}

      <ClientAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#022c22' },
  mainScroll: { flex: 1 },
  splash: { flex: 1, backgroundColor: '#022c22', justifyContent: 'center', alignItems: 'center' },
  splashLogo: { marginTop: 20, fontSize: 12, color: '#10B981', fontWeight: '900', letterSpacing: 8 },
  backButton: { position: 'absolute', top: 30, left: 30, zIndex: 200, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
  backButtonText: { color: '#FFF', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginLeft: 12 },
  agendaWrapper: { width: '100%', minHeight: Dimensions.get('window').height, backgroundColor: '#FFF', zIndex: 20 },
  agendaHeader: { paddingHorizontal: 40, paddingTop: 120, paddingBottom: 20, backgroundColor: '#FFF' },
  agendaTitle: { fontSize: 42, fontWeight: '900', color: '#064e3b', letterSpacing: -2, textTransform: 'uppercase' },
  agendaSub: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
  fabCluster: { position: 'absolute', bottom: 40, right: 32, gap: 16, zIndex: 1001 },
  fabSnow: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  fabSnowActive: { backgroundColor: '#10B981', borderColor: '#FFF' },
  fabSnowInactive: { backgroundColor: 'rgba(2, 44, 34, 0.9)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  fabAssistant: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', shadowColor: '#059669', shadowOpacity: 0.5, shadowRadius: 15 },
  logoutBtn: { padding: 8, opacity: 0.5 },
});

export default App;