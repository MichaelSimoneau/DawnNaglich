
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const SnowOverlay: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    
    containerRef.current.appendChild(renderer.domElement);

    const snowflakeCount = 800; // Slightly reduced for cleaner look
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(snowflakeCount * 3);
    const velocities = new Float32Array(snowflakeCount);
    const sways = new Float32Array(snowflakeCount);

    for (let i = 0; i < snowflakeCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 100 - 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      velocities[i] = 0.02 + Math.random() * 0.04;
      sways[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create a procedural soft circle texture to avoid black squares/borders
    const createCircleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (!context) return null;

      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    };

    const snowflakeTexture = createCircleTexture();
    
    const material = new THREE.PointsMaterial({
      size: 0.6,
      map: snowflakeTexture,
      transparent: true,
      opacity: 0.6,
      depthWrite: false, 
      blending: THREE.AdditiveBlending, 
      color: 0xffffff,
      sizeAttenuation: true
    });

    const snowflakes = new THREE.Points(geometry, material);
    scene.add(snowflakes);

    camera.position.z = 50;

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      const positionsArray = geometry.attributes.position.array as Float32Array;
      const time = Date.now() * 0.0006;

      for (let i = 0; i < snowflakeCount; i++) {
        // Vertical movement
        positionsArray[i * 3 + 1] -= velocities[i];
        // Horizontal sway
        positionsArray[i * 3] += Math.sin(time + sways[i]) * 0.012;

        // Reset if out of bounds
        if (positionsArray[i * 3 + 1] < -60) {
          positionsArray[i * 3 + 1] = 60;
          positionsArray[i * 3] = (Math.random() - 0.5) * 100;
        }
      }
      
      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      if (snowflakeTexture) snowflakeTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        pointerEvents: 'none', 
        zIndex: 999 
      }} 
    />
  );
};

export default SnowOverlay;
