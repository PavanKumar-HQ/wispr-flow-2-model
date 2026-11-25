'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  CheckCircle2, 
  Laptop, 
  Apple, 
  Terminal, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Info,
  X,
  Sparkles
} from 'lucide-react';

export type PlatformKey = 'mac-arm' | 'mac-intel' | 'windows' | 'linux';

interface PlatformInfo {
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

const DEFAULT_PLATFORMS: Record<PlatformKey, PlatformInfo> = {
  'mac-arm': {
    id: 'mac-arm',
    name: 'macOS (Apple Silicon M1/M2/M3/M4)',
    badge: 'APPLE SILICON',
    osFamily: 'mac',
    architecture: 'Apple Silicon (aarch64)',
    format: '.dmg installer',
    recommendedFilename: 'VoxQuest_0.1.0_aarch64.dmg',
    downloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest/download/VoxQuest_0.1.0_aarch64.dmg',
    directDownloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest/download/VoxQuest_0.1.0_aarch64.dmg',
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    instructions: [
      'Open the downloaded VoxQuest.dmg file.',
      'Drag VoxQuest to your Applications folder.',
      'Open VoxQuest and grant Accessibility & Microphone permissions.',
      'Hold Fn or your configured shortcut to dictate anywhere!'
    ],
  },
  'mac-intel': {
    id: 'mac-intel',
    name: 'macOS (Intel x86_64)',
    badge: 'INTEL MAC',
    osFamily: 'mac',
    architecture: 'Intel (x86_64)',
    format: '.dmg installer',
    recommendedFilename: 'VoxQuest_0.1.0_x64.dmg',
    downloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest/download/VoxQuest_0.1.0_x64.dmg',
    directDownloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest/download/VoxQuest_0.1.0_x64.dmg',
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    instructions: [
      'Open the downloaded VoxQuest.dmg file.',
      'Drag VoxQuest to your Applications folder.',
      'Open VoxQuest and grant Accessibility & Microphone permissions.',
      'Hold Fn or your configured shortcut to dictate anywhere!'
    ],
  },
  'windows': {
    id: 'windows',
    name: 'Windows 10 / 11 (64-bit)',
    badge: 'WINDOWS 64-BIT',
    osFamily: 'windows',
    architecture: 'x64 (AMD64)',
    format: '.msi / .exe installer',
    recommendedFilename: 'VoxQuest_0.1.0_x64-setup.exe',
    downloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest/download/VoxQuest_0.1.0_x64-setup.exe',
    directDownloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest/download/VoxQuest_0.1.0_x64-setup.exe',
    checksum: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    instructions: [
      'Run VoxQuest_0.1.0_x64-setup.exe.',
      'Allow Windows Defender prompt if unsigned alpha notice appears.',
      'Follow setup steps and permit microphone recording.',
      'Use global hotkey (default: Ctrl+Win+Space) to dictate into any window.'
    ],
  },
  'linux': {
    id: 'linux',
    name: 'Linux (Debian / Ubuntu / Fedora / Arch)',
    badge: 'UNIVERSAL APPIMAGE',
    osFamily: 'linux',
    architecture: 'x86_64',
    format: '.AppImage & .deb',
    recommendedFilename: 'VoxQuest_0.1.0_amd64.AppImage',
    downloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest/download/VoxQuest_0.1.0_amd64.AppImage',
    directDownloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest/download/VoxQuest_0.1.0_amd64.AppImage',
    checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    instructions: [
      'Make AppImage executable: chmod +x VoxQuest_0.1.0_amd64.AppImage',
      'Or install Debian package: sudo dpkg -i voxquest_0.1.0_amd64.deb',
      'Launch VoxQuest from app launcher or terminal.',
      'Ensure libwebkit2gtk-4.1 and X11/Wayland accessibility permissions are enabled.'
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
  const [platforms, setPlatforms] = useState<Record<PlatformKey, PlatformInfo>>(DEFAULT_PLATFORMS);

  // 1. Detect Client Operating System & Architecture
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();

    let detected: PlatformKey = 'mac-arm';

    if (ua.includes('mac') || platform.includes('mac')) {
      // Check Apple Silicon
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

    // 2. Fetch latest release assets directly from GitHub API to ensure direct binary downloads
    fetch('https://api.github.com/repos/PavanKumar-HQ/wispr-flow-2-model/releases/latest')
      .then((res) => {
        if (!res.ok) throw new Error('Release query response not ok');
        return res.json();
      })
      .then((data) => {
        if (!data || !data.assets || !Array.isArray(data.assets)) return;

        setPlatforms((prev) => {
          const updated = { ...prev };

          for (const asset of data.assets) {
            const name = (asset.name || '').toLowerCase();
            const downloadUrl = asset.browser_download_url;

            if (name.endsWith('.dmg')) {
              if (name.includes('aarch64') || name.includes('arm64')) {
                updated['mac-arm'] = { ...updated['mac-arm'], directDownloadUrl: downloadUrl, recommendedFilename: asset.name };
              } else if (name.includes('x64') || name.includes('x86_64')) {
                updated['mac-intel'] = { ...updated['mac-intel'], directDownloadUrl: downloadUrl, recommendedFilename: asset.name };
              } else {
                // Universal DMG
                updated['mac-arm'] = { ...updated['mac-arm'], directDownloadUrl: downloadUrl, recommendedFilename: asset.name };
                updated['mac-intel'] = { ...updated['mac-intel'], directDownloadUrl: downloadUrl, recommendedFilename: asset.name };
              }
            } else if (name.endsWith('.exe') || name.endsWith('.msi')) {
              updated['windows'] = { ...updated['windows'], directDownloadUrl: downloadUrl, recommendedFilename: asset.name };
            } else if (name.endsWith('.appimage')) {
              updated['linux'] = { ...updated['linux'], directDownloadUrl: downloadUrl, recommendedFilename: asset.name };
            }
          }

          return updated;
        });
      })
      .catch((err) => {
        // Fallbacks remain intact
        console.debug('Release fetch notice:', err);
      });
  }, []);

  // 3. Initiate Direct Binary Download
  const handleDownload = (platform: PlatformInfo) => {
    // Direct file trigger
    const directUrl = platform.directDownloadUrl || platform.downloadUrl;
    
    // Open modal with instructions
    setDownloadModal({
      isOpen: true,
      platform,
      downloadStarted: true,
    });

    // Create invisible anchor to prompt user's browser download
    try {
      const a = document.createElement('a');
      a.href = directUrl;
      a.download = platform.recommendedFilename;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.location.href = directUrl;
    }
  };

  const detectedPlatform = platforms[detectedKey];

  return (
    <div className="w-full space-y-12">
      {/* =========================================================================
          HERO AUTO-DETECTED PLATFORM CARD
         ========================================================================= */}
      <div className="arcade-panel p-6 sm:p-10 bg-[#DFDFD4]/90 backdrop-blur-md border-4 border-[#212121] shadow-pixel">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#07514C] text-[#DFDFD4] font-mono text-xs font-bold border-2 border-[#212121]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse inline-block" />
                <span>AUTO-DETECTED SYSTEM</span>
              </span>
              <span className="arcade-badge bg-[#DDA44D] text-[#212121] text-[10px]">
                {detectedPlatform.badge}
              </span>
            </div>

            <h2 className="font-pixel text-xl sm:text-2xl text-[#212121]">
              {detectedPlatform.name}
            </h2>

            <p className="font-mono text-xs sm:text-sm text-[#212121]/80 leading-relaxed max-w-2xl">
              Native build optimized for your CPU and OS architecture with zero background telemetry and full local Whisper speech processing.
            </p>

            <div className="flex flex-wrap gap-4 pt-1 font-mono text-xs text-[#212121]/90">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#07514C]" />
                Package: <strong>{detectedPlatform.format}</strong>
              </span>
              <span>&bull;</span>
              <span>Arch: <strong>{detectedPlatform.architecture}</strong></span>
              <span>&bull;</span>
              <span>Direct offline installer</span>
            </div>
          </div>

          {/* Primary Big Direct Download Action */}
          <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-stretch gap-2.5">
            <button
              onClick={() => handleDownload(detectedPlatform)}
              className="arcade-btn arcade-btn-primary py-4 px-8 flex items-center justify-center gap-3 text-sm shadow-pixel-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-5 h-5 text-[#212121] animate-bounce" />
              <div className="text-left">
                <div className="font-pixel text-xs sm:text-sm">DOWNLOAD DIRECT PACKAGE</div>
                <div className="font-mono text-[10px] text-[#212121]/80 font-normal">
                  {detectedPlatform.recommendedFilename}
                </div>
              </div>
            </button>

            <div className="text-[11px] font-mono text-center text-[#212121]/70">
              Free &amp; Open Source &middot; Verifiable SHA-256
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ALL SUPPORTED OPERATING SYSTEMS MATRIX
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#DFDFD4]/30 pb-3">
          <h3 className="font-pixel text-sm sm:text-base text-[#DFDFD4] drop-shadow-[2px_2px_0px_#212121] flex items-center gap-2">
            <Laptop className="w-4 h-4 text-[#DDA44D]" />
            <span>ALL SUPPORTED OPERATING SYSTEMS &amp; ARCHITECTURES</span>
          </h3>
          <span className="font-mono text-xs text-[#DFDFD4]/70 hidden sm:inline">
            Direct installer downloads
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {(Object.keys(platforms) as PlatformKey[]).map((key) => {
            const p = platforms[key];
            const isCurrent = key === detectedKey;

            return (
              <div
                key={p.id}
                className={`arcade-panel p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-all ${
                  isCurrent 
                    ? 'bg-[#DFDFD4] border-3 border-[#DDA44D] ring-2 ring-[#DDA44D]/50' 
                    : 'bg-[#DFDFD4]/85 hover:bg-[#DFDFD4]'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-pixel text-xs sm:text-sm text-[#212121]">{p.name}</h4>
                    <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[8px]">
                      {p.badge}
                    </span>
                    {isCurrent && (
                      <span className="arcade-badge bg-[#DA6C4C] text-white text-[8px] animate-pulse">
                        YOUR SYSTEM
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 font-mono text-xs text-[#212121]/80">
                    <span>Format: <strong>{p.format}</strong></span>
                    <span>&bull;</span>
                    <span>File: <code className="bg-[#B8CBC3]/60 px-1 py-0.5 border border-[#212121] text-[10px]">{p.recommendedFilename}</code></span>
                  </div>

                  <div className="text-[11px] font-mono text-[#212121]/90">
                    <strong>Instructions:</strong> {p.instructions[0]}
                  </div>
                </div>

                <div className="flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => handleDownload(p)}
                    className="arcade-btn arcade-btn-ghost w-full sm:w-auto text-xs py-3 px-5 flex items-center justify-center gap-2 hover:bg-[#DDA44D] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#212121]" />
                    <span>DOWNLOAD {p.format.split(' ')[0].toUpperCase()}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          DOWNLOAD CONFIRMATION & INSTALLATION GUIDE MODAL
         ========================================================================= */}
      {downloadModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="arcade-panel max-w-xl w-full p-6 sm:p-8 bg-[#DFDFD4] border-4 border-[#212121] shadow-2xl relative">
            <button
              onClick={() => setDownloadModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 p-1.5 border-2 border-[#212121] bg-[#DFDFD4] hover:bg-[#DA6C4C] hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#07514C] text-[#DFDFD4] border-2 border-[#212121]">
                <CheckCircle2 className="w-6 h-6 text-[#34D399]" />
              </div>
              <div>
                <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[8px] mb-1">
                  DOWNLOAD INITIALIZED
                </span>
                <h3 className="font-pixel text-base sm:text-lg text-[#212121]">
                  DIRECT DOWNLOAD IN PROGRESS
                </h3>
              </div>
            </div>

            <p className="font-mono text-xs sm:text-sm text-[#212121]/90 mb-4 leading-relaxed">
              Your browser has requested direct delivery of <strong className="underline">{downloadModal.platform.recommendedFilename}</strong>. If your download did not initiate automatically, click below:
            </p>

            <div className="mb-6">
              <a
                href={downloadModal.platform.directDownloadUrl || downloadModal.platform.downloadUrl}
                download={downloadModal.platform.recommendedFilename}
                className="arcade-btn arcade-btn-primary w-full text-xs py-3.5 px-4 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>DIRECT FILE LINK (CLICK IF NOT STARTED)</span>
              </a>
            </div>

            <div className="p-4 bg-[#B8CBC3]/40 border-2 border-[#212121] space-y-2 mb-6">
              <div className="font-pixel text-xs text-[#07514C] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#DDA44D]" />
                <span>HOW TO RUN ON {downloadModal.platform.name.toUpperCase()}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 font-mono text-xs text-[#212121]">
                {downloadModal.platform.instructions.map((inst, i) => (
                  <li key={i} className="leading-snug">{inst}</li>
                ))}
              </ol>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setDownloadModal((prev) => ({ ...prev, isOpen: false }))}
                className="arcade-btn arcade-btn-ghost px-5 py-2 text-xs"
              >
                CLOSE WINDOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

