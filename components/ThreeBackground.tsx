import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation,
  SharedValue
} from 'react-native-reanimated';
import { PAGES } from '../content';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  progress: SharedValue<number>;
}

const ThreeBackground: React.FC<Props> = ({ progress }) => {
  return (
    <View style={styles.container}>
      {PAGES.map((page, index) => {
        if (index >= 3 || !page.image) return null;
        
        const animatedStyle = useAnimatedStyle(() => {
          const translateX = (index - progress.value) * SCREEN_WIDTH;
          const opacity = interpolate(
            progress.value,
            [index - 0.5, index, index + 0.5],
            [0, 1, 0],
            Extrapolation.CLAMP
          );
          
          return {
            transform: [{ translateX }],
            opacity,
          };
        });

        return (
          <Animated.View key={page.id} style={[styles.imageContainer, animatedStyle]}>
            <Image
              source={{ uri: page.image }}
              style={styles.image}
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
    backgroundColor: '#022C22',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 44, 34, 0.5)',
  },
});

export default ThreeBackground;
