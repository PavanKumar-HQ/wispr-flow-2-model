'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function AnimatedVoxelBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Scene & Camera Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07514C);
    scene.fog = new THREE.FogExp2(0x07514C, 0.007);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      1,
      1200
    );
    camera.position.set(0, 16, 52);
    camera.lookAt(0, 8, -40);

    // --- 2. WebGL Renderer (Energy-Efficient & Thermal-Optimized) ---
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      alpha: false, 
      powerPreference: 'low-power',
      precision: 'mediump'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // --- 3. Dynamic Lighting ---
    const sunLight = new THREE.DirectionalLight(0xFFF2D6, 2.2);
    sunLight.position.set(70, 100, 60);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0F5B57, 1.4);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0xDDA44D, 0.8);
    rimLight.position.set(-60, 50, -50);
    scene.add(rimLight);

    // --- 4. Materials ---
    const matGrassTop = new THREE.MeshLambertMaterial({ color: 0x07514C });
    const matDirt = new THREE.MeshLambertMaterial({ color: 0xDDA44D });
    const matDeepStone = new THREE.MeshLambertMaterial({ color: 0x0F5B57 });
    const matWood = new THREE.MeshLambertMaterial({ color: 0xBA8330 });
    const matLeaves = new THREE.MeshLambertMaterial({ color: 0x07514C });
    const matLeavesHighlight = new THREE.MeshLambertMaterial({ color: 0xB8CBC3 });
    const matWater = new THREE.MeshLambertMaterial({ 
      color: 0x0F5B57, 
      transparent: true, 
      opacity: 0.85 
    });
    const matFlowerYellow = new THREE.MeshLambertMaterial({ color: 0xDDA44D });
    const matFlowerStem = new THREE.MeshLambertMaterial({ color: 0x07514C });
    const matCloud = new THREE.MeshLambertMaterial({ 
      color: 0xFFFCE6, 
      transparent: true, 
      opacity: 0.92 
    });

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    // --- 5. World Generation ---
    const STEP = 2;
    const minX = -90, maxX = 90;
    const minZ = -120, maxZ = 50;

    const getHeight = (x: number, z: number) => {
      const riverDist = Math.abs(x - Math.sin(z * 0.05) * 8);
      if (riverDist < 5) return -1;
      const sideRise = Math.pow(Math.abs(x) * 0.065, 2.2) * 1.8;
      const hills = Math.sin(x * 0.1) * Math.cos(z * 0.08) * 4.5 + Math.sin(z * 0.12) * 3;
      const backRise = z < -30 ? Math.abs(z + 30) * 0.25 : 0;
      return Math.floor(sideRise + hills + backRise);
    };

    interface BlockDef {
      x: number;
      y: number;
      z: number;
      type: 'grass' | 'dirt' | 'stone' | 'water';
    }

    const blocks: BlockDef[] = [];
    const flowers: { x: number; y: number; z: number }[] = [];

    for (let x = minX; x <= maxX; x += STEP) {
      for (let z = minZ; z <= maxZ; z += STEP) {
        const h = getHeight(x, z);
        if (h < 0) {
          blocks.push({ x, y: 0.2, z, type: 'water' });
          blocks.push({ x, y: -2, z, type: 'dirt' });
        } else {
          blocks.push({ x, y: h, z, type: 'grass' });
          blocks.push({ x, y: h - 1, z, type: 'dirt' });
          if (h > 1) blocks.push({ x, y: h - 2, z, type: 'stone' });
          if (Math.random() < 0.06 && h >= 0 && z > -50) {
            flowers.push({ x, y: h + 1.2, z });
          }
        }
      }
    }

    const dummy = new THREE.Object3D();
    const createInstancedMesh = (items: BlockDef[], material: THREE.Material, scaleY = 1) => {
      const imesh = new THREE.InstancedMesh(boxGeo, material, items.length);
      imesh.castShadow = true;
      imesh.receiveShadow = true;
      items.forEach((b, i) => {
        dummy.position.set(b.x, b.y + scaleY * 0.5, b.z);
        dummy.scale.set(STEP, scaleY, STEP);
        dummy.updateMatrix();
        imesh.setMatrixAt(i, dummy.matrix);
      });
      imesh.instanceMatrix.needsUpdate = true;
      scene.add(imesh);
      return imesh;
    };

    createInstancedMesh(blocks.filter(b => b.type === 'grass'), matGrassTop, 1);
    createInstancedMesh(blocks.filter(b => b.type === 'dirt'), matDirt, 1);
    createInstancedMesh(blocks.filter(b => b.type === 'stone'), matDeepStone, 1);
    createInstancedMesh(blocks.filter(b => b.type === 'water'), matWater, 0.4);

    // --- 6. Trees ---
    const treePositions = [
      { x: -35, z: -10 }, { x: -45, z: -35 }, { x: -28, z: 12 }, { x: -55, z: 5 },
      { x: 30, z: -15 }, { x: 42, z: -40 }, { x: 35, z: 15 }, { x: 55, z: -5 },
      { x: -10, z: -70 }, { x: 14, z: -75 }, { x: -30, z: -85 }, { x: 28, z: -90 },
    ];

    const treeGroup = new THREE.Group();
    scene.add(treeGroup);

    treePositions.forEach(({ x, z }) => {
      const baseH = getHeight(x, z);
      if (baseH < 0) return;
      const trunkHeight = 6;
      for (let ty = 1; ty <= trunkHeight; ty++) {
        const trunkMesh = new THREE.Mesh(boxGeo, matWood);
        trunkMesh.position.set(x, baseH + ty, z);
        trunkMesh.scale.set(1.4, 1, 1.4);
        treeGroup.add(trunkMesh);
      }
      const topY = baseH + trunkHeight;
      for (let lx = -3; lx <= 3; lx += 1.5) {
        for (let lz = -3; lz <= 3; lz += 1.5) {
          for (let ly = 0; ly <= 3; ly += 1.2) {
            if (Math.abs(lx) >= 3 && Math.abs(lz) >= 3) continue;
            const leafMesh = new THREE.Mesh(boxGeo, ly % 2 === 0 ? matLeaves : matLeavesHighlight);
            leafMesh.position.set(x + lx, topY + ly, z + lz);
            leafMesh.scale.set(1.5, 1.2, 1.5);
            treeGroup.add(leafMesh);
          }
        }
      }
    });

    // --- 7. Clouds ---
    interface CloudData {
      group: THREE.Group;
      speed: number;
    }
    const cloudsList: CloudData[] = [];

    const createCloud = (startX: number, startY: number, startZ: number, width: number, length: number) => {
      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(startX, startY, startZ);
      for (let cx = 0; cx < width; cx++) {
        for (let cz = 0; cz < length; cz++) {
          const mesh = new THREE.Mesh(boxGeo, matCloud);
          mesh.position.set(cx * 3, 0, cz * 3);
          mesh.scale.set(3, 1.2, 3);
          cloudGroup.add(mesh);
        }
      }
      scene.add(cloudGroup);
      cloudsList.push({ group: cloudGroup, speed: 0.05 + Math.random() * 0.03 });
    };

    createCloud(-70, 34, -40, 8, 5);
    createCloud(10, 38, -10, 9, 6);
    createCloud(-30, 42, 20, 7, 4);
    createCloud(40, 36, -60, 10, 5);

    // --- 8. Scroll & Mouse Parallax Response ---
    let scrollY = 0;
    let targetScrollY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleScroll = () => {
      targetScrollY = window.scrollY || window.pageYOffset;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // --- 9. Thermal-Guarded 30 FPS Animation Loop ---
    let animationId: number;
    let isPageVisible = !document.hidden;
    let lastRenderTime = performance.now();
    const TARGET_FRAME_MS = 1000 / 30; // Cap at 30 FPS to prevent GPU heat buildup
    const clock = new THREE.Clock();

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);

      if (!isPageVisible || document.hidden) return;

      const elapsedMs = currentTime - lastRenderTime;
      if (elapsedMs < TARGET_FRAME_MS) return;
      lastRenderTime = currentTime - (elapsedMs % TARGET_FRAME_MS);

      const elapsed = clock.getElapsedTime();

      // Smooth scroll interpolation
      scrollY += (targetScrollY - scrollY) * 0.05;

      // Parallax camera elevation and tilt driven by page scroll
      const scrollProgress = Math.min(scrollY / 1500, 2);
      camera.position.x = Math.sin(elapsed * 0.08) * 6 + mouseX * 3;
      camera.position.y = 17 + Math.cos(elapsed * 0.1) * 1.5 - scrollProgress * 3;
      camera.position.z = 52 - scrollProgress * 6;
      camera.lookAt(
        Math.sin(elapsed * 0.08) * 2 + mouseX * 1.5,
        7 - scrollProgress * 2,
        -35
      );

      // Clouds movement
      cloudsList.forEach((c) => {
        c.group.position.x += c.speed;
        if (c.group.position.x > 90) c.group.position.x = -90;
      });

      matWater.opacity = 0.82 + Math.sin(elapsed * 2.5) * 0.06;

      renderer.render(scene, camera);
    };

    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        lastRenderTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animate(performance.now());

    // --- 10. Resize ---
    const handleResize = () => {
      if (!container) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      boxGeo.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    />
  );
}
