'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PixelLogo } from './PixelIcons';
import { Menu, X, Github, Download, Compass, Wand2, Terminal, BookOpen, Layers } from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Workflow', href: '/#workflow' },
    { name: 'Features', href: '/#features' },
    { name: 'Audiences', href: '/#audiences' },
    { name: 'Quests', href: '/#quests' },
    { name: 'Community', href: '/#community' },
    { name: 'FAQ', href: '/#faq' },
    { name: 'Docs', href: '/docs' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#07514C]/90 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-[#DDA44D] rounded-xl border border-white/20 shadow-md group-hover:scale-105 transition-transform">
              <PixelLogo className="w-7 h-7" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                VOXQUEST
              </span>
              <div className="text-[10px] font-mono font-bold text-[#DDA44D] tracking-wider uppercase">
                Voice Platform
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links with animated left-to-right underline on hover */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="relative px-3.5 py-2 font-mono font-bold text-sm text-[#DFDFD4] hover:text-[#DDA44D] transition-colors group"
              >
                <span>{link.name}</span>
                {/* Expanding line effect from left to right */}
                <span className="absolute bottom-0 left-0 w-0 h-1 bg-[#DDA44D] border-t border-[#212121] transition-all duration-300 ease-out group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/download"
              className="arcade-btn arcade-btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-md hover:scale-105 transition-all"
            >
              <Download className="w-4 h-4 text-[#212121]" />
              <span>DOWNLOAD APP</span>
            </Link>
          </div>

          {/* Mobile menu toggle button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="arcade-btn arcade-btn-primary p-2"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#212121]" /> : <Menu className="w-5 h-5 text-[#212121]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t-4 border-[#212121] bg-[#07514C] px-4 pt-4 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 font-mono font-bold text-sm text-[#DFDFD4] hover:bg-[#0F5B57] border-2 border-transparent hover:border-[#212121] shadow-pixel-sm"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t-2 border-[#212121] flex flex-col gap-2">
            <Link
              href="/download"
              onClick={() => setMobileMenuOpen(false)}
              className="arcade-btn arcade-btn-primary w-full py-3 text-center text-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-[#212121]" />
              <span>DOWNLOAD VOXQUEST</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="relative z-10 border-t-4 border-[#212121] py-14 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="arcade-panel p-8 sm:p-12 bg-[#DFDFD4]/90 backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#DDA44D] border-2 border-[#212121] shadow-pixel-sm">
                  <PixelLogo className="w-7 h-7" />
                </div>
                <span className="font-pixel text-lg text-[#212121]">VOXQUEST</span>
              </div>
              <p className="text-xs text-[#212121]/80 leading-relaxed font-mono">
                Open-source, privacy-first voice dictation platform. Speak naturally, turn thoughts into clean text, and own your speech data.
              </p>
              <div className="arcade-badge bg-[#DA6C4C] text-white text-[8px]">
                100% OFFLINE CAPABLE
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-pixel text-xs text-[#07514C] uppercase tracking-wider mb-4 border-b-2 border-[#212121] pb-1">
                PRODUCT
              </h4>
              <ul className="space-y-2.5 text-xs font-mono font-bold">
                <li>
                  <Link href="/features" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Features Matrix
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Pipeline Architecture
                  </Link>
                </li>
                <li>
                  <Link href="/download" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Client Downloads
                  </Link>
                </li>
                <li>
                  <Link href="/changelog" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Changelog Notes
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="font-pixel text-xs text-[#07514C] uppercase tracking-wider mb-4 border-b-2 border-[#212121] pb-1">
                RESOURCES
              </h4>
              <ul className="space-y-2.5 text-xs font-mono font-bold">
                <li>
                  <Link href="/docs" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Documentation Guide
                  </Link>
                </li>
                <li>
                  <Link href="/open-source" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Apache 2.0 License
                  </Link>
                </li>
                <li>
                  <Link href="/community" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Community Guild
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Accessibility Statement
                  </Link>
                </li>
              </ul>
            </div>

            {/* Trust & Privacy Column */}
            <div>
              <h4 className="font-pixel text-xs text-[#07514C] uppercase tracking-wider mb-4 border-b-2 border-[#212121] pb-1">
                TRUST &amp; PRIVACY
              </h4>
              <ul className="space-y-2.5 text-xs font-mono font-bold">
                <li>
                  <Link href="/privacy" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Zero-Retention Policy
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Threat Model
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-[#212121] hover:text-[#07514C] hover:underline block py-0.5">
                    Terms of Service
                  </Link>
                </li>
                <li className="text-[11px] text-[#212121]/60 font-normal pt-1">
                  Zero Telemetry &bull; No Dark Patterns
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t-2 border-[#212121] flex flex-col sm:flex-row items-center justify-between text-xs text-[#212121]/80 font-mono gap-4">
            <p>&copy; {new Date().getFullYear()} VoxQuest Contributors. Free and open source software.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:underline text-[#07514C] font-bold">Zero-Telemetry Pledge</Link>
              <span>&bull;</span>
              <Link href="/docs" className="hover:underline text-[#07514C] font-bold">Local Whisper GGML</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
