import React, { useState, useEffect, useRef } from 'react';
import { View, Text, useWindowDimensions, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation, 
  runOnJS,
  useAnimatedScrollHandler
} from 'react-native-reanimated';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import LocationMap from './LocationMap';
import LandingPage from './LandingPage';
import { PAGES } from '../content';

interface ClientLandingProps {
  onBookNow: () => void;
  onLoginClick: () => void;
  isLoggedIn: boolean;
  onNavigateToPage: (index: number) => void;
  activePageIndex: number;
}

const ClientLanding: React.FC<ClientLandingProps> = ({ 
  onBookNow, 
  onLoginClick, 
  isLoggedIn, 
  onNavigateToPage,
  activePageIndex 
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [isMapActive, setIsMapActive] = useState(false);
  const scrollX = useSharedValue(activePageIndex);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  useEffect(() => {
    scrollX.value = activePageIndex;
    const targetPos = activePageIndex * SCREEN_WIDTH;
    scrollViewRef.current?.scrollTo({ x: targetPos, animated: true });
    if (activePageIndex !== 3) setIsMapActive(false);
  }, [activePageIndex, SCREEN_WIDTH]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x / SCREEN_WIDTH;
    },
    onMomentumScrollEnd: (event) => {
      const index = Math.round(event.contentOffset.x / SCREEN_WIDTH);
      const clampedIndex = Math.max(0, Math.min(index, PAGES.length - 1));
      runOnJS(onNavigateToPage)(clampedIndex);
    }
  });

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  return (
    <View style={styles.container}>
      <LandingPage progress={scrollX} />

      {/* Map Section for index 3 */}
      <Animated.View 
        style={useAnimatedStyle(() => ({
          ...StyleSheet.absoluteFillObject,
          opacity: interpolate(scrollX.value, [2.5, 3], [0, 1], Extrapolation.CLAMP),
          zIndex: scrollX.value > 2.5 ? 10 : -1,
        }))}
      >
        <LocationMap isInteractive={isMapActive} />
      </Animated.View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        decelerationRate={0.9}
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
        disableIntervalMomentum={false}
        bounces={false}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: SCREEN_WIDTH * PAGES.length }}
      >
        {PAGES.map((page, idx) => (
          <View key={page.id} style={{ width: SCREEN_WIDTH, height: '100%' }}>
            <ContentSlide 
              page={page}
              index={idx}
              scrollX={scrollX}
              SCREEN_WIDTH={SCREEN_WIDTH}
              onBookNow={onBookNow}
              isMapActive={isMapActive}
              setIsMapActive={setIsMapActive}
            />
          </View>
        ))}
      </Animated.ScrollView>

      {/* Top Bar with Indicators, Login/Logout - ALWAYS VISIBLE */}
      <View 
        style={styles.topBar}
        pointerEvents="box-none"
      >
        <View style={styles.topBarContent}>
          <View style={styles.spacer} />
          
          {/* Pagination Indicators - HIGHLY VISIBLE */}
          <View style={styles.indicatorContainer}>
            {PAGES.map((_, dotIdx) => (
              <TouchableOpacity
                key={dotIdx}
                onPress={() => onNavigateToPage(dotIdx)}
                style={[
                  styles.indicator,
                  activePageIndex === dotIdx && styles.indicatorActive
                ]}
              />
            ))}
          </View>

          {/* Login/Logout Buttons */}
          <View style={styles.buttonContainer}>
            {isLoggedIn && (
              <TouchableOpacity 
                onPress={handleLogout}
                style={styles.logoutButton}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={isLoggedIn ? onBookNow : onLoginClick}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>
                {isLoggedIn ? 'Sessions' : 'Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Vertical Hint Button - Show on all pages except map */}
      <Animated.View 
        style={useAnimatedStyle(() => ({
          opacity: interpolate(scrollX.value, [2.5, 3], [1, 0], Extrapolation.CLAMP),
          pointerEvents: scrollX.value > 2.5 ? 'none' : 'auto',
        }))}
      >
        <TouchableOpacity 
          style={styles.reserveButton}
          onPress={onBookNow}
        >
          <Text style={styles.reserveButtonText}>Reserve Now</Text>
          <Text style={styles.reserveIcon}>↓</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Exit Map Button */}
      {isMapActive && (
        <TouchableOpacity 
          onPress={() => setIsMapActive(false)}
          style={styles.exitMapButton}
        >
          <Text style={styles.exitMapButtonText}>Exit Exploration</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface ContentSlideProps {
  page: typeof PAGES[0];
  index: number;
  scrollX: ReturnType<typeof useSharedValue<number>>;
  SCREEN_WIDTH: number;
  onBookNow: () => void;
  isMapActive: boolean;
  setIsMapActive: (active: boolean) => void;
}

const ContentSlide: React.FC<ContentSlideProps> = ({ 
  page, 
  index, 
  scrollX, 
  SCREEN_WIDTH,
  onBookNow, 
  isMapActive, 
  setIsMapActive 
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];
    
    // Simple fade in/out - NO translateX, NO vertical movement
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    // Keep content visible over map until map is fully interactive
    const finalOpacity = (isMapActive && index === 3) ? 0 : opacity;
    
    return {
      opacity: finalOpacity,
    };
  });

  return (
    <Animated.View 
      style={[styles.slideContent, animatedStyle]}
    >
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>{page.badge}</Text>
      </View>
      <Text style={styles.subtitle}>{page.subtitle}</Text>
      <Text style={styles.description}>{page.description}</Text>

      {index === 3 ? (
        <TouchableOpacity 
          onPress={() => setIsMapActive(true)}
          style={styles.exploreButton}
        >
          <Text style={styles.exploreButtonText}>Explore Facility</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          onPress={onBookNow}
          style={styles.bookButton}
        >
          <Text style={styles.bookButtonText}>View Available Times</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#022c22',
  },
  topBar: {
    zIndex: 2000,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  spacer: {
    flex: 1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 44, 34, 0.95)',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
  },
  indicatorActive: {
    width: 56,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButtonText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    color: '#022c22',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  slideContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  badgeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 56,
    letterSpacing: -2,
    marginBottom: 24,
    textTransform: 'uppercase',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  description: {
    maxWidth: 600,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '300',
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  exploreButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'rgba(2, 44, 34, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 20,
  },
  exploreButtonText: {
    color: '#ECFDF5',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bookButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: '#10B981',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  bookButtonText: {
    color: '#022c22',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reserveButton: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
    zIndex: 100,
  },
  reserveButtonText: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(16, 185, 129, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 8,
  },
  reserveIcon: {
    fontSize: 28,
    color: 'rgba(16, 185, 129, 0.7)',
    fontWeight: '900',
  },
  exitMapButton: {
    position: 'absolute',
    top: 112,
    alignSelf: 'center',
    zIndex: 200,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#022c22',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  exitMapButtonText: {
    color: '#ECFDF5',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});

export default ClientLanding;
