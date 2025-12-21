import React from 'react';
import { TouchableOpacity, Text, Dimensions } from 'react-native';

interface LogoProps {
  size?: number;
  color?: string; // Primary brand color
  onPress?: () => void;
}

const Logo: React.FC<LogoProps> = ({ size = 42, color = '#10B981', onPress }) => {
  const isLarge = Dimensions.get('window').width >= 1024;
  const displayText = isLarge ? 'DAWN NAGLICH' : 'DN';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ zIndex: 110 }}>
      <Text 
        style={{ 
          fontFamily: 'Playfair Display', 
          fontWeight: '900', 
          fontSize: size * 0.8, 
          color: '#FFFFFF',
          letterSpacing: isLarge ? 4 : 2,
          textTransform: 'uppercase',
          textShadowColor: color,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 2,
        }}
      >
        {displayText}
      </Text>
    </TouchableOpacity>
  );
};

export default Logo;
