import React, { useRef } from 'react';
import { View } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import * as THREE from 'three';
import { PAGES } from '../content';

interface ThreeBackgroundProps {
  progress: number; // 0 to 3
}

const ImagePlane = ({ url, index, progress }: { url: string; index: number; progress: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (!meshRef.current) return;

    // Calculate distance from current progress
    const distance = index - progress;
    
    // Position: Move horizontally and slightly back in Z
    meshRef.current.position.x = distance * (viewport.width + 2);
    meshRef.current.position.z = -Math.abs(distance) * 2;
    
    // Rotation: Tilt based on distance for a 3D feel
    meshRef.current.rotation.y = -distance * 0.3;
    meshRef.current.rotation.z = -distance * 0.05;
    
    // Scale slightly based on distance
    const scale = 1 - Math.abs(distance) * 0.1;
    meshRef.current.scale.set(viewport.width * scale, viewport.height * scale, 1);
    
    // Opacity: Fade out as it moves away
    if (meshRef.current.material) {
        // @ts-ignore
        meshRef.current.material.opacity = THREE.MathUtils.lerp(
            meshRef.current.material.opacity,
            Math.max(0, 1 - Math.abs(distance) * 1.2),
            0.1
        );
        // @ts-ignore
        meshRef.current.material.transparent = true;
    }
  });

  if (!url) return null;

  return (
    <Image
      ref={meshRef}
      url={url}
      transparent
      toneMapped={false}
    />
  );
};

const Scene = ({ progress }: { progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle float effect
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      {PAGES.map((page, index) => (
        index < 3 ? ( // Only first 3 are images
          <ImagePlane 
            key={page.id} 
            url={page.image} 
            index={index} 
            progress={progress} 
          />
        ) : null
      ))}
    </group>
  );
};

const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ progress }) => {
  // Fade out the 3D scene when the map (index 3) is active
  const opacity = progress > 2 ? Math.max(0, 1 - (progress - 2) * 2) : 1;

  if (opacity <= 0) return null;

  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 0, opacity }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true, stencil: false, depth: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene progress={progress} />
      </Canvas>
      {/* Dark gradient overlay matching the original style */}
      <View 
        className="absolute inset-0 bg-gradient-to-b from-emerald-950/80 via-emerald-950/40 to-emerald-950/90" 
        style={{ pointerEvents: 'none' } as any}
      />
    </View>
  );
};

export default ThreeBackground;
