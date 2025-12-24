import React from "react";
import { View, StyleSheet, Image, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useSharedValue,
} from "react-native-reanimated";
import { PAGES } from "../content";

interface Props {
  progress: ReturnType<typeof useSharedValue<number>>;
  isMapActive: boolean;
}

const LandingPage: React.FC<Props> = ({ progress, isMapActive }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const overlayStyle = useAnimatedStyle(() => {
    // Keep overlay fully visible until user clicks "Explore Facility"
    // OR fade out when on the map page (index 3)
    
    // Calculate opacity based on scroll position - fade out as we approach index 3
    const scrollOpacity = interpolate(
      progress.value,
      [2.5, 3],
      [1, 0],
      Extrapolation.CLAMP
    );

    // If map is active (explore button clicked), force opacity to 0
    // Otherwise use scroll-based opacity
    const finalOpacity = isMapActive ? 0 : scrollOpacity;

    return {
      opacity: finalOpacity,
      // Pass events through if transparent
      pointerEvents: finalOpacity < 0.1 ? 'none' : 'auto',
    };
  });

  return (
    <View style={styles.container}>
      {/* Background layer for pages 0-2 to cover the map */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: "#022c22" },
          overlayStyle
        ]} 
      />

      {PAGES.map((page, index) => {
        if (index >= 3 || !page.image) return null;

        const animatedStyle = useAnimatedStyle(() => {
          const translateX = (index - progress.value) * SCREEN_WIDTH;
          const opacity = interpolate(
            progress.value,
            [index - 0.9, index, index + 0.9],
            [0, 1, 0],
            Extrapolation.CLAMP,
          );

          return {
            transform: [{ translateX }],
            opacity,
            zIndex: index === Math.round(progress.value) ? 1 : 0,
          };
        });

        return (
          <Animated.View
            key={page.id}
            style={[StyleSheet.absoluteFill, animatedStyle]}
          >
            <Image
              source={{ uri: page.image }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          </Animated.View>
        );
      })}
      <Animated.View
        style={[styles.overlay, overlayStyle]}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Background color is handled in the Animated.View to allow fading the base color
    zIndex: 5,
  },
});

export default LandingPage;
