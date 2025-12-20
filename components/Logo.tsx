import React, { useState, useEffect } from 'react';
import { Animated, Easing, TouchableOpacity, Dimensions, Platform, View } from 'react-native';

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

    // Subtle breathing animation for a living-brand feel
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => subscription.remove();
  }, []);

  // Calculate widths based on viewport
  const svgWidth = isLarge ? 580 : 160;
  const displayWidth = isLarge ? size * 6.5 : size * 1.6;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ zIndex: 110 }}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <svg
          width={displayWidth}
          height={size}
          viewBox={`0 0 ${svgWidth} 100`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible', transition: 'width 0.4s ease-in-out' }}
        >
          <defs>
            <filter id="logoShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
              <feOffset dx="0" dy="5" result="offsetblur" />
              <feFlood floodColor="#064e3b" floodOpacity="0.8" result="shadowColor" />
              <feComposite in="shadowColor" in2="offsetblur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <style>
            {`
              .logo-char {
                filter: url(#logoShadow);
                stroke-linejoin: round;
                stroke-linecap: round;
                paint-order: stroke fill;
                font-family: 'Playfair Display', serif;
                font-weight: 900;
                text-transform: uppercase;
              }
              .breathing-dot {
                animation: dotFade 3s ease-in-out infinite;
              }
              @keyframes dotFade {
                0%, 100% { opacity: 0.4; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.2); }
              }
            `}
          </style>

          {isLarge ? (
            <g className="logo-char">
              <text 
                x="0" 
                y="80" 
                fontSize="82" 
                fill="#FFFFFF" 
                stroke={color} 
                strokeWidth="5"
                letterSpacing="4"
              >
                DAWN NAGLICH
              </text>
              <circle cx="560" cy="50" r="6" fill={color} className="breathing-dot" />
            </g>
          ) : (
            <g className="logo-char">
              {/* Bold Stylized 'D' */}
              <path
                d="M10 15 H40 C65 15 75 35 75 50 C75 65 65 85 40 85 H10 V15 Z M24 28 V72 H38 C52 72 58 60 58 50 C58 40 52 28 38 28 H24 Z"
                fill="#FFFFFF"
                stroke={color}
                strokeWidth="6"
              />
              {/* Bold Stylized 'N' */}
              <path
                d="M90 85 V15 H105 L140 65 V15 H155 V85 H140 L105 35 V85 H90 Z"
                fill="#FFFFFF"
                stroke={color}
                strokeWidth="6"
              />
            </g>
          )}
        </svg>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default Logo;