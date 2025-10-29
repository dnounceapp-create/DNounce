"use client";

import { useAuth } from "@/lib/auth";
import { stageConfig, STAGE_ORDER, outcomeLabels } from "@/config/stageConfig";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Hash,
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
  { name: "Following Records", href: "/dashboard/following", icon: Eye },
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("searchCategory") || "all";
    }
    return "all";
  });  
  const [results, setResults] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  
  // Save selected category persistently
  useEffect(() => {
    localStorage.setItem("searchCategory", category);
  }, [category]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/globalsearch?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&location=${encodeURIComponent(userLocation || "")}`
          );          
          const data = await res.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.state ||
            "";
          setUserLocation(city);          
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);  

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
    
      try {
        const res = await fetch(
          `/api/globalsearch?${new URLSearchParams({
          q: query,
          category: category || "",
          profile_id: selectedProfileId || "",
          location: userLocation || ""
        })}`
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error("Search error:", err);
      }
    };
  
    const delay = setTimeout(fetchResults, 300); // debounce typing
    return () => clearTimeout(delay);
  }, [query, category, userLocation]); 

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
            {/* Unified pill-style input */}
            <div className="text-sm text-gray-700 bg-transparent border-none outline-none cursor-pointer appearance-none px-2 pr-5 h-10 flex items-center truncate">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 min-w-[160px] flex items-center bg-transparent text-sm text-gray-700 border-none outline-none cursor-pointer appearance-none px-3 truncate"
              >
                <option value="all">All</option>
                <option value="profile">Subjects</option>
                <option value="category">Category</option>
                <option value="organization">Company / Organization</option>
                <option value="record">Records</option>
                <option value="hashtag">Hashtags</option>
              </select>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  ref={desktopInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${
                    category === "all"
                      ? "all"
                      : category === "organization"
                      ? "company/organization"
                      : category
                  }...`}
                  className="w-full pl-10 pr-12 py-2.5 text-sm text-gray-700 bg-transparent focus:outline-none"
                />

                {query && (
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 p-1 rounded-full hover:bg-gray-100 active:scale-95 transition"
                    aria-label="Clear search"
                    title="Clear"
                    // prevent input blur on mousedown, so the dropdown doesn’t close before we clear
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery("");
                      // re-focus the input for fast re-typing
                      desktopInputRef.current?.focus();
                    }}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Animated Results Dropdown */}
            <AnimatePresence>
              {query && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-14 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 max-h-[480px] overflow-y-auto"
                >
                  {results.length > 0 ? (
                    <div className="space-y-6">
                      {["profile", "organization", "record", "category", "hashtag"].map((groupType) => {
                        const groupItems = results.filter((r) => r.type === groupType);
                        if (groupItems.length === 0) return null;

                        const label =
                          groupType === "profile"
                            ? "Subjects"
                            : groupType === "organization"
                            ? "Company / Organization"
                            : groupType === "record"
                            ? "Records"
                            : groupType === "category"
                            ? "Categories"
                            : "Hashtags";

                        return (
                          <div key={groupType}>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                              {label}
                            </h3>
                            <ul className="space-y-1">
                              {groupItems.map((item: any) => {
                                const href =
                                  item.type === "profile"
                                    ? `/profile/${item.id}`
                                    : item.type === "organization"
                                    ? `/organization/${item.id}`
                                    : item.type === "record"
                                    ? `/records/${item.id}`
                                    : item.type === "hashtag"
                                    ? `/#${item.tag}`
                                    : item.id
                                    ? `/category/${item.id}`
                                    : `/search?category=${encodeURIComponent(item.name)}`;

                                return (
                                  <Link
                                    key={`${item.type}-${item.id}`}
                                    href={href}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition"
                                  >
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                                      {item.type === "profile" && (
                                        <User className="w-4 h-4 text-gray-600" />
                                      )}
                                      {item.type === "organization" && (
                                        <Layers className="w-4 h-4 text-gray-600" />
                                      )}
                                      {item.type === "record" && (
                                        <FileText className="w-4 h-4 text-gray-600" />
                                      )}
                                      {item.type === "category" && (
                                        <Star className="w-4 h-4 text-gray-600" />
                                      )}
                                      {item.type === "hashtag" && (
                                        <Hash className="w-4 h-4 text-gray-600" />
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900 truncate">
                                        {item.name ||
                                          item.title ||
                                          item.organization ||
                                          `#${item.tag}`}
                                      </p>
                                      {item.nickname && (
                                        <p className="text-xs text-gray-500 truncate">
                                          @{item.nickname}
                                        </p>
                                      )}
                                    </div>
                                  </Link>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6">
                      <Search className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      No results found for “{query}”
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right-side Controls */}
        <div className="flex items-center gap-2 md:gap-3">

          {/* 🔍 Mobile Search Button */}
          <button
            onClick={() => setMobileSearchOpen(true)}
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
      <Dialog open={mobileSearchOpen} onClose={setMobileSearchOpen} className="relative z-50">
        {/* overlay */}
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

        {/* centered panel container */}
        <div className="fixed inset-0 flex items-start justify-center p-4 sm:p-8">
          <Dialog.Panel className="w-full sm:max-w-lg bg-white p-4 rounded-2xl shadow-xl">
            {/* 🔍 Search Bar */}
            <div className="relative flex items-center gap-2 mb-4 border border-gray-200 rounded-full px-3 py-[6px] shadow-sm focus-within:ring-2 focus-within:ring-blue-600 transition-all">
              <Search className="text-gray-400 w-5 h-5" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-sm text-gray-700 bg-transparent border-none outline-none cursor-pointer appearance-none h-10 flex items-center truncate px-2 pr-6"
              >
                <option value="all">All</option>
                <option value="profile">Subjects</option>
                <option value="category">Category</option>
                <option value="organization">Company / Organization</option>
                <option value="record">Records</option>
                <option value="hashtag">Hashtags</option>
              </select>
              <span className="absolute right-[calc(100%-2.5rem)] pointer-events-none text-gray-400">⌄</span>

              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${
                  category === "all"
                    ? "all"
                    : category === "organization"
                    ? "company/organization"
                    : category
                }...`}
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 pr-10"
              />

              {query && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 active:scale-95 transition"
                  aria-label="Clear search"
                  title="Clear"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery("");
                    mobileInputRef.current?.focus();
                  }}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* 🧭 Results List */}
            <AnimatePresence>
              {query && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6 max-h-[70vh] overflow-y-auto"
                >
                  {results.length > 0 ? (
                    <>
                      {["profile", "organization", "record", "category", "hashtag"].map((type) => {
                        const groupItems = results.filter((r) => r.type === type);
                        if (groupItems.length === 0) return null;

                        const title =
                          type === "profile"
                            ? "Subjects"
                            : type === "organization"
                            ? "Companies / Organizations"
                            : type === "record"
                            ? "Records"
                            : type === "category"
                            ? "Categories"
                            : "Hashtags";

                        return (
                          <div key={type}>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2 px-1">
                              {title}
                            </h3>
                            <ul className="space-y-1">
                              {groupItems.map((item: any) => {
                                const href =
                                  item.type === "profile"
                                    ? `/profile/${item.id}`
                                    : item.type === "organization"
                                    ? `/organization/${item.id}`
                                    : item.type === "record"
                                    ? `/records/${item.id}`
                                    : item.type === "hashtag"
                                    ? `/#${item.tag}`
                                    : item.id
                                    ? `/category/${item.id}`
                                    : `/search?category=${encodeURIComponent(item.name)}`;

                                return (
                                  <Link
                                    key={`${type}-${item.id}`}
                                    href={href}
                                    onClick={() => setMobileSearchOpen(false)}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition"
                                  >
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                                      {item.type === "profile" && <User className="w-4 h-4 text-gray-600" />}
                                      {item.type === "organization" && <Layers className="w-4 h-4 text-gray-600" />}
                                      {item.type === "record" && <FileText className="w-4 h-4 text-gray-600" />}
                                      {item.type === "category" && <Star className="w-4 h-4 text-gray-600" />}
                                      {item.type === "hashtag" && <Hash className="w-4 h-4 text-gray-600" />}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900 truncate">
                                        {item.name || item.title || item.organization || `#${item.tag}`}
                                      </p>
                                      {item.nickname && (
                                        <p className="text-xs text-gray-500 truncate">@{item.nickname}</p>
                                      )}
                                    </div>
                                  </Link>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-10">
                      <Search className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      No results found for “{query}”
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
