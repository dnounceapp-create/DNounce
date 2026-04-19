"use client";
// Deployment trigger - search functionality improvements

import Link from "next/link";
import { searchSubjects } from "@/lib/searchSubjectsQuery";
import SearchResultCard from "@/components/SearchResultCard";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Search,
  Upload,
  Shield,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  User,
  ChevronsUpDown,
  Check,
  Copy,
  Star,
  MapPin,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

function buildNoProfileMessage({
  profileId,
  nickname,
  name,
  organization,
  category,
  location,
  relationship,
  otherRelationship,
  relationshipTypes,
}: {
  profileId?: string;
  nickname?: string;
  name?: string;
  organization?: string;
  category?: string;
  location?: string;
  relationship?: string;
  otherRelationship?: string;
  relationshipTypes: { id: string; label: string; value?: string }[];
}) {
  const capitalizeFirst = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const pieces: string[] = [];

  if (profileId) pieces.push(`with profile ID ${profileId}`);
  if (nickname) pieces.push(`known as "${capitalizeFirst(nickname)}"`);
  if (name) pieces.push(`named ${capitalizeFirst(name)}`);
  if (organization) pieces.push(`at ${capitalizeFirst(organization)}`);
  if (category) pieces.push(`identified as ${capitalizeFirst(category)}`);
  if (location) pieces.push(`in ${location}`);
  if (relationship) {
    const relType = relationshipTypes.find(rel => rel.id === relationship);
    if (relType) {
      if (relType.value === "other" && otherRelationship) {
        pieces.push(`with other relationship being ${otherRelationship}`);
      } else {
        pieces.push(`with a ${relType.label.toLowerCase()} relationship`);
      }
    }
  }

  return `No profile found ${pieces.join(" ")}.`;
}

