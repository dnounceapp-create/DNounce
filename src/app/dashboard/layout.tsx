"use client";

import { useAuth } from "@/lib/auth";
import { stageConfig, STAGE_ORDER, outcomeLabels } from "@/config/stageConfig";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Dialog } from "@headlessui/react";
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
  const [searchOpen, setSearchOpen] = useState(false);
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

  
  // Save selected category persistently
  useEffect(() => {
    localStorage.setItem("searchCategory", category);
  }, [category]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          // Reverse geocode to get a readable city/state
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
          `/api/search?${new URLSearchParams({
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
          <div className="relative w-full max-w-xl flex items-center gap-0">
            {/* Category Dropdown */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 px-3 text-sm border border-gray-300 rounded-l-full bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All</option>
              <option value="profile">Subjects</option>
              <option value="category">Category</option>
              <option value="organization">Company / Organization</option>
              <option value="record">Records</option>
              <option value="hashtag">Hashtags</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${
                  category === "all" ? "everything" : category + "s"
                }...`}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-r-full shadow-sm text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
              />

              {/* 🧭 Search Results */}
              {results.length > 0 ? (
                <div className="space-y-6 mt-4">
                  {/* Subjects */}
                  {results.some(r => r.type === "profile") && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Subjects</h3>
                      <ul className="space-y-2">
                        {results
                          .filter(r => r.type === "profile")
                          .map(profile => (
                            <Link
                              key={`profile-${profile.id}`}
                              href={`/dashboard/profile/${profile.id}`}
                              className="block p-3 rounded-lg hover:bg-gray-50 transition"
                            >
                              <p className="font-medium text-gray-900">{profile.name || "Unnamed Subject"}</p>
                              {profile.nickname && (
                                <p className="text-xs text-gray-500">Nickname: {profile.nickname}</p>
                              )}
                            </Link>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Companies / Organizations */}
                  {results.some(r => r.type === "organization") && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Companies / Organizations</h3>
                      <ul className="space-y-2">
                        {results
                          .filter(r => r.type === "organization")
                          .map(org => (
                            <Link
                              key={`org-${org.id}`}
                              href={`/dashboard/organization/${org.id}`}
                              className="block p-3 rounded-lg hover:bg-gray-50 transition"
                            >
                              <p className="font-medium text-gray-900">{org.company || org.organization}</p>
                              {org.category && (
                                <p className="text-xs text-gray-500">Category: {org.category}</p>
                              )}
                            </Link>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Records */}
                  {results.some(r => r.type === "record") && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Records</h3>
                      <ul className="space-y-2">
                        {results
                          .filter(r => r.type === "record")
                          .map(record => (
                            <Link
                              key={`record-${record.id}`}
                              href={`/dashboard/records/${record.id}`}
                              className="block p-3 rounded-lg hover:bg-gray-50 transition"
                            >
                              <p className="font-medium text-gray-900">{record.title}</p>
                              <p className="text-xs text-gray-500">#{record.record_id}</p>
                            </Link>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Hashtags */}
                  {results.some(r => r.type === "hashtag") && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Hashtags</h3>
                      <ul className="flex flex-wrap gap-2">
                        {results
                          .filter(r => r.type === "hashtag")
                          .map(tag => (
                            <Link
                              key={`tag-${tag.id}`}
                              href={`/dashboard/hashtags/${tag.tag}`}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                            >
                              #{tag.tag}
                            </Link>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                query && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    No results found for “{query}”.
                  </p>
                )
              )}
            </div>
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

            {/* --- Mobile Search Controls --- */}
            <div className="space-y-3">

            {/* Category chips */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  { v: "all", label: "All" },
                  { v: "profile", label: "Subjects" },
                  { v: "organization", label: "Companies" },
                  { v: "record", label: "Records" },
                  { v: "hashtag", label: "Hashtags" },
                ].map((opt) => {
                  const active = category === opt.v;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => setCategory(opt.v)}
                      className={`px-3 py-2 rounded-full text-sm border transition ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                      aria-pressed={active}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${category === "all" ? "everything" : category + "s"}...`}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  autoFocus
                />
              </div>
              </div>

              {/* --- Mobile Results --- */}
              <div className="mt-4 max-h-80 overflow-y-auto text-sm text-gray-700 border border-gray-200 rounded-xl">
              {query.trim().length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Start typing to search…</p>
              ) : results.length === 0 ? (
                <p className="text-center text-gray-500 py-6">No results found.</p>
              ) : (
                <>
                  {["profile", "organization", "record", "hashtag"]
                    .filter((t) => category === "all" || category === t)
                    .map((groupType) => {
                      const groupItems = results.filter((r) => r.type === groupType);
                      if (groupItems.length === 0) return null;

                      const label =
                        groupType === "profile"
                          ? "Subjects"
                          : groupType === "organization"
                          ? "Companies"
                          : groupType === "record"
                          ? "Records"
                          : "Hashtags";

                      return (
                        <div key={groupType} className="border-b last:border-b-0 border-gray-200">
                          {/* Section label */}
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 rounded-t-xl">
                            {label}
                          </div>

                          <ul className="divide-y divide-gray-100">
                            {groupItems.map((item: any) => (
                              <li
                                key={`${item.type}-${item.id}`}
                                onClick={() => {
                                  setSearchOpen(false);
                              
                                  if (item.type === "profile") {
                                    window.location.href = `/dashboard/profile/${item.id}`;
                                  } else if (item.type === "organization") {
                                    window.location.href = `/dashboard/organization/${item.id}`;
                                  } else if (item.type === "record") {
                                    window.location.href = `/dashboard/record/${item.id}`;
                                  } else if (item.type === "hashtag") {
                                    window.location.href = `/dashboard/search?q=%23${item.tag}`;
                                  } else if (item.type === "category") {
                                    window.location.href = `/dashboard/search?category=${encodeURIComponent(item.category)}`;
                                  }
                                }}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition"
                              >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                                  {item.type === "profile" && <User className="w-4 h-4 text-gray-500" />}
                                  {item.type === "record" && <FileText className="w-4 h-4 text-gray-500" />}
                                  {item.type === "hashtag" && <Hash className="w-4 h-4 text-gray-500" />}
                                  {item.type === "organization" && <Layers className="w-4 h-4 text-gray-500" />}
                                  {item.type === "category" && <Star className="w-4 h-4 text-gray-500" />}
                                </div>
                              
                                <div className="min-w-0">
                                  {item.type === "profile" && (
                                    <>
                                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {item.nickname ? `@${item.nickname}` : ""}
                                        {item.organization ? ` • ${item.organization}` : ""}
                                      </p>
                                    </>
                                  )}
                              
                                  {item.type === "organization" && (
                                    <>
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {item.organization || item.company}
                                      </p>
                                      {item.category && (
                                        <p className="text-xs text-gray-500 truncate">{item.category}</p>
                                      )}
                                    </>
                                  )}
                              
                                  {item.type === "record" && (
                                    <>
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {item.title}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        #{item.record_id || item.id}
                                      </p>
                                    </>
                                  )}
                              
                                  {item.type === "hashtag" && (
                                    <>
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        #{item.tag}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {item.usage_count || 0} uses
                                      </p>
                                    </>
                                  )}
                              
                                  {item.type === "category" && (
                                    <>
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {item.category}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate text-blue-600">
                                        Browse related topics
                                      </p>
                                    </>
                                  )}
                                </div>
                              </li>                            
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                </>
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
