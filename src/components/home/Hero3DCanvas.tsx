import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Hero3DCanvasProps {
  className?: string;
}

export default function Hero3DCanvas({ className = '' }: Hero3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        55,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 70;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // --- Subtle Ambient Particles: Calming Blue / Slate / Purple ---
      const particleCount = 180;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const color1 = new THREE.Color('#38bdf8'); // Subtle Cyan
      const color2 = new THREE.Color('#818cf8'); // Indigo
      const color3 = new THREE.Color('#a5b4fc'); // Soft Lavender

      const palette = [color1, color2, color3];

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 140;
        positions[i3 + 1] = (Math.random() - 0.5) * 90;
        positions[i3 + 2] = (Math.random() - 0.5) * 60;

        const chosen = palette[Math.floor(Math.random() * palette.length)];
        colors[i3] = chosen.r;
        colors[i3 + 1] = chosen.g;
        colors[i3 + 2] = chosen.b;
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Circular particle texture
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.3, 'rgba(129, 140, 248, 0.5)');
        gradient.addColorStop(0.8, 'rgba(56, 189, 248, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
      }
      const particleTexture = new THREE.CanvasTexture(canvas);

      const particleMaterial = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        map: particleTexture,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particleSystem);

      // --- Subtle Ambient Waves (Sleek Fintech Data Ribbons) ---
      const curves: THREE.CatmullRomCurve3[] = [];
      const lineObjects: THREE.Line[] = [];

      for (let k = 0; k < 3; k++) {
        const points: THREE.Vector3[] = [];
        const yBase = (k - 1) * 16;
        for (let p = 0; p < 7; p++) {
          points.push(
            new THREE.Vector3(
              (p - 3) * 28,
              yBase + Math.sin(p * 0.7 + k) * 8,
              (Math.sin(p + k) - 0.5) * 18
            )
          );
        }
        const curve = new THREE.CatmullRomCurve3(points);
        curves.push(curve);

        const curvePoints = curve.getPoints(80);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const lineMat = new THREE.LineBasicMaterial({
          color: k === 0 ? 0x38bdf8 : 0x818cf8,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          linewidth: 1,
        });

        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
        lineObjects.push(line);
      }

      // Mouse Parallax
      let mouseX = 0;
      let mouseY = 0;
      let targetX = 0;
      let targetY = 0;

      const onMouseMove = (event: MouseEvent) => {
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;
        mouseX = (event.clientX - windowHalfX) * 0.03;
        mouseY = (event.clientY - windowHalfY) * 0.03;
      };

      window.addEventListener('mousemove', onMouseMove, { passive: true });

      // Resize handler
      const handleResize = () => {
        if (!container || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };

      window.addEventListener('resize', handleResize);

      // Render Loop
      let clock = new THREE.Clock();

      const animate = () => {
        const elapsedTime = clock.getElapsedTime();

        // Smooth camera follow
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;
        camera.position.x = targetX * 0.4;
        camera.position.y = -targetY * 0.4;
        camera.lookAt(scene.position);

        // Slow calm rotation
        particleSystem.rotation.y = elapsedTime * 0.02;
        particleSystem.rotation.x = Math.sin(elapsedTime * 0.01) * 0.05;

        // Wave updates
        lineObjects.forEach((line, idx) => {
          line.rotation.z = Math.sin(elapsedTime * 0.2 + idx) * 0.04;
          line.position.y = Math.sin(elapsedTime * 0.3 + idx) * 1.5;
        });

        renderer?.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', handleResize);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
          renderer.dispose();
        }
      };
    } catch (e) {
      console.warn('WebGL initialization error', e);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
