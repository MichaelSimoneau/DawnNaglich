import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';

// Import Three.js and React Three Fiber - these will only be used on web
// Import Three.js first and make it globally available BEFORE React Three Fiber tries to use it
let THREE: any;
let Canvas: any;
let useFrame: any;
let AdditiveBlending = 2;

if (Platform.OS === 'web') {
  try {
    THREE = require('three');
    // Make Three.js globally available IMMEDIATELY for React Three Fiber
    if (typeof window !== 'undefined') {
      (window as any).THREE = THREE;
    }
    // Now import React Three Fiber after Three.js is available
    const r3f = require('@react-three/fiber');
    Canvas = r3f.Canvas;
    useFrame = r3f.useFrame;
    AdditiveBlending = THREE.AdditiveBlending;
  } catch (error) {
    console.error('SnowOverlay: Failed to load Three.js or React Three Fiber:', error);
  }
}

const SnowParticles = () => {
  const count = 800;
  const mesh = useRef<any>(null);

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
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

const SnowOverlay: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [threeLoaded, setThreeLoaded] = useState(false);

  // Only render on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  // Ensure we're on the client side and component has mounted, and Three.js is loaded
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Ensure Three.js is available
      const ensureThree = async () => {
        try {
          // Force Three.js to be loaded
          if (!(window as any).THREE) {
            (window as any).THREE = THREE;
          }
          
          // Small delay to ensure everything is ready
          await new Promise(resolve => setTimeout(resolve, 100));
          
          console.log('SnowOverlay: Three.js loaded, setting mounted to true');
          setThreeLoaded(true);
          setMounted(true);
        } catch (error) {
          console.error('SnowOverlay: Error loading Three.js', error);
          setHasError(true);
        }
      };
      
      ensureThree();
    }
  }, []);

  // Don't render until mounted on client and Three.js is loaded
  if (!mounted || !threeLoaded) {
    return null;
  }

  // If there was an error, don't crash - just don't render
  if (hasError) {
    console.warn('SnowOverlay: Error state is true, not rendering');
    return null;
  }

  if (Platform.OS !== 'web' || !Canvas || !THREE) {
    return null;
  }

  console.log('SnowOverlay: Rendering Canvas');

  return (
    <View style={styles.container}>
      <ErrorBoundary onError={() => {
        console.error('SnowOverlay: ErrorBoundary caught an error');
        setHasError(true);
      }}>
        <Canvas 
          camera={{ position: [0, 0, 25], fov: 75 }} 
          gl={{ alpha: true }}
          onCreated={(state) => {
            console.log('SnowOverlay: Canvas created successfully', {
              hasGl: !!state.gl,
              hasScene: !!state.scene,
              hasCamera: !!state.camera,
            });
          }}
        >
          <SnowParticles />
        </Canvas>
      </ErrorBoundary>
    </View>
  );
};

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('SnowOverlay error:', error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 999,
    ...(Platform.OS === 'web' && { position: 'fixed' as any }),
  },
});

export default SnowOverlay;
