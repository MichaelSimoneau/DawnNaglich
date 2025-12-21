import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";

const SnowOverlay: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<any>(null);

  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      !containerRef.current
    )
      return;

    // Load Three.js from CDN to avoid Metro bundling issues
    const loadThree = async () => {
      // Check if THREE is already loaded
      if ((window as any).THREE) {
        threeRef.current = (window as any).THREE;
        initScene();
        return;
      }

      // Load from CDN
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        script.onload = () => {
          threeRef.current = (window as any).THREE;
          initScene();
          resolve();
        };
        script.onerror = () => {
          // Fallback to require if CDN fails
          try {
            const threeModule = require("three");
            threeRef.current = threeModule.default || threeModule;
            initScene();
            resolve();
          } catch (e) {
            console.error("Failed to load Three.js:", e);
            reject(e);
          }
        };
        document.head.appendChild(script);
      });
    };

    const initScene = () => {
      if (!threeRef.current || !containerRef.current) return;

      const THREE = threeRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      containerRef.current.appendChild(renderer.domElement);

      const snowflakeCount = 800;
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

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );

      const createCircleTexture = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext("2d");
        if (!context) return null;

        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.4)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

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
        sizeAttenuation: true,
      });

      const snowflakes = new THREE.Points(geometry, material);
      scene.add(snowflakes);

      camera.position.z = 50;

      let animationFrameId: number;
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        const positionsArray = geometry.attributes.position
          .array as Float32Array;
        const time = Date.now() * 0.0006;

        for (let i = 0; i < snowflakeCount; i++) {
          positionsArray[i * 3 + 1] -= velocities[i];
          positionsArray[i * 3] += Math.sin(time + sways[i]) * 0.012;

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

      window.addEventListener("resize", handleResize);
      animate();

      // Store cleanup
      const cleanup = () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animationFrameId);
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
        geometry.dispose();
        material.dispose();
        if (snowflakeTexture) snowflakeTexture.dispose();
        renderer.dispose();
      };

      // Store cleanup in a way that's accessible
      (containerRef.current as any)._threeCleanup = cleanup;
    };

    loadThree().catch(console.error);

    return () => {
      if ((containerRef.current as any)?._threeCleanup) {
        (containerRef.current as any)._threeCleanup();
      }
    };
  }, []);

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <div
      ref={containerRef as any}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 999,
      }}
    />
  );
};

export default SnowOverlay;
