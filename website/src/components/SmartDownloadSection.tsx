'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Apple, 
  Monitor, 
  Terminal, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  Info,
  X,
  FileCheck
} from 'lucide-react';

export type PlatformKey = 'mac-arm' | 'mac-intel' | 'windows' | 'linux';

export interface PlatformInfo {
  id: PlatformKey;
  name: string;
  badge: string;
  osFamily: 'mac' | 'windows' | 'linux';
  architecture: string;
  format: string;
  recommendedFilename: string;
  downloadUrl: string;
  directDownloadUrl: string;
  checksum: string;
  instructions: string[];
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const DEFAULT_PLATFORMS: Record<PlatformKey, PlatformInfo> = {
  'mac-arm': {
    id: 'mac-arm',
    name: 'macOS (Apple Silicon M1/M2/M3/M4)',
    badge: 'APPLE SILICON',
    osFamily: 'mac',
    architecture: 'Apple Silicon (aarch64)',
    format: '.dmg installer (6.0 MB)',
    recommendedFilename: 'VoxQuest_0.1.0_aarch64.dmg',
    downloadUrl: `${basePath}/downloads/VoxQuest_0.1.0_aarch64.dmg`,
    directDownloadUrl: `${basePath}/downloads/VoxQuest_0.1.0_aarch64.dmg`,
    checksum: 'Verified Native Binary &bull; 6.0 MB',
    instructions: [
      'Open the downloaded VoxQuest_0.1.0_aarch64.dmg file.',
      'Drag VoxQuest to your Applications folder.',
      'Open VoxQuest and grant Accessibility & Microphone permissions when prompted.',
      'Press shortcut or click the floating pill to dictate anywhere!'
    ],
  },
  'mac-intel': {
    id: 'mac-intel',
    name: 'macOS (Intel x86_64)',
    badge: 'INTEL MAC',
    osFamily: 'mac',
    architecture: 'Intel (x86_64)',
    format: '.dmg installer (6.0 MB)',
    recommendedFilename: 'VoxQuest_0.1.0_x64.dmg',
    downloadUrl: `${basePath}/downloads/VoxQuest_0.1.0_x64.dmg`,
    directDownloadUrl: `${basePath}/downloads/VoxQuest_0.1.0_x64.dmg`,
    checksum: 'Verified Native Binary &bull; 6.0 MB',
    instructions: [
      'Open the downloaded VoxQuest_0.1.0_x64.dmg file.',
      'Drag VoxQuest to your Applications folder.',
      'Open VoxQuest and grant Accessibility & Microphone permissions.',
      'Press shortcut or click the floating pill to dictate anywhere!'
    ],
  },
  'windows': {
    id: 'windows',
    name: 'Windows 10 / 11 (64-bit)',
    badge: 'WINDOWS 64-BIT',
    osFamily: 'windows',
    architecture: 'x64 (AMD64)',
    format: '.exe installer',
    recommendedFilename: 'VoxQuest_0.1.0_x64-setup.exe',
    downloadUrl: `${basePath}/downloads/VoxQuest_0.1.0_x64-setup.exe`,
    directDownloadUrl: `${basePath}/downloads/VoxQuest_0.1.0_x64-setup.exe`,
    checksum: 'Direct Native Installer (NSIS)',
    instructions: [
      'Run the VoxQuest_0.1.0_x64-setup.exe installer.',
      'Follow the setup wizard to install VoxQuest into your user programs directory.',
      'Launch VoxQuest from your Desktop or Start Menu.',
      'Dictate into Notepad, VS Code, Slack, or any Windows application!'
    ],
  },
  'linux': {
    id: 'linux',
    name: 'Linux (Debian / Ubuntu / Fedora / Arch)',
    badge: 'UNIVERSAL APPIMAGE',
    osFamily: 'linux',
    architecture: 'x86_64',
    format: '.AppImage',
    recommendedFilename: 'VoxQuest_0.1.0_amd64.AppImage',
    downloadUrl: `${basePath}/downloads/VoxQuest_0.1.0_amd64.AppImage`,
    directDownloadUrl: `${basePath}/downloads/VoxQuest_0.1.0_amd64.AppImage`,
    checksum: 'Direct Native Package',
    instructions: [
      'Make the package executable: chmod +x VoxQuest*.AppImage',
      'Launch VoxQuest from application launcher or terminal.',
      'Ensure audio input and accessibility permissions are active.'
    ],
  },
};

export function SmartDownloadSection() {
  const [detectedKey, setDetectedKey] = useState<PlatformKey>('mac-arm');
  const [isClient, setIsClient] = useState(false);
  const [downloadModal, setDownloadModal] = useState<{
    isOpen: boolean;
    platform: PlatformInfo;
    downloadStarted: boolean;
  }>({
    isOpen: false,
    platform: DEFAULT_PLATFORMS['mac-arm'],
    downloadStarted: false,
  });
  const platforms = DEFAULT_PLATFORMS;

  // 1. Detect Client Operating System & Architecture
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();

    let detected: PlatformKey = 'mac-arm';

    if (ua.includes('mac') || platform.includes('mac')) {
      const isAppleSilicon = 
        navigator.maxTouchPoints > 2 || 
        ua.includes('arm64') || 
        (window as any)?.navigator?.userAgentData?.brands?.some((b: any) => b.brand?.toLowerCase().includes('apple'));
      
      detected = isAppleSilicon ? 'mac-arm' : 'mac-intel';
    } else if (ua.includes('win') || platform.includes('win')) {
      detected = 'windows';
    } else if (ua.includes('linux') || platform.includes('linux')) {
      detected = 'linux';
    }

    setDetectedKey(detected);
  }, []);

  // 2. Initiate Direct Binary Download (Served Directly from Website)
  const handleDownload = (platform: PlatformInfo) => {
    let directUrl = platform.directDownloadUrl || platform.downloadUrl;
    
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isSubpath = pathname.startsWith('/wispr-flow-2-model');
      if (isSubpath && !directUrl.startsWith('/wispr-flow-2-model')) {
        directUrl = `/wispr-flow-2-model${directUrl.startsWith('/') ? '' : '/'}${directUrl}`;
      } else if (!isSubpath && directUrl.startsWith('/wispr-flow-2-model')) {
        directUrl = directUrl.replace(/^\/wispr-flow-2-model/, '') || '/';
      }
    }

    setDownloadModal({
      isOpen: true,
      platform,
      downloadStarted: true,
    });

    try {
      const a = document.createElement('a');
      a.href = directUrl;
      a.download = platform.recommendedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.location.href = directUrl;
    }
  };

  const detectedPlatform = platforms[detectedKey];

  return (
    <div className="w-full space-y-10 font-sans">
      {/* HERO AUTO-DETECTED PLATFORM CARD */}
      <div className="p-8 sm:p-10 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/15 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold rounded-full border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>AUTO-DETECTED FOR YOUR SYSTEM</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#DDA44D]/20 text-[#DDA44D] border border-[#DDA44D]/40 font-mono text-xs font-bold">
                {detectedPlatform.badge}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {detectedPlatform.name}
            </h2>

            <p className="text-sm text-white/80 leading-relaxed max-w-2xl">
              Native application installer optimized for your hardware. Runs 100% on-device with zero cloud streaming and complete offline Whisper voice dictation.
            </p>

            <div className="flex flex-wrap gap-4 pt-1 font-mono text-xs text-white/70">
              <span className="flex items-center gap-1.5 text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Format: <strong>{detectedPlatform.format}</strong>
              </span>
              <span>&bull;</span>
              <span>Arch: <strong>{detectedPlatform.architecture}</strong></span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-bold">Direct Software Download</span>
            </div>
          </div>

          {/* Primary Direct Download Action */}
          <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-stretch gap-2.5">
            <button
              onClick={() => handleDownload(detectedPlatform)}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#DDA44D] to-[#C99039] hover:from-[#E5B25F] hover:to-[#DDA44D] text-[#212121] font-bold text-sm tracking-wide shadow-xl hover:shadow-[#DDA44D]/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
            >
              <Download className="w-5 h-5 text-[#212121]" />
              <span>DOWNLOAD VOXQUEST FREE</span>
            </button>
            <div className="text-[11px] font-mono text-center text-white/60">
              Version 0.1.0 &middot; 6.0 MB &middot; Instant Download
            </div>
          </div>
        </div>
      </div>

      {/* ALL PLATFORMS CATALOG */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-white/70 uppercase px-1">
          <span>All Available OS Releases</span>
          <span>Offline Installers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(platforms) as PlatformKey[]).map((key) => {
            const p = platforms[key];
            const isSelected = key === detectedKey;

            return (
              <div
                key={p.id}
                className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white/[0.08] border-[#DDA44D]/60 shadow-lg ring-1 ring-[#DDA44D]/30'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {p.osFamily === 'mac' && <Apple className="w-5 h-5 text-[#DDA44D]" />}
                      {p.osFamily === 'windows' && <Monitor className="w-5 h-5 text-blue-400" />}
                      {p.osFamily === 'linux' && <Terminal className="w-5 h-5 text-amber-400" />}
                      <span className="font-bold text-sm text-white">{p.name}</span>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        YOUR OS
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/70 font-mono mb-4">
                    {p.format} &bull; {p.architecture}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-[11px] font-mono text-white/50">{p.checksum}</span>
                  <button
                    onClick={() => handleDownload(p)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-[#DDA44D]" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DOWNLOAD SUCCESS & INSTALLATION MODAL */}
      {downloadModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-[#0D2422] border border-white/20 text-white shadow-2xl space-y-5">
            <button
              onClick={() => setDownloadModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  Download Started!
                </h3>
                <p className="text-xs text-white/70 font-mono">
                  {downloadModal.platform.recommendedFilename} (6.0 MB)
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-2 text-xs">
              <div className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">
                Installation Steps ({downloadModal.platform.name})
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-white/80 leading-relaxed font-sans">
                {downloadModal.platform.instructions.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <a
                href={downloadModal.platform.directDownloadUrl}
                download={downloadModal.platform.recommendedFilename}
                className="text-[#DDA44D] hover:underline font-mono"
              >
                Download didn't start? Click here to retry &rarr;
              </a>
              <button
                onClick={() => setDownloadModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white text-[#212121] font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
