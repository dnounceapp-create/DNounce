"use client";

import { useAuth } from "@/lib/auth";
import { stageConfig, STAGE_ORDER, outcomeLabels } from "@/config/stageConfig";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog } from "@headlessui/react";
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
import {
  User as UserIcon,
  UserCircle2,
  Bell,
  Globe,
  Moon,
  Flag,
  MessageSquare,
  MonitorUp,
  Info,
  LogOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  special?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { name: "My Reputation", href: "/dashboard/reputation", icon: Star },
  { name: "My Profile", href: "/dashboard/profile", icon: User },
  { name: "Records Submitted", href: "/dashboard/records-submitted", icon: Layers },
  { name: "My Records", href: "/dashboard/myrecords", icon: FileText },
  { name: "Records I've Voted", href: "/dashboard/voted", icon: Vote },
  { name: "Pinned Records", href: "/dashboard/pinned", icon: Pin },
  { name: "Following Cases", href: "/dashboard/following", icon: Eye },
];

const SETTINGS_NAV: NavItem[] = [
  { name: "Account", href: "/dashboard/settings/account", icon: UserIcon },
  { name: "Notifications", href: "/dashboard/settings/notifications", icon: Bell },
  { name: "Language", href: "/dashboard/settings/language", icon: Globe },
  { name: "Display", href: "/dashboard/settings/display", icon: Moon },
  { name: "Report Issue", href: "/dashboard/settings/report", icon: Flag },
  { name: "Contact Support", href: "/dashboard/settings/support", icon: MessageSquare },
  { name: "IT Support", href: "/dashboard/settings/it-support", icon: MonitorUp },
  { name: "Terms & Conditions", href: "/dashboard/settings/terms", icon: Info },
  { name: "Log Out", href: "/logout", icon: LogOut, special: true },
];


// 🪄 Floating legend component
function Legend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">Legend</h3>
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="p-2 rounded-md hover:bg-gray-100 active:scale-95 transition"
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
          {/* Stages */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Stages</p>
            <ul className="space-y-1">
              {STAGE_ORDER.map((id) => {
                const s = stageConfig[id];
                return (
                  <li
                    key={s.label}
                    className="grid grid-cols-[18px_16px_1fr] items-center gap-2 py-0.5"
                  >
                    <span className="justify-self-end text-[11px] font-semibold text-gray-700">
                      {id}.
                    </span>

                    <span className="justify-self-center h-4 w-4 grid place-items-center">
                      <span className={`w-3 h-3 rounded-full border border-black/40 ${s.ui.chipClass}`} />
                    </span>

                    <span className="text-xs text-gray-800">{s.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Outcomes */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Outcomes</p>
            <ul className="space-y-1">
              {outcomeLabels.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${s.color}`} />
                  <span className="text-xs text-gray-800">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Roles */}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Roles</p>
            <ul className="space-y-1">
              <li className="text-xs text-gray-800">
                <span className="font-semibold text-gray-900">Contributor</span> — User who submits a record about another user.
              </li>
              <li className="text-xs text-gray-800">
                <span className="font-semibold text-gray-900">Subject</span> — The individual that the record is about.
              </li>
            </ul>
          </div>

          {/* Submit a Record */}
          <div className="border-t border-gray-200 pt-2 mt-2 flex items-center gap-2 text-xs text-gray-700">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-gray-900">Submit a Record</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading } = useAuth({
    redirectIfUnauthed: true,
    redirectToSetupIfFirstTime: true,
    loginPath: "/loginsignup",
  });
  const inSettings = pathname.startsWith("/dashboard/settings");
  const inSubmit = pathname.startsWith("/dashboard/submit");
  const currentNav = inSettings ? SETTINGS_NAV : MAIN_NAV;
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");


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

        {/* --- CENTER: Universal Search (Desktop) --- */}
        <div className="hidden md:flex flex-1 justify-center px-8">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search profiles, cases, hashtags..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full shadow-sm text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
            />
            {query && (
              <div className="absolute mt-2 bg-white border border-gray-200 rounded-xl shadow-lg w-full max-h-64 overflow-y-auto text-sm z-50">
                <div className="p-3 border-b text-gray-500 text-xs uppercase tracking-wide">
                  Search Results
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <span className="font-medium">John Doe</span> — Profile ID #1245
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <span className="font-medium">#Barber</span> — Hashtag Record
                </div>
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <span className="font-medium">Case 2025-A24</span> — Subject Dispute
                </div>
              </div>
            )}
          </div>
        </div>        

        {/* Right-side Controls */}
        <div className="flex items-center gap-2 md:gap-3">

          {/* 🔍 Mobile Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100 transition"
            title="Search DNounce"
          >
            <Search className="w-5 h-5 text-gray-700" />
          </button>

          {/* 🧾 Submit a Record Button */}
          <Link
            href="/dashboard/submit"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all"
            title="Submit a new record"
          >
            <FileText className="w-4 h-4" />
            Submit a Record
          </Link>

          {/* 🧾 Mobile Submit Button (icon only) */}
          <Link
            href="/dashboard/submit"
            className="md:hidden p-2 rounded-md hover:bg-blue-100 text-blue-700 transition"
            title="Submit a new record"
          >
            <FileText className="w-5 h-5" />
          </Link>

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

          {/* Settings Icon */}
          <Link
            href="/dashboard/settings"
            className="p-2 rounded-full hover:bg-gray-100 transition"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </header>

      {/* 🔍 Universal Search Modal */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-start justify-center p-4 sm:p-8">
          <Dialog.Panel className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg mt-20">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              Search DNounce
            </Dialog.Title>

            {/* Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search profiles, cases, hashtags..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                autoFocus
              />
            </div>

            {/* Placeholder for search results */}
            <div className="mt-4 max-h-72 overflow-y-auto text-sm text-gray-700">
              {query && (
                <div className="space-y-2">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Recent Matches</p>
                  {/* These would be dynamically loaded from backend */}
                  <div className="border rounded-md p-3 hover:bg-gray-50 transition cursor-pointer">
                    <span className="font-medium">John Doe</span> — Profile ID #1245
                  </div>
                  <div className="border rounded-md p-3 hover:bg-gray-50 transition cursor-pointer">
                    <span className="font-medium">#Barber</span> — Hashtag Record
                  </div>
                  <div className="border rounded-md p-3 hover:bg-gray-50 transition cursor-pointer">
                    <span className="font-medium">Case 2025-A24</span> — Subject Dispute
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSearchOpen(false)}
                className="px-4 py-2 text-sm rounded-md border hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Mobile Sidebar */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {menuOpen && (
        <div className="fixed top-0 left-0 w-64 bg-white h-full shadow-lg z-50 p-6 space-y-2 md:hidden">
          {currentNav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
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
        </div>
      )}

      {/* Main Section */}
      <div className="flex flex-1">
        <aside className="hidden md:flex flex-col w-64 bg-white border-r shadow-sm p-6 h-auto">
          {/* Nav Links */}
          <div className="space-y-2">
            {currentNav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              const baseClasses =
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition";
              const activeClasses =
                "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm";
              const normalClasses = "text-gray-700 hover:bg-gray-100";
              const logoutClasses = "text-red-600 hover:bg-red-50";

              const classes = item.special
                ? `${baseClasses} ${logoutClasses}`
                : `${baseClasses} ${active ? activeClasses : normalClasses}`;

              return (
                <Link key={item.name} href={item.href} className={classes}>
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {!inSettings && !inSubmit && (
            <div className="mt-6">
              <Legend />
            </div>
          )}
        </aside>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto relative">
          {children}
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
