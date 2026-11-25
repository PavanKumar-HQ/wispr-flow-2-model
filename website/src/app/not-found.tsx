import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#DFDFD4]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="pixel-box p-8 bg-white max-w-md text-center space-y-4">
          <div className="pixel-badge bg-terracotta text-cream text-sm">404 Error</div>
          <h1 className="text-3xl font-extrabold text-charcoal">Area Uncharted</h1>
          <p className="text-xs text-charcoal/80 leading-relaxed">
            The page you requested could not be located in the VoxQuest domain.
          </p>
          <div className="pt-2">
            <Link href="/" className="pixel-btn pixel-btn-primary px-5 py-2.5 text-xs font-bold">
              Return to Safety
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

