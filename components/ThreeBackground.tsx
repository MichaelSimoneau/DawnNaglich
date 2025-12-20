import React, { useRef } from 'react';
import { View } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PAGES } from '../content';

interface ThreeBackgroundProps {
  progress: number; // 0 to 3
}

const ColorBox = ({ color, index, progress }: { color: string; index: number; progress: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (!meshRef.current) return;
    const distance = index - progress;
    meshRef.current.position.x = distance * (viewport.width + 2);
    meshRef.current.position.z = -Math.abs(distance) * 4;
    meshRef.current.rotation.y = -distance * 0.5;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

const Scene = ({ progress }: { progress: number }) => {
  const colors = ['#064E3B', '#065F46', '#047857'];
  return (
    <group>
      <ambientLight intensity={0.8} />
      {colors.map((c, i) => (
        <ColorBox key={i} color={c} index={i} progress={progress} />
      ))}
    </group>
  );
};

const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ progress }) => {
  const opacity = progress > 2 ? Math.max(0, 1 - (progress - 2) * 2) : 1;
  if (opacity <= 0) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, opacity }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene progress={progress} />
      </Canvas>
    </View>
  );
};

export default ThreeBackground;
