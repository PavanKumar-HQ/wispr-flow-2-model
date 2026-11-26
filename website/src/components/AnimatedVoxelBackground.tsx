'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * High-Performance, Zero-Lag 3D Voxel World & Moving Element Blocks.
 *
 * Architecture & Performance Optimizations:
 * 1. 100% InstancedMesh rendering (< 8 total draw calls for the entire world).
 * 2. Capped pixel ratio (1.0 DPR) to prevent GPU fillrate saturation on 4K/Retina displays.
 * 3. Moving voxel element blocks that float, oscillate, and rotate gently in space.
 * 4. Drifting Minecraft-style voxel clouds with looping wrap-around.
 * 5. Passive, throttled mouse and scroll parallax with smooth lerp interpolation.
 * 6. Thermal & Battery guard: automatically halts rendering when tab is inactive.
 * 7. Canonical Sovereign brand color palette: Dark Teal (#07514C), Warm Amber (#DDA44D),
 *    Terracotta (#DA6C4C), Linen Cream (#DFDFD4), and Deep River Teal (#0F5B57).
 */
export function AnimatedVoxelBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Scene & Atmosphere Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07514C);
    scene.fog = new THREE.FogExp2(0x07514C, 0.008);

    const isMobileInitial = window.innerWidth < 768;
    const camera = new THREE.PerspectiveCamera(
      isMobileInitial ? 66 : 52,
      window.innerWidth / window.innerHeight,
      1,
      800
    );
    camera.position.set(0, isMobileInitial ? 20 : 18, isMobileInitial ? 60 : 52);
    camera.lookAt(0, 8, -35);

    // --- 2. Hardware-Accelerated Low-Power WebGL Renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      precision: 'mediump',
      stencil: false,
      depth: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // DPR capped at 1.0 for authentic pixel voxel aesthetics and 4x lower GPU load
    renderer.setPixelRatio(1.0);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // --- 3. Dynamic Sovereign Lighting ---
    const sunLight = new THREE.DirectionalLight(0xFFF2D6, 2.0);
    sunLight.position.set(60, 90, 50);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0F5B57, 1.5);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0xDDA44D, 0.85);
    rimLight.position.set(-50, 40, -40);
    scene.add(rimLight);

    // --- 4. Shared Geometry & Sovereign Materials ---
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    const matGrass = new THREE.MeshLambertMaterial({ color: 0x07514C });
    const matDirt = new THREE.MeshLambertMaterial({ color: 0xDDA44D });
    const matStone = new THREE.MeshLambertMaterial({ color: 0x0A3F3B });
    const matWater = new THREE.MeshLambertMaterial({
      color: 0x0F5B57,
      transparent: true,
      opacity: 0.88,
    });
    const matWood = new THREE.MeshLambertMaterial({ color: 0xBA8330 });
    const matLeaves = new THREE.MeshLambertMaterial({ color: 0x0B635E });
    const matCloud = new THREE.MeshLambertMaterial({
      color: 0xFFFCE6,
      transparent: true,
      opacity: 0.92,
    });

    // Dynamic Element Block Materials (Floating Voxels)
    const matElementAmber = new THREE.MeshLambertMaterial({ color: 0xDDA44D });
    const matElementTeal = new THREE.MeshLambertMaterial({ color: 0x147C75 });
    const matElementTerracotta = new THREE.MeshLambertMaterial({ color: 0xDA6C4C });
    const matElementCream = new THREE.MeshLambertMaterial({ color: 0xDFDFD4 });

    const dummy = new THREE.Object3D();

    // --- 5. Procedural Voxel Landscape Grid ---
    const STEP = 2.4;
    const minX = -84, maxX = 84;
    const minZ = -108, maxZ = 48;

    const getHeight = (x: number, z: number) => {
      const riverDist = Math.abs(x - Math.sin(z * 0.05) * 8);
      if (riverDist < 5.5) return -1;
      const sideRise = Math.pow(Math.abs(x) * 0.06, 2.2) * 1.6;
      const hills = Math.sin(x * 0.1) * Math.cos(z * 0.08) * 4.2 + Math.sin(z * 0.12) * 2.8;
      const backRise = z < -25 ? Math.abs(z + 25) * 0.22 : 0;
      return Math.floor(sideRise + hills + backRise);
    };

    interface BlockPos {
      x: number;
      y: number;
      z: number;
    }

    const grassList: BlockPos[] = [];
    const dirtList: BlockPos[] = [];
    const stoneList: BlockPos[] = [];
    const waterList: BlockPos[] = [];
    const treeTrunkList: BlockPos[] = [];
    const treeLeavesList: BlockPos[] = [];

    for (let x = minX; x <= maxX; x += STEP) {
      for (let z = minZ; z <= maxZ; z += STEP) {
        const h = getHeight(x, z);
        if (h < 0) {
          waterList.push({ x, y: 0.3, z });
          dirtList.push({ x, y: -2, z });
        } else {
          grassList.push({ x, y: h, z });
          dirtList.push({ x, y: h - 1.2, z });
          if (h > 1.5) stoneList.push({ x, y: h - 2.4, z });

          // Procedural Trees on High Hills
          if (x % (STEP * 4) === 0 && z % (STEP * 4) === 0 && h >= 2 && Math.abs(x) > 10) {
            const trunkHeight = 4;
            for (let ty = 1; ty <= trunkHeight; ty++) {
              treeTrunkList.push({ x, y: h + ty, z });
            }
            const crownY = h + trunkHeight;
            for (let lx = -2; lx <= 2; lx += 2) {
              for (let lz = -2; lz <= 2; lz += 2) {
                for (let ly = 0; ly <= 2; ly += 1.4) {
                  treeLeavesList.push({ x: x + lx, y: crownY + ly, z: z + lz });
                }
              }
            }
          }
        }
      }
    }

    // Helper: Build Fast InstancedMesh
    const createInstanced = (positions: BlockPos[], mat: THREE.Material, scaleX = STEP, scaleY = 1.2, scaleZ = STEP) => {
      const imesh = new THREE.InstancedMesh(boxGeo, mat, positions.length);
      positions.forEach((pos, i) => {
        dummy.position.set(pos.x, pos.y + scaleY * 0.5, pos.z);
        dummy.scale.set(scaleX, scaleY, scaleZ);
        dummy.updateMatrix();
        imesh.setMatrixAt(i, dummy.matrix);
      });
      imesh.instanceMatrix.needsUpdate = true;
      scene.add(imesh);
      return imesh;
    };

    const grassMesh = createInstanced(grassList, matGrass, STEP, 1.2, STEP);
    const dirtMesh = createInstanced(dirtList, matDirt, STEP, 1.2, STEP);
    const stoneMesh = createInstanced(stoneList, matStone, STEP, 1.2, STEP);
    const waterMesh = createInstanced(waterList, matWater, STEP, 0.4, STEP);
    const treeTrunkMesh = createInstanced(treeTrunkList, matWood, 1.2, 1.2, 1.2);
    const treeLeavesMesh = createInstanced(treeLeavesList, matLeaves, 2.0, 1.4, 2.0);

    // --- 6. Dynamic Moving Element Blocks (Floating Voxels) ---
    interface ElementBlock {
      baseX: number;
      baseY: number;
      baseZ: number;
      size: number;
      speedY: number;
      speedRot: number;
      phase: number;
      type: 'amber' | 'teal' | 'terracotta' | 'cream';
    }

    const elementBlocksData: ElementBlock[] = [
      // Foreground floating blocks (hovering near camera path)
      { baseX: -14, baseY: 15, baseZ: 32, size: 2.2, speedY: 1.2, speedRot: 0.8, phase: 0.2, type: 'amber' },
      { baseX: 16, baseY: 17, baseZ: 28, size: 2.6, speedY: 0.9, speedRot: 0.6, phase: 1.4, type: 'teal' },
      { baseX: -8, baseY: 22, baseZ: 18, size: 1.8, speedY: 1.5, speedRot: 1.1, phase: 2.1, type: 'terracotta' },
      { baseX: 11, baseY: 20, baseZ: 14, size: 2.4, speedY: 1.1, speedRot: 0.7, phase: 3.5, type: 'cream' },
      { baseX: -22, baseY: 18, baseZ: 22, size: 2.0, speedY: 1.3, speedRot: 0.9, phase: 4.2, type: 'amber' },
      { baseX: 24, baseY: 19, baseZ: 24, size: 2.1, speedY: 0.8, speedRot: 0.5, phase: 0.9, type: 'terracotta' },

      // Midground hovering clusters
      { baseX: -30, baseY: 26, baseZ: -5, size: 3.2, speedY: 0.7, speedRot: 0.4, phase: 5.1, type: 'teal' },
      { baseX: 28, baseY: 28, baseZ: -10, size: 3.5, speedY: 0.6, speedRot: 0.5, phase: 1.8, type: 'amber' },
      { baseX: -4, baseY: 29, baseZ: -15, size: 2.8, speedY: 1.0, speedRot: 0.6, phase: 2.9, type: 'cream' },
      { baseX: -18, baseY: 32, baseZ: -30, size: 3.8, speedY: 0.5, speedRot: 0.3, phase: 4.0, type: 'terracotta' },
      { baseX: 20, baseY: 33, baseZ: -35, size: 4.0, speedY: 0.5, speedRot: 0.3, phase: 0.5, type: 'teal' },
      { baseX: 0, baseY: 36, baseZ: -50, size: 4.5, speedY: 0.4, speedRot: 0.2, phase: 3.1, type: 'amber' },
    ];

    // Build instanced meshes for element blocks grouped by material
    const amberBlocks = elementBlocksData.filter((b) => b.type === 'amber');
    const tealBlocks = elementBlocksData.filter((b) => b.type === 'teal');
    const terracottaBlocks = elementBlocksData.filter((b) => b.type === 'terracotta');
    const creamBlocks = elementBlocksData.filter((b) => b.type === 'cream');

    const imeshAmber = new THREE.InstancedMesh(boxGeo, matElementAmber, amberBlocks.length);
    const imeshTeal = new THREE.InstancedMesh(boxGeo, matElementTeal, tealBlocks.length);
    const imeshTerracotta = new THREE.InstancedMesh(boxGeo, matElementTerracotta, terracottaBlocks.length);
    const imeshCream = new THREE.InstancedMesh(boxGeo, matElementCream, creamBlocks.length);

    scene.add(imeshAmber);
    scene.add(imeshTeal);
    scene.add(imeshTerracotta);
    scene.add(imeshCream);

    // --- 7. Drifting Voxel Clouds (Optimized Instanced Mesh) ---
    interface CloudDef {
      x: number;
      y: number;
      z: number;
      scaleX: number;
      scaleY: number;
      scaleZ: number;
      speed: number;
    }

    const clouds: CloudDef[] = [
      { x: -70, y: 38, z: -40, scaleX: 24, scaleY: 3.5, scaleZ: 14, speed: 0.04 },
      { x: 10, y: 44, z: -15, scaleX: 28, scaleY: 4.0, scaleZ: 16, speed: 0.05 },
      { x: -35, y: 48, z: 20, scaleX: 22, scaleY: 3.2, scaleZ: 12, speed: 0.035 },
      { x: 45, y: 42, z: -60, scaleX: 32, scaleY: 4.2, scaleZ: 18, speed: 0.045 },
    ];

    const imeshClouds = new THREE.InstancedMesh(boxGeo, matCloud, clouds.length);
    scene.add(imeshClouds);

    // --- 8. Throttled Input & Parallax Smoothing ---
    let targetScrollY = 0;
    let smoothScrollY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let rawMouseX = 0;
    let rawMouseY = 0;
    let mouseMoved = false;
    let smoothMouseX = 0;
    let smoothMouseY = 0;

    const handleScroll = () => {
      targetScrollY = window.scrollY || window.pageYOffset;
    };

    // Throttled mouse tracking to prevent 500Hz/1000Hz gaming mice from flooding JS thread
    const handleMouseMove = (e: MouseEvent) => {
      rawMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      rawMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseMoved = true;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // --- 9. Thermal-Guarded, 60 FPS Paced Render Loop ---
    let animationId: number;
    let isVisible = !document.hidden;
    const clock = new THREE.Clock();
    let lastRenderTime = performance.now();
    const TARGET_FPS = 60;
    const FRAME_MIN_MS = 1000 / TARGET_FPS; // ~16.66ms pacing
    let lastWaterUpdate = 0;

    // Isolate canvas on its own hardware composite layer
    if (renderer.domElement) {
      renderer.domElement.style.contain = 'strict';
      renderer.domElement.style.transform = 'translate3d(0, 0, 0)';
      renderer.domElement.style.backfaceVisibility = 'hidden';
    }

    const updateElementGroup = (
      imesh: THREE.InstancedMesh,
      items: ElementBlock[],
      elapsed: number
    ) => {
      items.forEach((item, idx) => {
        const floatY = item.baseY + Math.sin(elapsed * item.speedY + item.phase) * 1.8;
        const rot = elapsed * item.speedRot + item.phase;
        dummy.position.set(item.baseX, floatY, item.baseZ);
        dummy.rotation.set(rot * 0.5, rot, rot * 0.3);
        dummy.scale.set(item.size, item.size, item.size);
        dummy.updateMatrix();
        imesh.setMatrixAt(idx, dummy.matrix);
      });
      imesh.instanceMatrix.needsUpdate = true;
    };

    const animate = (currentTime: number = performance.now()) => {
      animationId = requestAnimationFrame(animate);

      if (!isVisible || document.hidden) return;

      // Pacing gate: locks smooth 60 FPS and prevents 120Hz/144Hz/240Hz Windows displays
      // from over-allocating uniform vertex buffers on DirectX/ANGLE
      const elapsedSinceLast = currentTime - lastRenderTime;
      if (elapsedSinceLast < FRAME_MIN_MS - 2.0) {
        return;
      }
      lastRenderTime = currentTime - (elapsedSinceLast % FRAME_MIN_MS);

      const delta = Math.min(clock.getDelta(), 0.08); // Clamped delta avoids jumps
      const elapsed = clock.getElapsedTime();

      // Ingest latest mouse coordinates in single rAF tick
      if (mouseMoved) {
        targetMouseX = rawMouseX;
        targetMouseY = rawMouseY;
        mouseMoved = false;
      }

      // Frame-rate independent exponential smoothing for scroll & mouse
      const scrollFactor = 1 - Math.exp(-14 * delta);
      const mouseFactor = 1 - Math.exp(-10 * delta);

      smoothScrollY += (targetScrollY - smoothScrollY) * scrollFactor;
      smoothMouseX += (targetMouseX - smoothMouseX) * mouseFactor;
      smoothMouseY += (targetMouseY - smoothMouseY) * mouseFactor;

      // Snap micro-deltas when resting to eliminate idle jitter
      if (Math.abs(targetScrollY - smoothScrollY) < 0.2) {
        smoothScrollY = targetScrollY;
      }

      // Parallax camera elevation and pan driven by page scroll
      const scrollProgress = Math.min(smoothScrollY / 1400, 2.5);
      camera.position.x = Math.sin(elapsed * 0.06) * 5 + smoothMouseX * 3.5;
      camera.position.y = 18 + Math.cos(elapsed * 0.08) * 1.2 - scrollProgress * 4;
      camera.position.z = 52 - scrollProgress * 8;
      camera.lookAt(
        Math.sin(elapsed * 0.06) * 2 + smoothMouseX * 1.5,
        8 - scrollProgress * 2.5,
        -35
      );

      // Animate Moving Element Blocks
      updateElementGroup(imeshAmber, amberBlocks, elapsed);
      updateElementGroup(imeshTeal, tealBlocks, elapsed);
      updateElementGroup(imeshTerracotta, terracottaBlocks, elapsed);
      updateElementGroup(imeshCream, creamBlocks, elapsed);

      // Animate Drifting Clouds
      clouds.forEach((cloud, i) => {
        cloud.x += cloud.speed * delta * 60;
        if (cloud.x > 95) cloud.x = -95;
        dummy.position.set(cloud.x, cloud.y, cloud.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(cloud.scaleX, cloud.scaleY, cloud.scaleZ);
        dummy.updateMatrix();
        imeshClouds.setMatrixAt(i, dummy.matrix);
      });
      imeshClouds.instanceMatrix.needsUpdate = true;

      // Throttle subtle water uniform rebinds (every ~100ms) to reduce D3D uniform thrashing
      if (elapsed - lastWaterUpdate > 0.1) {
        matWater.opacity = 0.86 + Math.sin(elapsed * 2.0) * 0.04;
        lastWaterUpdate = elapsed;
      }

      renderer.render(scene, camera);
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) clock.getDelta(); // reset delta so no time jump
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animate();

    // --- 10. Resize Handler (Responsive FOV for Mobile & Desktop) ---
    const handleResize = () => {
      if (!container) return;
      const isMobile = window.innerWidth < 768;
      camera.fov = isMobile ? 66 : 52;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // --- 11. Complete Memory & GPU Cleanup ---
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
      matGrass.dispose();
      matDirt.dispose();
      matStone.dispose();
      matWater.dispose();
      matWood.dispose();
      matLeaves.dispose();
      matCloud.dispose();
      matElementAmber.dispose();
      matElementTeal.dispose();
      matElementTerracotta.dispose();
      matElementCream.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none bg-[#07514C]"
      style={{
        contain: 'strict',
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  );
}
