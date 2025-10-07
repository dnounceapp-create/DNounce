"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  User,
  FileText,
  Layers,
  Vote,
  Pin,
  Eye,
  Settings,
  Star,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { name: "My Reputation", href: "/dashboard/reputation", icon: Star },
  { name: "My Profile", href: "/dashboard/profile", icon: User },
  { name: "Records Submitted", href: "/dashboard/records-submitted", icon: Layers },
  { name: "My Records", href: "/dashboard/myrecords", icon: FileText },
  { name: "Records I've Voted", href: "/dashboard/voted", icon: Vote },
  { name: "Pinned Records", href: "/dashboard/pinned", icon: Pin },
  { name: "Following Cases", href: "/dashboard/following", icon: Eye },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth({
    redirectIfUnauthed: true,
    redirectToSetupIfFirstTime: true,
    loginPath: "/loginsignup",
  });

  // --- Mobile menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // --- Edge-swipe gesture state (mobile)
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [dragX, setDragX] = useState(0); // visual transform while dragging

  // Auto-close mobile menu when route changes (feels native)
  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    const { style } = document.body;
    const prev = style.overflow;
    if (menuOpen) style.overflow = "hidden";
    else style.overflow = prev || "";
    return () => {
      style.overflow = prev || "";
    };
  }, [menuOpen]);

  // Touch handlers for edge swipe
  const onTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;

    // start drag if:
    // 1) menu is open (allow closing with swipe), or
    // 2) user started from very left edge (<= 20px) to open
    const fromEdge = x <= 20;
    if (menuOpen || fromEdge) {
      draggingRef.current = true;
      startXRef.current = x;
      currentXRef.current = x;
      setDragX(0);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    currentXRef.current = e.touches[0].clientX;

    const delta = currentXRef.current - startXRef.current;

    // If menu is open, we allow swiping left to close (delta < 0).
    // If menu is closed but starting at edge, allow pulling right to open (delta > 0 up to drawer width).
    const width = 256; // 64 * 4 (w-64)
    let translate = 0;

    if (menuOpen) {
      // drawer starts at 0 (visible) -> we translate negative as user swipes left
      translate = Math.min(0, Math.max(-width, delta));
    } else {
      // drawer starts at -width -> visually it increases toward 0 as user drags right
      // we store as positive right-pull so we can map later
      translate = Math.max(0, Math.min(width, delta));
    }

    setDragX(translate);
  };

  const onTouchEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const width = 256;
    const threshold = 60; // distance to decide commit

    if (menuOpen) {
      // user swiped left to close?
      if (dragX < -threshold) setMenuOpen(false);
      // otherwise snap back open
    } else {
      // user pulled from edge to open?
      if (dragX > threshold) setMenuOpen(true);
      // otherwise stay closed
    }

    // reset visual
    setDragX(0);
  };

  // Compute inline style for the mobile drawer during drag
  const mobileDrawerStyle: React.CSSProperties = (() => {
    const width = 256;
    // When open normally (not dragging), translateX: 0
    // When closed normally (not dragging), translateX: -100%
    if (dragX === 0) return {};
    // When open & dragging left, dragX is negative up to -width -> direct map to translateX(px)
    if (menuOpen && dragX <= 0) return { transform: `translateX(${dragX}px)` };
    // When closed & dragging from edge, dragX is positive up to width -> base -width + dragX
    if (!menuOpen && dragX >= 0) return { transform: `translateX(${dragX - width}px)` };
    return {};
  })();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-gray-500">
        Checking your session…
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header (sticky) */}
      <header className="px-4 sm:px-8 py-4 bg-white shadow-sm flex items-center justify-between sticky top-0 z-30">
        <Link
          href="/dashboard/myrecords"
          className="flex items-center gap-3 hover:opacity-80 transition"
        >
          <Image src="/logo.png" alt="DNounce Logo" width={40} height={40} priority />
          <span className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            DNounce
          </span>
        </Link>

        {/* Desktop Settings */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard/settings"
            className="p-2 rounded-full hover:bg-gray-100 transition"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
        </button>
      </header>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-300 ${
          menuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        } md:hidden`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile slide-over drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={mobileDrawerStyle}
        // Gesture handlers only on mobile-sized view; harmless otherwise
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        aria-hidden={!menuOpen}
      >
        <div className="p-6 border-b flex items-center justify-between bg-white/80 backdrop-blur-md">
          <span className="font-semibold text-gray-900 text-lg">Menu</span>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content row */}
      <div className="flex flex-1">
        {/* Desktop sidebar (unchanged) */}
        <aside className="hidden md:block w-64 bg-white border-r shadow-sm p-6 space-y-2 sticky top-0 h-screen">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </aside>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Footer (unchanged) */}
      <footer className="bg-[#0A1120] text-gray-300 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-white font-semibold mb-3">DNounce</h4>
            <p className="text-sm leading-relaxed">
              Verified public reputation platform for documenting real experiences
              through community-driven feedback and AI credibility recommendations.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white">Search Profiles</Link></li>
              <li><Link href="#" className="hover:text-white">Share Feedback</Link></li>
              <li><Link href="#" className="hover:text-white">Community Review</Link></li>
              <li><Link href="#" className="hover:text-white">Guidelines</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white">Transparency Report</Link></li>
              <li><Link href="#" className="hover:text-white">Legal Framework</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white">Help Center</Link></li>
              <li><Link href="#" className="hover:text-white">Contact Support</Link></li>
              <li><Link href="#" className="hover:text-white">Appeal Process</Link></li>
              <li><Link href="#" className="hover:text-white">Status Page</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-xs text-gray-400 max-w-6xl mx-auto px-6">
          © 2025 DNounce. All rights reserved. Verifying experiences, preserving reputations.
        </div>
      </footer>
    </div>
  );
}
