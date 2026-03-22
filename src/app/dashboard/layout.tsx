"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import SearchResultCard from "@/components/SearchResultCard";
import {
  Search,
  Hash,
  User,
  FileText,
  FilePlus,
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
import { supabase } from "@/lib/supabaseClient";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  special?: boolean;
  special_profile?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { name: "My Reputation", href: "/dashboard/reputation", icon: Star },
  { name: "My Profile", href: "/dashboard/profile", icon: User, special_profile: true },
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
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [adv, setAdv] = useState({
    firstName: "", lastName: "", nickname: "",
    organization: "", location: "", category: "",
    subjectId: "", recordId: "",
  });
  const [advTags, setAdvTags] = useState<string[]>([]);
  const [advTagInput, setAdvTagInput] = useState("");
  const [advResults, setAdvResults] = useState<any[]>([]);
  const [advLoading, setAdvLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    async function fetchSubjectId() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("subject_id")
          .eq("auth_user_id", user!.id)
          .single();
        if (!error && data?.subject_id) {
          setSubjectId(data.subject_id);
        }
      } catch (err) {
        console.error("Failed to fetch subject_id:", err);
      }
    }
    fetchSubjectId();
  }, [user]);
  
  useEffect(() => {
    if (!user?.id) return;
    async function fetchNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, type, read, created_at, record_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    }
    fetchNotifications();
  }, [user]);

  async function markAllRead() {
    if (!user?.id) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function markOneRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  // Save selected category persistently
  useEffect(() => {
    localStorage.setItem("searchCategory", category);
  }, [category]);

  useEffect(() => {
    async function fetchUserLocation() {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported.");
        // setUserCity("Unknown Location");
        return;
      }
  
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
  
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
            const data = await res.json().catch(() => ({}));
  
            const city =
              data?.address?.city ||
              data?.address?.town ||
              data?.address?.village ||
              data?.address?.state ||
              "Unknown Location";
            // setUserCity(city);
          } catch (err) {
            console.warn("Reverse geocoding failed:", err);
            // setUserCity("Unknown Location");
          }
        },
        (err) => {
          console.warn("User denied geolocation:", err);
          // setUserCity("Unknown Location");
        }
      );
    }
  
    fetchUserLocation();
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

  const runAdvancedSearch = async () => {
    setAdvLoading(true);
    try {
      const params = new URLSearchParams();
      if (adv.firstName) params.set("firstName", adv.firstName);
      if (adv.lastName) params.set("lastName", adv.lastName);
      if (adv.nickname) params.set("nickname", adv.nickname);
      if (adv.organization) params.set("organization", adv.organization);
      if (adv.location) params.set("location", adv.location);
      if (adv.category) params.set("category", adv.category);
      if (adv.subjectId) params.set("subjectId", adv.subjectId);
      if (adv.recordId) params.set("recordId", adv.recordId);
      if (advTags.length) params.set("hashtags", advTags.join(" "));
      const res = await fetch(`/api/advancedsearch?${params}`);
      const data = await res.json();
      setAdvResults(data.results || []);
    } catch (err) {
      console.error("Advanced search error:", err);
    } finally {
      setAdvLoading(false);
    }
  };

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
          <div className="relative w-full max-w-2xl">
            {/* Search Container */}
            <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              {/* Category Selector */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 min-w-[170px] px-4 bg-gray-50 text-sm text-gray-700 font-medium border-r border-gray-200 rounded-l-full focus:outline-none hover:bg-gray-100"
              >
                <option value="all">All</option>
                <option value="profile">Profiles</option>
                <option value="category">Category</option>
                <option value="organization">Company / Organization</option>
                <option value="record">Records</option>
                <option value="hashtag">Hashtags</option>
              </select>

              {/* Input Field */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  ref={desktopInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${
                    category === "all"
                      ? "across DNounce..."
                      : category === "organization"
                      ? "companies & organizations..."
                      : `${category}...`
                  }`}
                  className="w-full pl-10 pr-12 h-11 text-sm text-gray-700 bg-transparent focus:outline-none"
                />

                {query && (
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 p-1 rounded-full hover:bg-gray-100 active:scale-95 transition"
                    aria-label="Clear search"
                    title="Clear"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery("");
                      desktopInputRef.current?.focus();
                    }}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setAdvancedOpen((v) => !v)}
                className="shrink-0 px-3 h-11 text-xs font-medium text-blue-600 hover:text-blue-800 border-l border-gray-200 rounded-r-full hover:bg-blue-50 transition"
              >
                Advanced
              </button>
            </div>
            
            {/* 🔬 Advanced Search Panel */}
            {advancedOpen && (
              <div className="absolute top-14 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Advanced search</span>
                  </div>
                  <button onClick={() => setAdvancedOpen(false)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {([
                    ["firstName", "First name", "e.g. John"],
                    ["lastName", "Last name", "e.g. Doe"],
                    ["nickname", "Nickname", "e.g. JD"],
                    ["organization", "Organization", "e.g. Acme Corp"],
                    ["location", "Location", "e.g. Astoria, NY"],
                    ["category", "Category", "e.g. Barber"],
                    ["subjectId", "Subject ID", ""],
                    ["recordId", "Record ID", ""],
                  ] as [keyof typeof adv, string, string][]).map(([key, label, placeholder]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={adv[key]}
                        onChange={(e) => setAdv((p) => ({ ...p, [key]: e.target.value }))}
                        className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1 mb-4">
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Hashtags <span className="normal-case font-normal tracking-normal text-gray-400">— space to add</span>
                  </label>
                  <div
                    className="min-h-[36px] px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 flex flex-wrap gap-1.5 items-center cursor-text"
                    onClick={() => document.getElementById("adv-tag-input")?.focus()}
                  >
                    {advTags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                        #{tag}
                        <button onClick={() => setAdvTags((t) => t.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-700">×</button>
                      </span>
                    ))}
                    <input
                      id="adv-tag-input"
                      value={advTagInput}
                      onChange={(e) => setAdvTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          const val = advTagInput.trim().replace(/^#/, "");
                          if (val && !advTags.includes(val)) setAdvTags((t) => [...t, val]);
                          setAdvTagInput("");
                        } else if (e.key === "Backspace" && advTagInput === "" && advTags.length) {
                          setAdvTags((t) => t.slice(0, -1));
                        }
                      }}
                      placeholder={advTags.length === 0 ? "type and press space..." : ""}
                      className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-gray-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">More fields = more specific results</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAdv({ firstName:"",lastName:"",nickname:"",organization:"",location:"",category:"",subjectId:"",recordId:"" }); setAdvTags([]); setAdvResults([]); }}
                      className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      Clear all
                    </button>
                    <button
                      onClick={runAdvancedSearch}
                      disabled={advLoading}
                      className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {advLoading ? "Searching..." : "Search →"}
                    </button>
                  </div>
                </div>

                {advResults.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4 space-y-2 max-h-[40vh] overflow-y-auto">
                    {advResults.map((item: any) => {
                      const href = item.type === "profile" ? `/subject/${item.id}` : `/record/${item.id}`;
                      return (
                        <>
                          <SearchResultCard
                            key={`${item.type}-${item.id}`}
                            type={item.type}
                            title={item.name || item.title || item.organization || `#${item.tag}`}
                            subtitle={item.organization || item.category || item.role}
                            location={item.location || item.city}
                            id={item.id}
                            href={href}
                            avatarUrl={item.avatar_url || null}
                            onRemove={() => console.log("Remove", item.id)}
                          />
                        </>
                      );
                    })}
                  </div>
                )}

                {advResults.length === 0 && !advLoading && Object.values(adv).some(Boolean) && (
                  <div className="mt-4 border-t border-gray-100 pt-4 text-center text-sm text-gray-400">
                    No results found
                  </div>
                )}
              </div>
            )}

            {/* 🔍 Desktop Results Dropdown */}
            {query && (
              <div className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-[70vh] overflow-y-auto p-4 space-y-6">
                {results.length > 0 ? (
                  <>
                    {["profile", "organization", "record", "category", "hashtag"].map((type) => {
                      const groupItems = results.filter((r) => r.type === type);
                      if (groupItems.length === 0) return null;
                      const title =
                        type === "profile" ? "Profiles" :
                        type === "organization" ? "Companies / Organizations" :
                        type === "record" ? "Records" :
                        type === "category" ? "Categories" : "Hashtags";
                      return (
                        <div key={type}>
                          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2 px-1">
                            {title}
                          </h3>
                          <ul className="space-y-2">
                            {groupItems.map((item: any) => {
                              const href =
                                item.type === "profile" ? `/subject/${item.id}` :
                                item.type === "organization" ? `/organization/${item.id}` :
                                item.type === "record" ? `/record/${item.id}` :
                                item.type === "hashtag" ? `/#${item.tag}` :
                                item.id ? `/category/${item.id}` :
                                `/search?category=${encodeURIComponent(item.name)}`;
                                return (
                                  <SearchResultCard
                                    key={`${type}-${item.id}`}
                                    type={item.type}
                                    title={item.name || item.title || item.organization || `#${item.tag}`}
                                    subtitle={item.organization || item.category || item.role}
                                    location={item.location || item.city}
                                    id={item.id}
                                    href={href}
                                    avatarUrl={item.avatar_url || null}
                                    onRemove={() => console.log("Remove", item.id)}
                                  />
                                );
                              })}
                            </ul>
                          </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <Search className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    No results found for "{query}"
                  </div>
                )}
              </div>
            )}
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
          {pathname !== "/dashboard/submit" && (
            <Link
              href="/dashboard/submit"
              className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <FilePlus className="h-4 w-4" />
              Submit A Record
            </Link>
          )}



          {/* 🧾 Mobile Submit Button (icon only) */}
          <Link
            href="/dashboard/submit"
            className="md:hidden p-2 rounded-md hover:bg-blue-100 text-blue-700 transition"
            title="Submit A Record"
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

          {/* Bell Icon */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="p-2 rounded-full hover:bg-gray-100 transition relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markOneRead(n.id);
                          if (n.record_id) window.location.href = `/record/${n.record_id}`;
                          setNotifOpen(false);
                        }}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${!n.read ? "bg-blue-50/60" : ""}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-blue-500" : "bg-transparent"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 leading-tight">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-gray-100 text-center">
                  <Link
                    href="/dashboard/settings/notifications"
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => setNotifOpen(false)}
                  >
                    Notification settings
                  </Link>
                </div>
              </div>
            )}
          </div>

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
            <div className="relative flex items-center gap-2 mb-4 border border-gray-200 rounded-full px-3 py-[5px] shadow-sm focus-within:ring-2 focus-within:ring-blue-600 transition-all">
              <Search className="text-gray-400 w-5 h-5 flex-shrink-0" />
              
              <div className="relative flex items-center flex-shrink-0">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="text-[13px] text-gray-700 bg-transparent border-none outline-none cursor-pointer appearance-none h-9 pl-1 pr-5 truncate max-w-[130px]"
                >
                  <option value="all">All</option>
                  <option value="profile">Profiles</option>
                  <option value="category">Category</option>
                  <option value="organization">Company / Organization</option>
                  <option value="record">Records</option>
                  <option value="hashtag">Hashtags</option>
                </select>
                <span className="absolute right-1 pointer-events-none text-gray-400 text-xs">⌄</span>
              </div>

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
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 min-w-0"
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
                            ? "Profiles"
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
                            <ul className="space-y-2">
                              {groupItems.map((item: any) => {
                                const href =
                                  item.type === "profile"
                                    ? `/subject/${item.id}`
                                    : item.type === "organization"
                                    ? `/organization/${item.id}`
                                    : item.type === "record"
                                    ? `/record/${item.id}`
                                    : item.type === "hashtag"
                                    ? `/#${item.tag}`
                                    : item.id
                                    ? `/category/${item.id}`
                                    : `/search?category=${encodeURIComponent(item.name)}`;

                                return (
                                  <SearchResultCard
                                    key={`${type}-${item.id}`}
                                    type={item.type}
                                    title={item.name || item.title || item.organization || `#${item.tag}`}
                                    subtitle={item.organization || item.category || item.role}
                                    location={item.location || item.city}
                                    id={item.id}
                                    href={href}
                                    avatarUrl={item.avatar_url || null}
                                    onRemove={() => console.log("Remove", item.id)}
                                  />
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
            const resolvedHref = item.special_profile && subjectId
              ? `/subject/${subjectId}`
              : item.href;
            return (
              <Link
                key={item.name}
                href={resolvedHref}
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

              const resolvedHref = item.special_profile && subjectId
                ? `/subject/${subjectId}`
                : item.href;
              return (
                <Link
                  key={item.name}
                  href={resolvedHref}
                  className={classes}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
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