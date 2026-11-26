'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Apple, 
  Monitor, 
  Terminal, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone,
  X 
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
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
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
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();

    const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
    setIsMobileDevice(isMobile);

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

  // 2. Initiate Direct Binary Download
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
    <div className="w-full space-y-8 sm:space-y-10 font-sans">
      {/* Mobile Notice if user is browsing from a phone */}
      {isMobileDevice && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#07514C]/90 border border-[#DDA44D]/40 text-white flex items-start gap-3 shadow-lg">
          <div className="p-2 bg-[#DDA44D] text-[#212121] rounded-xl shrink-0 mt-0.5">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-xs">
            <span className="font-bold text-[#DDA44D] uppercase font-mono tracking-wider">
              Mobile Browser Detected
            </span>
            <p className="text-white/85 leading-relaxed">
              VoxQuest desktop client is designed for macOS, Windows, and Linux. For Android smartphones, install the native companion build with the floating trigger bubble.
            </p>
          </div>
        </div>
      )}

      {/* HERO AUTO-DETECTED PLATFORM CARD */}
      <div className="p-5 sm:p-8 md:p-10 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/15 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#DDA44D]/20 text-[#DDA44D] font-mono text-[11px] font-bold rounded-full border border-[#DDA44D]/40">
                <span className="w-2 h-2 rounded-full bg-[#DDA44D] animate-pulse inline-block" />
                <span>RECOMMENDED FOR YOUR SYSTEM</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-mono text-[11px] font-bold">
                {detectedPlatform.badge}
              </span>
            </div>

            <h2 className="font-pixel text-base sm:text-xl text-white tracking-tight leading-relaxed">
              {detectedPlatform.name}
            </h2>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-2xl">
              Native application installer optimized for your hardware. Runs 100% on-device with zero cloud streaming and complete offline Whisper voice dictation.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] sm:text-xs text-white/70">
              <span className="flex items-center gap-1.5 text-white">
                <ShieldCheck className="w-4 h-4 text-[#DDA44D]" />
                Format: <strong>{detectedPlatform.format}</strong>
              </span>
              <span>&bull;</span>
              <span>Arch: <strong>{detectedPlatform.architecture}</strong></span>
              <span>&bull;</span>
              <span className="text-[#DDA44D] font-bold">Direct Standalone Binary</span>
            </div>
          </div>

          {/* Primary Direct Download Action */}
          <div className="w-full md:w-auto flex flex-col items-stretch gap-2.5 shrink-0">
            <button
              onClick={() => handleDownload(detectedPlatform)}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-[#DDA44D] to-[#C99039] hover:from-[#E5B25F] hover:to-[#DDA44D] text-[#212121] font-pixel text-[10px] sm:text-[11px] tracking-wide shadow-xl hover:shadow-[#DDA44D]/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5 text-[#212121]" />
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
          <span>All OS Releases</span>
          <span>Offline Packages</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(platforms) as PlatformKey[]).map((key) => {
            const p = platforms[key];
            const isSelected = key === detectedKey;

            return (
              <div
                key={p.id}
                className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white/[0.08] border-[#DDA44D]/60 shadow-lg ring-1 ring-[#DDA44D]/30'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                    <div className="flex items-center gap-2">
                      {p.osFamily === 'mac' && <Apple className="w-4 h-4 sm:w-5 sm:h-5 text-[#DDA44D]" />}
                      {p.osFamily === 'windows' && <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />}
                      {p.osFamily === 'linux' && <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />}
                      <span className="font-pixel text-[11px] sm:text-xs text-white">{p.name}</span>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#DDA44D]/20 text-[#DDA44D] border border-[#DDA44D]/40 shrink-0">
                        DETECTED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/70 font-mono mb-4">
                    {p.format} &bull; {p.architecture}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
                  <span className="text-[10px] sm:text-[11px] font-mono text-white/50 truncate">{p.checksum}</span>
                  <button
                    onClick={() => handleDownload(p)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
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
          <div className="relative w-full max-w-lg p-5 sm:p-8 rounded-2xl bg-[#0D2422] border border-white/20 text-white shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDownloadModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DDA44D]/20 text-[#DDA44D] border border-[#DDA44D]/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Download Initiated!
                </h3>
                <p className="text-[11px] sm:text-xs text-white/70 font-mono truncate max-w-[240px] sm:max-w-none">
                  {downloadModal.platform.recommendedFilename}
                </p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-2 text-xs">
              <div className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">
                Setup Instructions ({downloadModal.platform.name})
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-white/80 leading-relaxed font-sans">
                {downloadModal.platform.instructions.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1">
              <a
                href={downloadModal.platform.directDownloadUrl}
                download={downloadModal.platform.recommendedFilename}
                className="text-[#DDA44D] hover:underline font-mono text-center sm:text-left"
              >
                Download didn't start? Click here &rarr;
              </a>
              <button
                onClick={() => setDownloadModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-[#212121] font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
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
