import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { Download, Terminal, Hash, ShieldCheck } from 'lucide-react';

export default function DownloadPage() {
  const releases = [
    {
      os: 'macOS (Apple Silicon & Intel)',
      badge: 'RECOMMENDED',
      version: 'v0.1.0',
      file: 'VoxQuest-universal.dmg',
      arch: 'Universal (arm64 + x64)',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      instructions: 'Drag VoxQuest to /Applications. Grant Accessibility and Microphone permissions in System Settings.',
      downloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest',
    },
    {
      os: 'Linux (Debian / Ubuntu / Fedora)',
      badge: 'APPIMAGE / DEB',
      version: 'v0.1.0',
      file: 'VoxQuest-x86_64.AppImage',
      arch: 'x86_64',
      checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      instructions: 'chmod +x VoxQuest-x86_64.AppImage && ./VoxQuest-x86_64.AppImage (or sudo dpkg -i voxquest.deb)',
      downloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest',
    },
    {
      os: 'Windows 10 / 11',
      badge: 'MSI / EXE',
      version: 'v0.1.0',
      file: 'VoxQuest-Setup-x64.msi',
      arch: 'x64',
      checksum: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
      instructions: 'Execute setup installer and permit microphone device access.',
      downloadUrl: 'https://github.com/PavanKumar-HQ/wispr-flow-2-model/releases/latest',
    }
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 3D Animated Minecraft Voxel Overworld Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">VERIFIED BUILDS</span>
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            DOWNLOAD VOXQUEST
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
            Get the full client to unlock push-to-talk, system-wide cursor text injection, and offline Whisper speech processing.
          </p>
        </div>

        <div className="space-y-6">
          {releases.map((rel) => (
            <div
              key={rel.os}
              className="arcade-panel arcade-panel-hoverable p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-[#DFDFD4]/85 backdrop-blur-md"
            >
              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-pixel text-sm sm:text-base text-[#212121]">{rel.os}</h3>
                  <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[8px]">{rel.badge}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-mono text-[#212121]/80">
                  <span>Version: <strong>{rel.version}</strong></span>
                  <span>&bull;</span>
                  <span>Arch: <strong>{rel.arch}</strong></span>
                  <span>&bull;</span>
                  <span>File: <code className="bg-[#B8CBC3]/50 px-1 py-0.5 border border-[#212121] text-[10px]">{rel.file}</code></span>
                </div>
                <p className="text-xs font-mono text-[#212121]/90 leading-relaxed pt-1">
                  <strong>Installation:</strong> {rel.instructions}
                </p>
                <div className="p-2.5 bg-[#B8CBC3]/40 border-2 border-[#212121] text-[10px] font-mono text-[#212121] truncate">
                  SHA-256: {rel.checksum}
                </div>
              </div>

              <div className="flex-shrink-0 w-full md:w-auto">
                <a
                  href={rel.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="arcade-btn arcade-btn-primary w-full md:w-auto text-xs py-3.5 px-6 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#212121]" />
                  <span>DOWNLOAD PACKAGE</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Source Build Instructions */}
        <div className="mt-12 arcade-panel-dark p-6 sm:p-8 bg-[#0F5B57]/80 backdrop-blur-md">
          <h3 className="font-pixel text-xs sm:text-sm text-[#DDA44D] mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#DDA44D]" />
            <span>BUILDING FROM VERIFIED SOURCE</span>
          </h3>
          <p className="text-xs font-mono text-[#DFDFD4] leading-relaxed mb-4">
            Prefer compiling natively on your own machine? Clone the open-source repository:
          </p>
          <pre className="p-4 bg-[#212121] border-2 border-[#212121] text-xs font-mono overflow-x-auto text-[#DFDFD4] space-y-1">
{`git clone https://github.com/PavanKumar-HQ/wispr-flow-2-model.git voxquest
cd voxquest
pnpm install
cargo tauri build`}
          </pre>
        </div>
      </main>

      <Footer />
    </div>
  );
}
