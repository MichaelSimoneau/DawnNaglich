import React, { useRef, useMemo } from 'react';
import { View, Platform } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SnowParticles = () => {
  const count = 800;
  const mesh = useRef<THREE.Points>(null);

  const [positions, velocities, sways] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    const swa = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      vel[i] = 0.02 + Math.random() * 0.04;
      swa[i] = Math.random() * Math.PI * 2;
    }
    return [pos, vel, swa];
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const posArray = mesh.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] -= velocities[i];
      posArray[i * 3] += Math.sin(time + sways[i]) * 0.01;

      if (posArray[i * 3 + 1] < -25) {
        posArray[i * 3 + 1] = 25;
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

const SnowOverlay: React.FC = () => {
  return (
    <View 
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 999 },
        Platform.OS === 'web' && { position: 'fixed' } as any
      ]}
    >
      <Canvas camera={{ position: [0, 0, 25], fov: 75 }} gl={{ alpha: true }}>
        <SnowParticles />
      </Canvas>
    </View>
  );
};

export default SnowOverlay;
