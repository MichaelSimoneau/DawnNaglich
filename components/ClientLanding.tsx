import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate, 
  Extrapolation, 
  runOnJS,
  useAnimatedReaction
} from 'react-native-reanimated';
import LocationMap from './LocationMap';
import ThreeBackground from './ThreeBackground';
import { PAGES } from '../content';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [isMapActive, setIsMapActive] = useState(false);
  const scrollX = useSharedValue(activePageIndex);
  const context = useSharedValue(0);
  const [progress, setProgress] = useState(activePageIndex);

  useEffect(() => {
    // Only spring if we are not currently dragging
    scrollX.value = withSpring(activePageIndex, { damping: 20, stiffness: 90 });
    if (activePageIndex !== 3) setIsMapActive(false);
  }, [activePageIndex]);

  // Sync reanimated shared value to React state for Three.js
  useAnimatedReaction(
    () => scrollX.value,
    (current) => {
      runOnJS(setProgress)(current);
    }
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = scrollX.value;
    })
    .onUpdate((event) => {
      const target = context.value - event.translationX / SCREEN_WIDTH;
      scrollX.value = Math.max(0, Math.min(PAGES.length - 1, target));
      
      // Update parent index immediately for UI feedback (indicators)
      const currentIndex = Math.round(scrollX.value);
      if (currentIndex !== activePageIndex) {
        runOnJS(onNavigateToPage)(currentIndex);
      }
    })
    .onEnd((event) => {
      const velocity = -event.velocityX / SCREEN_WIDTH;
      const targetIndex = Math.round(scrollX.value + velocity * 0.2);
      const finalIndex = Math.max(0, Math.min(PAGES.length - 1, targetIndex));
      
      scrollX.value = withSpring(finalIndex, { velocity: velocity });
      runOnJS(onNavigateToPage)(finalIndex);
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View className="relative w-full h-full bg-emerald-950 overflow-hidden">
          
          <ThreeBackground progress={progress} />

          {/* Map Section for index 3 */}
          <Animated.View 
            style={useAnimatedStyle(() => ({
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: interpolate(scrollX.value, [2, 3], [0, 1], Extrapolation.CLAMP),
              zIndex: scrollX.value > 2.5 ? 10 : -1,
            }))}
          >
            <LocationMap isInteractive={isMapActive} />
          </Animated.View>

          {/* Content Overlay */}
          <View className="absolute inset-0 z-20 pointer-events-none">
            {PAGES.map((page, idx) => (
              <ContentSlide 
                key={page.id}
                page={page}
                index={idx}
                scrollX={scrollX}
                onBookNow={onBookNow}
                isMapActive={isMapActive}
                setIsMapActive={setIsMapActive}
              />
            ))}
          </View>

          {/* Vertical Hint Button */}
          <Animated.View 
            style={useAnimatedStyle(() => ({
              opacity: interpolate(isMapActive ? 1 : 0, [0, 1], [1, 0]),
            }))}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
          >
            <button 
              className="flex flex-col items-center gap-1 pointer-events-auto"
              onClick={onBookNow}
            >
              <span className="text-[8px] font-black text-emerald-400/30 uppercase tracking-[0.5em]">Reserve Now</span>
              <div className="animate-bounce">
                <i className="fa-solid fa-chevron-down text-emerald-400/30"></i>
              </div>
            </button>
          </Animated.View>

          {/* Exit Map */}
          {isMapActive && (
            <button 
              onClick={() => setIsMapActive(false)}
              className="absolute top-28 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-emerald-950 text-emerald-50 rounded-full font-black text-[10px] uppercase tracking-widest border border-emerald-500/50"
            >
              Exit Exploration
            </button>
          )}
        </View>
      </GestureDetector>
    );
  };

const ContentSlide = ({ page, index, scrollX, onBookNow, isMapActive, setIsMapActive }: any) => {
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [index - 0.5, index, index + 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    
    const translateY = interpolate(
      scrollX.value,
      [index - 0.5, index, index + 0.5],
      [20, 0, -20],
      Extrapolation.CLAMP
    );

    return {
      opacity: isMapActive ? 0 : opacity,
      transform: [{ translateY }],
      display: opacity === 0 ? 'none' : 'flex'
    };
  });

  return (
    <Animated.View 
      style={animatedStyle}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <span className="inline-block py-2 px-5 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em] mb-4">
        {page.badge}
      </span>
      <h2 className="text-4xl md:text-8xl font-black text-white leading-none tracking-tighter mb-6 italic uppercase">
        {page.subtitle}
      </h2>
      <p className="max-w-xl mx-auto text-white/70 text-sm md:text-lg font-light leading-relaxed mb-8">
        {page.description}
      </p>

      {index === 3 ? (
        <button 
          onClick={() => setIsMapActive(true)}
          className="px-8 py-4 bg-emerald-900/40 border border-emerald-400/30 text-emerald-50 rounded-2xl font-black text-sm hover:bg-emerald-400 hover:text-emerald-950 transition-all backdrop-blur-xl pointer-events-auto"
        >
          Explore Facility
        </button>
      ) : (
        <button 
          onClick={onBookNow}
          className="px-10 py-5 bg-emerald-400 text-emerald-950 rounded-2xl font-black text-sm shadow-2xl hover:bg-white transition-all active:scale-95 pointer-events-auto"
        >
          View Available Times
        </button>
      )}
    </Animated.View>
  );
};

export default ClientLanding;
