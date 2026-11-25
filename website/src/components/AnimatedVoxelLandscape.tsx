'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface Cloud {
  id: number;
  top: number;
  left: number;
  size: number;
  speed: number;
  opacity: number;
}

export function AnimatedVoxelLandscape() {
  const [clouds, setClouds] = useState<Cloud[]>([]);

  useEffect(() => {
    const initialClouds: Cloud[] = [
      { id: 1, top: 10, left: -15, size: 52, speed: 40, opacity: 0.95 },
      { id: 2, top: 16, left: 25, size: 68, speed: 55, opacity: 0.9 },
      { id: 3, top: 8, left: 58, size: 48, speed: 45, opacity: 0.85 },
      { id: 4, top: 22, left: 75, size: 42, speed: 38, opacity: 0.88 },
      { id: 5, top: 14, left: -30, size: 60, speed: 50, opacity: 0.9 },
    ];
    setClouds(initialClouds);
  }, []);

  return (
    <div className="relative w-full border-4 border-[#212121] shadow-pixel-lg bg-[#07514C] overflow-hidden">
      {/* Top Arcade Screen Glass Bevel */}
      <div className="relative w-full aspect-[16/9] min-h-[380px] max-h-[620px] select-none overflow-hidden">
        {/* Real Voxel Minecraft Landscape Image */}
        <Image
          src="/voxel-world.jpg"
          alt="VoxQuest Minecraft Voxel Realm"
          fill
          priority
          className="object-cover object-center filter saturate-110 contrast-105"
        />

        {/* Floating Stepped Voxel Clouds Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {clouds.map((cloud) => (
            <div
              key={cloud.id}
              className="absolute animate-float-cloud flex items-center justify-center"
              style={{
                top: `${cloud.top}%`,
                left: `${cloud.left}%`,
                animationDuration: `${cloud.speed}s`,
                opacity: cloud.opacity,
              }}
            >
              {/* Authentic Minecraft Cloud Geometry */}
              <div className="relative">
                <div
                  className="bg-[#FFFCE6] border-2 border-[#212121] shadow-pixel-sm"
                  style={{
                    width: `${cloud.size}px`,
                    height: `${cloud.size * 0.45}px`,
                  }}
                />
                <div
                  className="absolute -top-[6px] left-[15%] bg-[#FFFCE6] border-t-2 border-x-2 border-[#212121]"
                  style={{
                    width: `${cloud.size * 0.6}px`,
                    height: '8px',
                  }}
                />
                <div
                  className="absolute -bottom-[5px] left-[30%] bg-[#DFDFD4] border-b-2 border-x-2 border-[#212121]"
                  style={{
                    width: `${cloud.size * 0.4}px`,
                    height: '6px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Ambient Atmosphere & Caustics */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#07514C]/30 via-transparent to-[#DDA44D]/10" />

        {/* Swaying Yellow Voxel Flowers */}
        <div className="absolute bottom-[9%] left-[17%] pointer-events-none animate-sway origin-bottom">
          <div className="w-5 h-5 bg-[#DDA44D] border-2 border-[#212121] flex items-center justify-center">
            <div className="w-2 h-2 bg-[#FFFCE6]" />
          </div>
          <div className="w-1.5 h-4 bg-[#07514C] mx-auto border-x-2 border-[#212121]" />
        </div>

        <div className="absolute bottom-[16%] right-[24%] pointer-events-none animate-sway-delayed origin-bottom">
          <div className="w-5 h-5 bg-[#DDA44D] border-2 border-[#212121] flex items-center justify-center">
            <div className="w-2 h-2 bg-[#FFFCE6]" />
          </div>
          <div className="w-1.5 h-4 bg-[#07514C] mx-auto border-x-2 border-[#212121]" />
        </div>

        {/* Arcade HUD Overlay Badges */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex flex-col gap-2">
          <div className="arcade-badge bg-[#DFDFD4] text-[#212121] border-2 border-[#212121] shadow-pixel-sm">
            <span className="w-2 h-2 bg-[#DA6C4C] animate-ping" />
            <span>OVERWORLD &middot; SEED 20261030</span>
          </div>
          <div className="arcade-badge bg-[#DDA44D] text-[#212121] border-2 border-[#212121] shadow-pixel-sm hidden sm:inline-flex">
            <span>BIOME: TEAL VALLEY</span>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20">
          <div className="arcade-panel bg-[#DFDFD4]/95 p-3 flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-[#07514C] border border-[#212121] animate-spin" />
            <div className="text-[10px] font-pixel text-[#212121]">
              FPS: 60 &middot; CHUNKS LOADED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
