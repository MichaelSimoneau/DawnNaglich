import React, { useState, useEffect } from 'react';
import { Animated, Easing, TouchableOpacity, Dimensions, Platform, View, Text } from 'react-native';

interface LogoProps {
  size?: number;
  color?: string; // Primary brand color
  onPress?: () => void;
}

const Logo: React.FC<LogoProps> = ({ size = 42, color = '#10B981', onPress }) => {
  const [isLarge, setIsLarge] = useState(Dimensions.get('window').width >= 1024);
  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const handleResize = () => {
      setIsLarge(Dimensions.get('window').width >= 1024);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();

    return () => subscription.remove();
  }, []);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ zIndex: 110 }}>
      <Animated.View style={{ transform: [{ scale: pulse }], flexDirection: 'row', alignItems: 'center' }}>
        {isLarge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text 
              style={{ 
                fontFamily: 'Playfair Display', 
                fontWeight: '900', 
                fontSize: size * 0.8, 
                color: '#FFFFFF',
                letterSpacing: 4,
                textTransform: 'uppercase',
                textShadowColor: color,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 2,
              }}
            >
              DAWN NAGLICH
            </Text>
            <View 
              style={{ 
                width: 6, 
                height: 6, 
                borderRadius: 3, 
                backgroundColor: color, 
                marginLeft: 10 
              }} 
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text 
              style={{ 
                fontFamily: 'Playfair Display', 
                fontWeight: '900', 
                fontSize: size * 0.8, 
                color: '#FFFFFF',
                textShadowColor: color,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 2,
              }}
            >
              DN
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default Logo;
