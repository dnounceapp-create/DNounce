"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * Header for signed-out visitors on records, profiles, the blog and request
 * pages. Same names and look as the homepage and demo pages. The links go to
 * the homepage sections (these pages don't have those sections themselves).
 */
const NAV: [string, string][] = [
  ["How it works", "how-it-works"],
  ["Community", "voting-section"],
  ["Guidelines", "guidelines-section"],
  ["Legal", "legal-section"],
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const goLogin = () =>
    router.push(`/loginsignup?redirectTo=${encodeURIComponent(window.location.pathname)}`);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => router.push("/")}>
              <Image
                src="/logo.png"
                alt="DNounce Logo"
                width={52}
                height={52}
                priority
                className="w-[52px] h-[52px] sm:w-[74px] sm:h-[74px]"
              />
              <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">DNounce</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              {NAV.map(([label, id]) => (
                <a key={id} href={`/?section=${id}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  {label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={goLogin} className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Log in
              </button>
              <button
                onClick={goLogin}
                className="bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-xl transition-colors"
              >
                Get started
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                aria-label="Open menu"
              >
                <div className="w-4 h-0.5 bg-current mb-1" />
                <div className="w-4 h-0.5 bg-current mb-1" />
                <div className="w-4 h-0.5 bg-current" />
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pt-4 pb-2 space-y-1 border-t border-gray-100 mt-3">
              {NAV.map(([label, id]) => (
                <a
                  key={id}
                  href={`/?section=${id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  {label}
                </a>
              ))}
              <button
                onClick={() => { setMobileMenuOpen(false); goLogin(); }}
                className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Log in
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
