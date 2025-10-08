"use client";

import { useAuth } from "@/lib/auth";
import { stageConfig, STAGE_ORDER } from "@/config/stageConfig";
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
  ChevronDown, 
  ChevronUp,
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

const outcomeLabels = [
  { label: "Kept on page", color: "bg-emerald-600" },
  { label: "Deleted from page", color: "bg-red-600" },
];

// 🪄 Floating legend component
function FloatingLegend() {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const legendRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("floatingLegendState");
    if (saved) {
      const parsed = JSON.parse(saved);
      setPos(parsed.pos || { x: 20, y: 20 });
      setCollapsed(parsed.collapsed || false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("floatingLegendState", JSON.stringify({ pos, collapsed }));
  }, [pos, collapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 220, e.clientX - offset.x)),
        y: Math.max(10, Math.min(window.innerHeight - 100, e.clientY - offset.y)),
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, offset]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      e.preventDefault(); // 🩵 stops page scrolling while dragging
      const touch = e.touches[0];
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 220, touch.clientX - offset.x)),
        y: Math.max(10, Math.min(window.innerHeight - 100, touch.clientY - offset.y)),
      });
    };
  
    const handleTouchEnd = () => {
      setIsDragging(false);
      document.body.style.overflow = ""; // 🩵 restores normal scroll
    };
  
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, offset]);

  // mobile-safe default: bottom-right
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setPos({
          x: Math.max(10, Math.min(window.innerWidth - 220, 16)),
          y: Math.max(10, Math.min(window.innerHeight - 150, 100)),
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={legendRef}
      className="fixed z-[90] select-none cursor-move rounded-xl shadow-lg backdrop-blur-lg border border-white/20 bg-white/80 p-3 sm:p-4 w-56 sm:w-64 text-xs sm:text-sm"
      style={{
        left: pos.x,
        top: pos.y,
        transform: "translate(0, 0)",
        transition: isDragging ? "none" : "transform 0.1s ease-out",
      }}
      onMouseDown={(e) => {
        if (!legendRef.current) return;
        const rect = legendRef.current.getBoundingClientRect();
        setIsDragging(true);
        setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onTouchStart={(e) => {
        if (!legendRef.current || !e.touches[0]) return;
        const touch = e.touches[0];
        const rect = legendRef.current.getBoundingClientRect();
        setIsDragging(true);
        setOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
        document.body.style.overflow = "hidden"; // 🩵 stops background scrolling
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">Legend</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((prev) => !prev);
          }}
          className="p-2 sm:p-1 rounded-md hover:bg-gray-100 active:scale-95 transition"
          aria-label={collapsed ? "Expand legend" : "Collapse legend"}
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {!collapsed && (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Stages</p>
          <ul className="space-y-1">
            {STAGE_ORDER.map((id) => {
              const s = stageConfig[id];
              return (
                <li key={s.label} className="flex items-center gap-2 relative group">
                  <span
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${s.ui.chipClass}`}
                  ></span>

                  {/* label (focusable for keyboard users) */}
                  <span
                    tabIndex={0}
                    className="text-xs text-gray-800 outline-none"
                  >
                    {s.label}
                  </span>

                  {/* tooltip */}
                  <div
                    className="
                      absolute left-5 top-full mt-1
                      max-w-[260px] rounded-md bg-gray-900 text-gray-100
                      text-[10px] sm:text-xs p-2 shadow-lg z-[999]
                      opacity-0 scale-95
                      group-hover:opacity-100 group-hover:scale-100
                      group-focus-within:opacity-100 group-focus-within:scale-100
                      transition-all duration-150
                      pointer-events-none group-hover:pointer-events-auto
                    "
                  >
                    <p className="font-semibold text-gray-50">{s.timeline.summary}</p>
                    <p className="text-gray-300 leading-snug mt-0.5">{s.happens}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Outcomes</p>
          <ul className="space-y-1">
            {outcomeLabels.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${s.color} flex-shrink-0`}
                ></span>
                <span className="text-xs text-gray-800">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
  </div>
);}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading } = useAuth({
    redirectIfUnauthed: true,
    redirectToSetupIfFirstTime: true,
    loginPath: "/loginsignup",
  });

  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
  }, [pathname]);

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
      {/* Header */}
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

        {/* Mobile Menu */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      </header>

      {/* Mobile Sidebar */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
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

      {/* Main Section */}
      <div className="flex flex-1">
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

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto relative">
          {children}
          {/* 🪄 Global Legend */}
          <FloatingLegend />
        </main>
      </div>

      {/* Footer */}
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