export default function HomePage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"records" | "reputations" | "social">("records");
  const [formKey, setFormKey] = useState(0);
  const [relationshipTypes, setRelationshipTypes] = useState<{ id: string; label: string; value: string }[]>([]);
  const [relLoading, setRelLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [randomReputations, setRandomReputations] = useState<any[]>([]);
  const [randomBadges, setRandomBadges] = useState<any[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [showResults, setShowResults] = useState(false);

  const [fromDemo, setFromDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setFromDemo(params.get("from") === "demo");
      const section = params.get("section") || window.location.hash.replace("#", "");
      if (section) {
        setTimeout(() => {
          document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
        }, 200);
      }
    }

    // 🔍 Track home/demo page view
    supabase.auth.getSession().then(({ data: sessionData }) => {
      const isDemo = new URLSearchParams(window.location.search).get("from") === "demo" || window.location.pathname === "/demo";
      supabase.from("page_views").insert({
        page_type: isDemo ? "demo" : "home",
        page_id: null,
        viewer_auth_user_id: sessionData?.session?.user?.id ?? null,
        is_anonymous: !sessionData?.session?.user?.id,
      }).then(() => {});
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (scrollTop / docHeight) * 100;
      setScrollProgress(scrolled);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async (query: string) => {
      if (!query) { setLocationSuggestions([]); return; }
      try {
        const res = await fetch(`/api/location?input=${encodeURIComponent(query)}`);
        if (!res.ok) { setLocationSuggestions([]); return; }
        const data = await res.json();
        if (data.error) { setLocationSuggestions([]); }
        else { setLocationSuggestions(data.predictions || []); }
      } catch (err) { setLocationSuggestions([]); }
    };
    const delayDebounce = setTimeout(() => fetchSuggestions(locationInput), 100);
    return () => clearTimeout(delayDebounce);
  }, [locationInput]);

  useEffect(() => {
    async function fetchRandomData() {
      const { data: repData, error: repError } = await supabase
        .from("reputations")
        .select("id, title, description")
        .limit(2);
      if (!repError && repData) setRandomReputations(repData);

      const { data: badgeData, error: badgeError } = await supabase
        .from("badges")
        .select("id, label, icon, color")
        .limit(3);
      if (!badgeError && badgeData) setRandomBadges(badgeData);
    }
    fetchRandomData();
  }, []);

  useEffect(() => {
    console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Anon key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const menu = document.getElementById("mobile-menu");
      const button = document.getElementById("menu-button");
      if (menu && !menu.contains(event.target as Node) && button && !button.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) { document.addEventListener("mousedown", handleClickOutside); }
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [mobileMenuOpen]);

  const [profileId, setProfileId] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [organization, setOrganization] = useState("");
  const [otherRelationship, setOtherRelationship] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [searchFirstName, setSearchFirstName] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [searchSubjectId, setSearchSubjectId] = useState("");
  const [searchRecordId, setSearchRecordId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [hashtagMessage, setHashtagMessage] = useState("");
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [submitName, setSubmitName] = useState<string>("");
  const [submitNickname, setSubmitNickname] = useState<string>("");
  const [submitOrganization, setSubmitOrganization] = useState<string>("");
  const [submitRelationship, setSubmitRelationship] = useState<string>("");
  const [submitOtherRelationship, setSubmitOtherRelationship] = useState<string>("");
  const [submitCategory, setSubmitCategory] = useState<string>("");
  const [submitLocation, setSubmitLocation] = useState<string>("");
  const [states, setStates] = useState<{ state_abbreviation: string; full_state_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSubmitState, setOpenSubmitState] = useState(false);
  const [searchRelationship, setSearchRelationship] = useState("");
  const [searchOtherRelationship, setSearchOtherRelationship] = useState("");

  useEffect(() => {
    const hasAny = searchFirstName || searchLastName || nickname || organization || location || category || searchSubjectId || searchRecordId;
    if (!hasAny) { setSearchResults([]); setShowResults(false); return; }
    const run = async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchFirstName) params.set("firstName", searchFirstName);
        if (searchLastName)  params.set("lastName",  searchLastName);
        if (nickname)        params.set("nickname",   nickname);
        if (organization)    params.set("organization", organization);
        if (location)        params.set("location",   location);
        if (category)        params.set("category",   category);
        if (searchSubjectId) params.set("subjectId",  searchSubjectId);
        if (searchRecordId)  params.set("recordId",   searchRecordId);
        const res = await fetch(`/api/advancedsearch?${params}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowResults(true);
      } catch (err) { console.error("Search error:", err); }
      finally { setSearchLoading(false); }
    };
    const delay = setTimeout(run, 100);
    return () => clearTimeout(delay);
  }, [searchFirstName, searchLastName, nickname, organization, location, category, searchSubjectId, searchRecordId]);

  const handleSearch = async () => {
    const filters = {
      profileId, nickname, name, organization, category, location,
      relationship: searchRelationship,
      otherRelationship: searchRelationship === "other" ? searchOtherRelationship : "",
    };
    const results = await searchSubjects(filters);
    if (results && results.length > 0) { console.log("Search results:", results); }
    else { console.log("No results found"); }
  };

  const handleHashtagSearch = async () => {
    if (!hashtag.trim()) { setHashtagMessage("Please enter a hashtag."); return; }
    setHashtagLoading(true);
    setHashtagMessage("");
    try {
      const res = await fetch(`/api/hashtags?hashtag=${encodeURIComponent(hashtag)}`);
      if (!res.ok) { setHashtagMessage(`No records found using #${hashtag}`); return; }
      const data = await res.json();
      if (!data.records || data.records.length === 0) { setHashtagMessage(`No records found using #${hashtag}`); return; }
      router.push(`/hashtags/${encodeURIComponent(hashtag)}`);
    } catch (err) { setHashtagMessage(`No records found using #${hashtag}`); }
    finally { setHashtagLoading(false); }
  };

  useEffect(() => {
    async function fetchRelationshipTypes() {
      const { data, error } = await supabase
        .from("relationship_types")
        .select("id, label, value")
        .order("label", { ascending: true });
      if (error) { console.error("Error fetching relationship types:", error); }
      else { setRelationshipTypes(data || []); }
      setRelLoading(false);
    }
    fetchRelationshipTypes();
  }, []);

  const [submitState, setSubmitState] = useState("");

  const handleTermsScroll = () => {
    if (termsRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsRef.current;
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10;
      if (isScrolledToBottom && !hasReadTerms) { setHasReadTerms(true); }
    }
  };

  const handleClear = () => {
    setProfileId(""); setNickname(""); setName(""); setOrganization("");
    setCategory(""); setLocation(""); setLocationInput(""); setLocationSuggestions([]);
    setSearchRelationship(""); setSearchOtherRelationship(""); setOtherRelationship("");
    setSearchResults([]); setSearchMessage(""); setShowResults(false);
    setFormKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 fixed top-0 left-0 w-full z-50">
        <div className="max-w-6xl mx-auto px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <Image src="/logo.png" alt="DNounce Logo" width={74} height={74} priority />
              <span className="text-xl font-bold text-gray-900 tracking-tight">DNounce</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => { window.history.replaceState(null, "", fromDemo ? "/?from=demo&section=how-it-works" : "/?section=how-it-works"); document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); }} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</button>
              <button onClick={() => { window.history.replaceState(null, "", fromDemo ? "/?from=demo&section=voting-section" : "/?section=voting-section"); document.getElementById("voting-section")?.scrollIntoView({ behavior: "smooth" }); }} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Community</button>
              <button onClick={() => { window.history.replaceState(null, "", fromDemo ? "/?from=demo&section=guidelines-section" : "/?section=guidelines-section"); document.getElementById("guidelines-section")?.scrollIntoView({ behavior: "smooth" }); }} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Guidelines</button>
              <button onClick={() => { window.history.replaceState(null, "", fromDemo ? "/?from=demo&section=legal-section" : "/?section=legal-section"); document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" }); }} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Legal</button>
            </nav>

            <div className="flex items-center gap-3">
              {fromDemo && (
                <button onClick={() => router.push("/demo")} className="hidden md:block text-sm text-gray-500 hover:text-gray-900 transition-colors">← Back to demo</button>
              )}
              <button onClick={() => router.push("/loginsignup")} className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">Log in</button>
              <button onClick={() => router.push("/loginsignup")} className="bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">Get started</button>
              <button id="menu-button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <div className="w-4 h-0.5 bg-current mb-1" /><div className="w-4 h-0.5 bg-current mb-1" /><div className="w-4 h-0.5 bg-current" />
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden pt-4 pb-2 space-y-1 border-t border-gray-100 mt-3">
              {[["How it works","how-it-works"],["Community","voting-section"],["Guidelines","guidelines-section"],["Legal","legal-section"]].map(([label, id]) => (
                <button key={id} onClick={() => { window.history.replaceState(null, "", fromDemo ? `/?from=demo&section=${id}` : `/?section=${id}`); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">{label}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Back to demo button (only when coming from demo) ── */}
      {fromDemo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => router.push("/demo")}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-full px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            ← Back to demo
          </button>
        </div>
      )}

      {/* ── Scroll Progress Bar ─────────────────────────────────────────────── */}
      <div className="fixed left-0 w-full h-[2px] bg-transparent" style={{ top: "6.1rem", zIndex: 60, position: "fixed" }}>
        <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 blur-[1px] shadow-[0_0_12px_#38bdf8]" style={{ width: `${scrollProgress}%`, transition: "width 0.15s linear" }} />
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pb-20 px-5" style={{ paddingTop: "103px" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Community-moderated reviews
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 leading-[1.05] tracking-tight mb-8">
            Reviews that tell<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">the full story.</span>
          </h1>

          <Image
            src="/logo.png"
            alt="DNounce"
            width={200}
            height={200}
            className="mx-auto mb-8"
          />

          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
            DNounce is a review platform where someone submits a record about you — you get to share your side. The community reads both sides of the story, and decides if it stays on your profile.
          </p>
          {/*
          <div className="flex justify-center">
            The first time<button
              onClick={() => document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold px-7 py-3.5 rounded-2xl transition-all text-sm"
            >
              <Search className="w-4 h-4" />
              Search Profiles
            </button>
          </div>

          <p className="mt-6 text-sm text-gray-400">Used by people who want to share experiences and build trust.</p>*/}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            {[
              { icon: <CheckCircle className="w-4 h-4 text-green-500" />, label: "Credibility reviewed" },
              { icon: <Clock className="w-4 h-4 text-amber-500" />, label: "72-hour review window" },
              { icon: <Users className="w-4 h-4 text-blue-500" />, label: "Community moderated" },
              { icon: <MessageSquare className="w-4 h-4 text-violet-500" />, label: "Subject response portal" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">{item.icon}<span>{item.label}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-gray-50 py-20 px-5 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-500">A fair process for everyone involved.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Submit a record", desc: "Share your experience clearly and honestly." },
              { step: "02", title: "Credibility review", desc: "Language analysis classifies it as evidence-based, opinion-based, or unable to verify." },
              { step: "03", title: "Subject notified", desc: "The person receives the record and can review it." },
              { step: "04", title: "Published", desc: "The record goes live with its credibility label." },
              { step: "05", title: "Dispute & debate", desc: "The subject can dispute the record, triggering a 72-hour debate." },
              { step: "06", title: "Community votes", desc: "The community decides if record is valid." },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-xs font-mono text-gray-400 mb-3">{item.step}</div>
                <div className="font-semibold text-gray-900 mb-1.5">{item.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Tension line */}
          <div className="mt-12 text-center">
            <p className="text-base text-gray-400 italic">"Every story has more than one side."</p>
          </div>
        </div>
      </section>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <section id="search-section" className="bg-white py-10 sm:py-20 px-5 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Search profiles</h2>
            <p className="text-gray-500">Find records and reputation insights.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {([
                ["First Name", searchFirstName, setSearchFirstName, "John"],
                ["Last Name",  searchLastName,  setSearchLastName,  "Doe"],
                ["Nickname",   nickname,        setNickname,        "JD"],
                ["Organization", organization, setOrganization,    "Acme Corp"],
                ["Category",   category,        setCategory,        "Barber"],
                ["Subject ID", searchSubjectId, setSearchSubjectId, ""],
                ["Record ID",  searchRecordId,  setSearchRecordId,  ""],
              ] as [string, string, (v: string) => void, string][]).map(([label, value, setter, placeholder]) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="h-9 px-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder:text-gray-300"
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Location</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Astoria, NY"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    className="h-9 px-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 w-full placeholder:text-gray-300"
                  />
                  {locationSuggestions.length > 0 && (
                    <ul className="absolute z-50 bg-white border border-gray-100 rounded-xl w-full shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {locationSuggestions.map((s, idx) => (
                        <li key={idx} className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-sm" onClick={() => { setLocation(s.description); setLocationInput(s.description); setLocationSuggestions([]); }}>
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-700">{s.description}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400">More fields = more precise results</span>
              <button onClick={() => { setSearchFirstName(""); setSearchLastName(""); setNickname(""); setOrganization(""); setCategory(""); setLocation(""); setLocationInput(""); setSearchSubjectId(""); setSearchRecordId(""); setSearchResults([]); setShowResults(false); }} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Clear all</button>
            </div>

            {searchLoading && (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              </div>
            )}
            {showResults && searchResults.length === 0 && !searchLoading && (
              <p className="text-center text-sm text-gray-400 py-6">No profiles found.</p>
            )}
            {showResults && searchResults.length > 0 && (
              <div className="space-y-2 mt-2">
                {searchResults.map((item: any) => (
                  <SearchResultCard
                    key={`${item.type}-${item.id}`}
                    type={item.type || "profile"}
                    title={item.name || "Unnamed Profile"}
                    nickname={item.nickname}
                    subtitle={item.organization}
                    location={item.location}
                    category={item.category}
                    id={item.id}
                    href={item.type === "record" ? `/record/${item.id}` : `/subject/${item.id}`}
                    avatarUrl={item.avatar_url || null}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Hashtag Search */}
          <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="text-sm font-medium text-gray-700">Search by hashtag</div>
              <div className="flex w-full max-w-sm gap-2">
                <Input
                  type="text"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  placeholder="#Barber"
                  className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 text-center"
                />
                <Button onClick={handleHashtagSearch} disabled={!hashtag || hashtagLoading} className="rounded-xl px-5">
                  {hashtagLoading ? "..." : "Search"}
                </Button>
              </div>
              {hashtagMessage && <p className="text-sm text-gray-500 text-center">{hashtagMessage}</p>}
            </div>
          </div>

          {/* Example profile preview */}
          <div className="mt-8">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs font-medium text-amber-700">Example only — not real data</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">John Example <span className="text-gray-400 font-normal text-base">(JE)</span></h3>
                    <p className="text-sm text-gray-500">AutoFix Garage</p>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> San Francisco, CA</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span className="font-medium text-gray-600">ID:</span>
                      <span className="font-mono">abc123…xyz789</span>
                      <button disabled className="rounded-full border p-1 text-gray-300 cursor-not-allowed"><Copy className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 text-center">
                  {[["82","Subject"],["76","Overall"],["88","Contributor"],["70","Voter"],["91","Citizen"]].map(([val, label]) => (
                    <div key={label}>
                      <div className="text-xl font-bold text-gray-900">{val}</div>
                      <div className="text-[11px] text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Share an experience about this person</div>
                  <div className="text-xs text-gray-500 mt-0.5">Sign in to submit a record.</div>
                </div>
                <Link href="/loginsignup">
                  <button className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-medium transition">Submit Record</button>
                </Link>
              </div>

              <div className="flex border-b border-gray-100 mb-5 text-sm font-medium">
                {(["records","reputations","social"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 text-center py-2.5 transition-colors ${activeTab === tab ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                    {tab === "records" ? "Records" : tab === "reputations" ? "Badges" : "Social"}
                  </button>
                ))}
              </div>

              {activeTab === "records" && (
                <>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {["Newest","All stages","All credibility","All types","All time"].map((label) => (
                      <select key={label} disabled className="rounded-xl border border-gray-100 px-3 py-1.5 text-xs bg-white text-gray-300 cursor-not-allowed"><option>{label}</option></select>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    {[["8","Total"],["5","Evidence-Based"],["3","Opinion-Based"]].map(([val, label]) => (
                      <div key={label}>
                        <div className="text-2xl font-bold text-gray-900">{val}</div>
                        <div className="text-xs text-gray-400">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {[
                      { title: "Unresolved Repairs and Poor Communication", category: "Mechanic", date: "Dec 15, 2024", comments: 24, cred: "Evidence-Based", credColor: "text-green-700 bg-green-50 border-green-200", credIcon: <CheckCircle className="w-3 h-3" />, desc: "I've attached repair invoices and email exchanges that show how my car was kept for weeks without updates or resolution." },
                      { title: "Average Service Experience", category: "Mechanic", date: "Dec 10, 2024", comments: 12, cred: "Opinion-Based", credColor: "text-orange-700 bg-orange-50 border-orange-200", credIcon: <AlertTriangle className="w-3 h-3" />, desc: "In my opinion, the service was just okay. Nothing terrible happened, but I expected more professionalism." },
                    ].map((r) => (
                      <div key={r.title} className="rounded-2xl border border-gray-100 bg-white p-4 hover:border-gray-200 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="text-sm font-semibold text-gray-900">{r.title}</div>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-2.5 py-0.5 whitespace-nowrap ${r.credColor}`}>{r.credIcon} {r.cred}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                          <span>{r.category}</span><span>·</span><span>{r.date}</span><span>·</span><span>{r.comments} comments</span>
                        </div>
                        <div className="mt-3 text-sm text-gray-600 line-clamp-2">{r.desc}</div>
                        <div className="mt-3 flex gap-2">
                          <button disabled className="rounded-lg border px-3 py-1 text-xs text-gray-300 cursor-not-allowed">View</button>
                          <button disabled className="rounded-lg border px-3 py-1 text-xs text-gray-300 cursor-not-allowed">Expand</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>Rows:</span>
                      <select disabled className="rounded-lg border px-2 py-1 bg-white text-gray-300 cursor-not-allowed"><option>10</option></select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button disabled className="rounded-lg border px-3 py-1.5 text-sm text-gray-300 cursor-not-allowed">Prev</button>
                      <span className="text-sm text-gray-500">Page <span className="font-semibold">1</span> / 1</span>
                      <button disabled className="rounded-lg border px-3 py-1.5 text-sm text-gray-300 cursor-not-allowed">Next</button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "reputations" && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Badges</h4>
                  {randomBadges.length ? (
                    <div className="flex flex-wrap gap-2">
                      {randomBadges.map((badge) => (
                        <div key={badge.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
                          <span>{badge.icon}</span><span>{badge.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No badges yet.</p>
                  )}
                </div>
              )}

              {activeTab === "social" && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Social</h4>
                  <div className="space-y-2">
                    {[{ platform: "Instagram", handle: "@johnexample", icon: "📸" }, { platform: "X / Twitter", handle: "@johnexample", icon: "🐦" }].map((s) => (
                      <div key={s.platform} className="flex items-center gap-3 rounded-xl border border-gray-100 p-4">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base shrink-0">{s.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{s.platform}</div>
                          <div className="text-xs text-gray-400">{s.handle}</div>
                        </div>
                        <button disabled className="rounded-full border p-1.5 text-gray-300 cursor-not-allowed"><Copy className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Community Review ───────────────────────────────────────────────── */}
      <section id="voting-section" className="bg-gray-50 py-20 px-5 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Community review</h2>
            <p className="text-gray-500">The community decides what stays visible.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Should this record be deleted?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">The subject has requested deletion and completed the debate process. You decide.</p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Keep published</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li>· Evidence appears credible</li>
                  <li>· Record provides community value</li>
                  <li>· Public has right to be informed</li>
                  <li>· Could help others in similar situations</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-800">Grant deletion</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li>· Evidence is weak or insufficient</li>
                  <li>· Record appears vindictive</li>
                  <li>· Violates community standards</li>
                  <li>· Keeping it causes unjust harm</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Voter quality matters</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p><span className="font-medium text-gray-900">20% downvotes</span> on your explanation → <span className="text-amber-600">⚠ Low-Quality Voter</span> badge for the life of that record.</p>
              <p><span className="font-medium text-gray-900">33% voter flags + 50% public approval</span> → <span className="text-red-600 font-semibold">Convicted</span> — voting right removed for that record.</p>
              <p className="text-gray-400">Poor explanations permanently lower your Voter Score. Write thoughtful, detailed reasoning.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Guidelines ─────────────────────────────────────────────────────── */}
      <section id="guidelines-section" className="bg-white py-20 px-5 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Submission guidelines</h2>
            <p className="text-gray-500">What belongs on DNounce — and what doesn't.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Appropriate</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-green-700">
                {["Excellent client or customer service","Business disputes with supporting evidence","Professional relationship experiences","Patterns of reliability or accountability","First-hand experiences you can describe clearly"].map((item) => (
                  <li key={item} className="flex items-start gap-2"><span className="mt-0.5 shrink-0">✅</span><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Not appropriate</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-red-700">
                {["Personal relationships without public relevance","Unverifiable hearsay or rumors","Protected class discrimination","Sexual harassment (use proper channels)","Criminal allegations (report to law enforcement)","Content violating privacy rights"].map((item) => (
                  <li key={item} className="flex items-start gap-2"><span className="mt-0.5 shrink-0">❌</span><span>{item}</span></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Credibility labels</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-700">
              <div>
                <div className="font-medium mb-2">Evidence-Based</div>
                <ul className="space-y-1 text-blue-600">
                  <li>· Documented proof (emails, contracts)</li>
                  <li>· Verifiable timestamps and sources</li>
                  <li>· Multiple independent evidence points</li>
                </ul>
              </div>
              <div>
                <div className="font-medium mb-2">Opinion-Based</div>
                <ul className="space-y-1 text-blue-600">
                  <li>· Personal accounts without documentation</li>
                  <li>· Single-perspective experiences</li>
                  <li>· Subjective interpretations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Legal ──────────────────────────────────────────────────────────── */}
      <section id="legal-section" className="bg-gray-50 py-20 px-5 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Legal framework</h2>
            <p className="text-gray-500">Rights, responsibilities, and protections — for everyone.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-green-200 rounded-2xl p-6">
              <h3 className="font-semibold text-green-800 mb-3">For contributors</h3>
              <div className="space-y-2.5 text-sm text-gray-600">
                <p><span className="font-medium text-gray-800">Truth defense:</span> Truthful submissions are protected against defamation claims.</p>
                <p><span className="font-medium text-gray-800">Fair comment:</span> Opinions based on disclosed facts are generally protected.</p>
                <p><span className="font-medium text-gray-800">Responsibility:</span> You may be liable for knowingly false or malicious statements.</p>
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-2xl p-6">
              <h3 className="font-semibold text-blue-800 mb-3">For subjects</h3>
              <div className="space-y-2.5 text-sm text-gray-600">
                <p><span className="font-medium text-gray-800">Right to respond:</span> You're notified immediately and can challenge any record.</p>
                <p><span className="font-medium text-gray-800">Dispute process:</span> 72-hour debate and community review to challenge inaccurate information.</p>
                <p><span className="font-medium text-gray-800">Legal recourse:</span> You retain all legal rights against knowingly false statements.</p>
              </div>
            </div>

            <div className="bg-white border border-purple-200 rounded-2xl p-6">
              <h3 className="font-semibold text-purple-800 mb-3">Platform protections</h3>
              <div className="space-y-2.5 text-sm text-gray-600">
                <p><span className="font-medium text-gray-800">Section 230:</span> DNounce is protected from liability for user-generated content under 47 U.S.C. § 230.</p>
                <p><span className="font-medium text-gray-800">Good faith moderation:</span> Content moderation is conducted in good faith.</p>
                <p><span className="font-medium text-gray-800">Legal compliance:</span> We comply with legitimate court orders while protecting user rights.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Submit Record (Preview) ─────────────────────────────────────────── */}
      <section id="submit-record-section" className="bg-white py-20 px-5">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Share an experience</h2>
            <p className="text-gray-500">Help others understand the full picture.</p>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs font-medium text-amber-700">Example only — sign up to submit a real record.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Contact information</h3>
                <p className="text-xs text-gray-500">Used to find existing profiles and notify the subject.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone number</label>
                  <Input placeholder="(718) 555-1234" disabled className="rounded-xl bg-white text-gray-300 cursor-not-allowed border-gray-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                  <Input placeholder="johndoe@example.com" disabled className="rounded-xl bg-white text-gray-300 cursor-not-allowed border-gray-200" />
                </div>
              </div>
            </div>

            {/* Subject Info */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[["First Name *","John"],["Last Name","Doe"],["Also Known As","Johnny"]].map(([label, ph]) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                    <Input placeholder={ph} disabled className="rounded-xl bg-gray-50 text-gray-300 cursor-not-allowed border-gray-100" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[["Organization","Acme Inc."],["Relationship *","Select"],["Category *","Barber, Waitress..."]].map(([label, ph]) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                    <Input placeholder={ph} disabled className="rounded-xl bg-gray-50 text-gray-300 cursor-not-allowed border-gray-100" />
                  </div>
                ))}
              </div>
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Location *</label>
                <Input placeholder="City or neighborhood..." disabled className="rounded-xl bg-gray-50 text-gray-300 cursor-not-allowed border-gray-100" />
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Rate your experience *</label>
              <div className="flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => <Star key={i} className="w-6 h-6 text-gray-200" />)}
              </div>
            </div>

            {/* Evidence Upload */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Evidence (optional)</label>
              <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center bg-gray-50">
                <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Drag and drop or click to browse</p>
                <p className="text-[11px] text-gray-300 mt-1">PDF, JPG, PNG, MP4, DOCX — max 100MB each</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Experience details *</label>
              <textarea disabled placeholder="Describe your experience clearly and accurately." className="w-full h-28 p-4 border border-gray-100 rounded-2xl text-sm text-gray-300 bg-gray-50 cursor-not-allowed resize-none" />
            </div>

            {/* Terms */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" disabled className="mt-1 cursor-not-allowed" />
                <label className="text-xs text-gray-400">
                  I agree to the{" "}
                  <button type="button" onClick={() => document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })} className="text-blue-500 hover:underline">Terms of Service</button>{" "}
                  and confirm my submission is truthful and complies with DNounce guidelines.
                </label>
              </div>
              <div className="h-36 overflow-y-auto border border-gray-100 rounded-xl p-4 text-xs text-gray-400 bg-gray-50 leading-relaxed">
                <p className="font-semibold mb-2 text-gray-600">Important Legal Notice</p>
                <p className="mb-2">By submitting, you acknowledge this is a public platform and your submission may be publicly visible after credibility classification.</p>
                <p className="mb-2">You certify your submission is truthful and based on verifiable evidence or honest personal opinion.</p>
                <p className="mb-2">False or malicious submissions may result in account suspension and legal consequences.</p>
                <p className="mb-2">The subject will be notified and has the right to respond through our dispute resolution process.</p>
                <p className="mb-2">All submissions undergo credibility classification and may be reviewed by community moderators.</p>
                <p>DNounce is not responsible for submission accuracy but provides tools for community verification and dispute resolution.</p>
              </div>
            </div>

            {/* CTA */}
            <div>
              <Link href="/loginsignup">
                <button className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3.5 rounded-2xl transition text-sm">
                  Sign up to submit →
                </button>
              </Link>
              <p className="text-center text-xs text-gray-400 mt-3">Already have an account? <Link href="/loginsignup" className="text-blue-500 hover:underline">Log in</Link></p>
            </div>
          </div>

          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">DNounce provides a platform for reputation documentation but does not guarantee the accuracy of user submissions. Users should independently verify information and consult legal professionals for specific advice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 py-20 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">Create your profile or share your first experience today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => router.push("/loginsignup")} className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold px-7 py-3.5 rounded-2xl transition text-sm">
              Create Profile <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => document.getElementById("submit-record-section")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white font-semibold px-7 py-3.5 rounded-2xl transition text-sm border border-gray-700">
              Share Experience
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-white py-12 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo.png" alt="DNounce" width={24} height={24} />
                <span className="font-semibold text-white">DNounce</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">Reputation records with context, reviewed by the community.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                {["Search Profiles","Share Experience","Community Review","Guidelines"].map((item) => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                {[["Terms of Service","/legal#terms"],["Privacy Policy","/legal#privacy"],["Transparency Report","/legal#transparency"],["Legal Framework","/legal#framework"]].map(([label, href]) => (
                  <li key={label}><a href={href} className="hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Support</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                {[["Help Center","/support"], ["Status Page","/support#status"]].map(([label, href]) => (
                  <li key={label}><a href={href} className="hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
            © 2024 DNounce. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}