import React from 'react';
import { View, StyleSheet, Image, useWindowDimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation,
  useSharedValue
} from 'react-native-reanimated';
import { PAGES } from '../content';

interface Props {
  progress: ReturnType<typeof useSharedValue<number>>;
}

const LandingPage: React.FC<Props> = ({ progress }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  return (
    <View style={styles.container}>
      {PAGES.map((page, index) => {
        if (index >= 3 || !page.image) return null;
        
        const animatedStyle = useAnimatedStyle(() => {
          const translateX = (index - progress.value) * SCREEN_WIDTH;
          const opacity = interpolate(
            progress.value,
            [index - 0.9, index, index + 0.9],
            [0, 1, 0],
            Extrapolation.CLAMP
          );
          
          return {
            transform: [{ translateX }],
            opacity,
            zIndex: index === Math.round(progress.value) ? 1 : 0
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
      <View style={styles.overlay} pointerEvents="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 44, 34, 0.9)',
    zIndex: 5,
  },
});

export default LandingPage;

