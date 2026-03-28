"use client";
// Deployment trigger - search functionality improvements

import Link from "next/link";
import { searchSubjects } from "@/lib/searchSubjectsQuery";
import SearchResultCard from "@/components/SearchResultCard";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient"; // ✅ supabase client
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
      if (!query) {
        setLocationSuggestions([]);
        return;
      }
    
      try {
        const res = await fetch(`/api/location?input=${encodeURIComponent(query)}`);
        
        // Check if the response is OK first
        if (!res.ok) {
          console.warn("⚠️ Location API failed:", res.status);
          setLocationSuggestions([]); // fallback to empty
          return;
        }
        
        const data = await res.json();
    
        if (data.error) {
          console.error("Location API error:", data.error, data.details);
          setLocationSuggestions([]);
        } else {
          // ✅ Backend already gives { description: "Astoria, NY, USA" }
          setLocationSuggestions(data.predictions || []);
        }
      } catch (err) {
        console.error("Error fetching location suggestions:", err);
        setLocationSuggestions([]);
      }
    };
    
    const delayDebounce = setTimeout(() => fetchSuggestions(locationInput), 300);
    return () => clearTimeout(delayDebounce);
  }, [locationInput]);

  useEffect(() => {
    async function fetchRandomData() {
      // Fetch 2 random reputations
      const { data: repData, error: repError } = await supabase
        .from("reputations")
        .select("id, title, description")
        .limit(2);
  
      if (!repError && repData) setRandomReputations(repData);
  
      // Fetch 3 random badges
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

      if (
        menu &&
        !menu.contains(event.target as Node) &&
        button &&
        !button.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
  
  // 🔽 Supabase-powered states list
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
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    };

    const delay = setTimeout(run, 300);
    return () => clearTimeout(delay);
  }, [searchFirstName, searchLastName, nickname, organization, location, category, searchSubjectId, searchRecordId]);
  
  const handleSearch = async () => {
    const filters = {
      profileId,
      nickname,
      name,
      organization,
      category,
      location,
      relationship: searchRelationship,
      otherRelationship: searchRelationship === "other" ? searchOtherRelationship : "",
    };
  
    const results = await searchSubjects(filters);
    if (results && results.length > 0) {
      console.log("Search results:", results);
    } else {
      console.log("No results found");
    }
  };

  const handleHashtagSearch = async () => {
    if (!hashtag.trim()) {
      setHashtagMessage("Please enter a hashtag.");
      return;
    }
  
    setHashtagLoading(true);
    setHashtagMessage("");
  
    try {
      const res = await fetch(`/api/hashtags?hashtag=${encodeURIComponent(hashtag)}`);
  
      if (!res.ok) {
        console.error("API error:", res.statusText);
        setHashtagMessage(`No records found using #${hashtag}`);
        return;
      }
  
      const data = await res.json();
  
      if (!data.records || data.records.length === 0) {
        setHashtagMessage(`No records found using #${hashtag}`);
        return;
      }
  
      // ✅ If records exist, redirect to hashtag feed page
      router.push(`/hashtags/${encodeURIComponent(hashtag)}`);
    } catch (err) {
      console.error("Unexpected error:", err);
      setHashtagMessage(`No records found using #${hashtag}`);
    } finally {
      setHashtagLoading(false);
    }
  };

  useEffect(() => {
    async function fetchRelationshipTypes() {
      const { data, error } = await supabase
        .from("relationship_types")
        .select("id, label, value")
        .order("label", { ascending: true });
  
      if (error) {
        console.error("Error fetching relationship types:", error);
      } else {
        setRelationshipTypes(data || []);
      }
      setRelLoading(false);
    }
  
    fetchRelationshipTypes();
  }, []);
  
  const [submitState, setSubmitState] = useState("");

  const handleTermsScroll = () => {
    if (termsRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsRef.current
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10
      if (isScrolledToBottom && !hasReadTerms) {
        setHasReadTerms(true)
      }
    }
  }

  const handleClear = () => {
    setProfileId("");
    setNickname("");
    setName("");
    setOrganization("");
    setCategory("");
    setLocation("");
    setLocationInput("");
    setLocationSuggestions([]);
    setSearchRelationship("");
    setSearchOtherRelationship("");
    setOtherRelationship("");
    setSearchResults([]);
    setSearchMessage("");
    setShowResults(false);
    setFormKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 w-full z-50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo + Title */}
              <div
                className="flex items-center gap-2 sm:gap-4 cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <Image
                  src="/logo.png"
                  alt="DNounce Logo"
                  width={60}
                  height={60}
                  priority
                />
                <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                  DNounce
                </span>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden md:flex flex-1 justify-center gap-12">
                <button
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
                >
                  How DNounce Works
                </button>
                <button
                  onClick={() => document.getElementById("voting-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
                >
                  Community Review
                </button>
                <button
                  onClick={() => document.getElementById("guidelines-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
                >
                  Guidelines
                </button>
                <button
                  onClick={() => document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
                >
                  Legal
                </button>
              </nav>

              {/* Login Button + Mobile Menu Button */}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push("/loginsignup")}
                >
                  Login / Sign Up
                </Button>
                {/* Hamburger */}
                <div className="md:hidden flex items-center">
                  <button
                    id="menu-button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
                  >
                    ☰
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Dropdown Nav */}
            {mobileMenuOpen && (
              <div id="mobile-menu" className="md:hidden mt-3 space-y-2">
                <button
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
                >
                  How DNounce Works
                </button>
                <button
                  onClick={() => {
                    document.getElementById("voting-section")?.scrollIntoView({ behavior: "smooth" })
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
                >
                  Community Review
                </button>
                <button
                  onClick={() => {
                    document.getElementById("guidelines-section")?.scrollIntoView({ behavior: "smooth" })
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
                >
                  Guidelines
                </button>
                <button
                  onClick={() => {
                    document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left text-gray-700 font-medium hover:text-red-700 transition-colors text-sm"
                >
                  Legal
                </button>
              </div>
            )}
          </div>
        </header>

      {/* 🔽 Scroll Progress Bar */}
      <div
        className="fixed left-0 w-full h-[2px] bg-transparent"
        style={{
          top: "5.2rem", // aligns at the divider below the top bar
          zIndex: 60,
          position: "fixed",
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 blur-[1px] shadow-[0_0_12px_#38bdf8]"
          style={{
            width: `${scrollProgress}%`,
            transition: "width 0.15s linear",
          }}
        ></div>
      </div>

      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-5 leading-tight">
            Trusted, Transparent, 
            <br />
            Community-Powered Platform
          </h1>

          <p className="text-xl text-center text-gray-800 font-semibold mb-7 tracking-tight">
            “Truth isn’t owned. It’s earned — together.”
          </p>

          <p className="text-lg text-center text-gray-600 max-w-2xl mx-auto leading-relaxed mb-10">
            DNounce is an authentic, fair, and transparent review platform where people share real experiences, 
            supported by AI credibility recommendations and community insight.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              onClick={() => {
                const searchSection = document.getElementById("search-section")
                searchSection?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              Search Profiles
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
              onClick={() => {
                const submitSection = document.getElementById("submit-record-section")
                submitSection?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Share Feedback
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>AI Credibility Recommendation Feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>Up to 72-Hour AI Credibility Review</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Community Review</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span>Subject Response Portal</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How DNounce Works</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
            A clear, balanced process that safeguards both contributors and subjects, ensuring authentic and reliable feedback
            </p>
          </div>

          <div className="border border-blue-300 rounded-lg p-8 mb-8 bg-blue-50 mx-auto max-w-4xl">
            <div className="space-y-6 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-blue-600">
                  <span className="font-semibold text-blue-700">1. Record Submission:</span> Contributors share their real experiences with individuals through our platform.
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-600">
                  <span className="font-semibold text-blue-700">2. AI Credibility Label Classification (Up to 72 hours):</span> Analyzes any supporting evidence and recommends a credibility label.
                  <div className="ml-4 mt-1">✅ Evidence-Supported</div>
                  <div className="ml-4 mt-1">💭 Opinion Experience-Based</div>
                  <div className="ml-4 mt-1">⚠️ Unable to Give Verification Recommendation</div>
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-600">
                  <span className="font-semibold text-blue-700">3. Notification:</span> Both parties notified immediately after AI credibility label classification is completed
                  <div className="ml-4 mt-1">• Contributor: Learns whether AI classified record as evidence-based or opinion-based</div>
                  <div className="ml-4 mt-1">• Subject: Receives record details, classification, and right to challenge</div>
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-600">
                  <span className="font-semibold text-blue-700">4. Publication:</span> The review is published with its AI recommended credibility label for transparency.
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-600">
                  <span className="font-semibold text-blue-700">5. Subject Dispute & Debate:</span> Subject may request for deletion leading both parties to engage in a 72-hour debate.
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-600">
                  <span className="font-semibold text-blue-700">6. Community Review:</span> Community members help decide which reviews stay visible.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="search-section" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Search Profiles</h2>
            <p className="text-gray-600">Find reviews and reputation insights</p>
          </div>

          <Card className="p-6 bg-white shadow-lg rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {([
                ["First Name", searchFirstName, setSearchFirstName, "e.g. John"],
                ["Last Name",  searchLastName,  setSearchLastName,  "e.g. Doe"],
                ["Nickname",   nickname,        setNickname,        "e.g. JD"],
                ["Organization", organization,  setOrganization,    "e.g. Acme Corp"],
                ["Category",   category,        setCategory,        "e.g. Barber"],
                ["Subject ID", searchSubjectId, setSearchSubjectId, ""],
                ["Record ID",  searchRecordId,  setSearchRecordId,  ""],
              ] as [string, string, (v: string) => void, string][]).map(([label, value, setter, placeholder]) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                </div>
              ))}

              {/* Location with autocomplete */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Location</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Astoria, NY"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 w-full"
                  />
                  {locationSuggestions.length > 0 && (
                    <ul className="absolute z-50 bg-white border rounded-md w-full shadow-md mt-1 max-h-60 overflow-y-auto">
                      {locationSuggestions.map((s, idx) => (
                        <li
                          key={idx}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                          onClick={() => {
                            setLocation(s.description);
                            setLocationInput(s.description);
                            setLocationSuggestions([]);
                          }}
                        >
                          <MapPin className="w-4 h-4 text-gray-600 shrink-0" />
                          <span className="text-sm text-gray-800">{s.description}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400">More fields = more specific results</span>
              <button
                onClick={() => {
                  setSearchFirstName(""); setSearchLastName(""); setNickname("");
                  setOrganization(""); setCategory(""); setLocation("");
                  setLocationInput(""); setSearchSubjectId(""); setSearchRecordId("");
                  setSearchResults([]); setShowResults(false);
                }}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                Clear all
              </button>
            </div>

            {searchLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            )}

            {showResults && searchResults.length === 0 && !searchLoading && (
              <p className="text-center text-sm text-gray-400 py-4">No profiles found.</p>
            )}

            {showResults && searchResults.length > 0 && (
              <div className="space-y-2">
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
          </Card>

          {/* Hashtag Search Section */}
          <Card className="p-8 bg-white shadow-lg rounded-xl mt-8">
            <div className="flex flex-col items-center">
              <label className="mb-2 text-sm font-semibold text-gray-700">
                Search A Hashtag
              </label>
              <Input
                type="text"
                value={hashtag}
                onChange={(e) => setHashtag(e.target.value)}
                placeholder="Enter a hashtag (e.g. #Barber)"
                className="w-full md:w-1/2 rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 text-center"
              />

              {/* Buttons */}
              <div className="flex justify-center gap-4 mt-6">
                <Button
                  onClick={handleHashtagSearch}
                  disabled={!hashtag || hashtagLoading}   // ✅ disabled if input empty or loading
                  className="px-6 py-2 rounded-md text-sm"
                >
                  {hashtagLoading ? "Searching..." : "Search Hashtag"}
                </Button>

                <Button
                  variant="outline"
                  className="px-6 py-2 rounded-md text-sm"
                  onClick={() => {
                    setHashtag("");
                    setHashtagMessage("");
                  }}
                >
                  Clear
                </Button>
              </div>

              {/* Messages */}
              {hashtagMessage && (
                <p className="mt-4 text-sm text-gray-600 text-center">
                  {hashtagMessage}
                </p>
              )}
            </div>
          </Card>

          <div className="mt-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">EXAMPLE ONLY — NOT REAL DATA</p>
                <p className="text-sm text-yellow-700">This is a demonstration of how subject profiles appear on DNounce</p>
              </div>
            </div>

            <div className="border rounded-2xl bg-white p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">

                  {/* Header + Scores */}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* LEFT: Identity */}
                    <div className="flex flex-col">
                      <div className="grid grid-cols-[72px_1fr] gap-x-4 items-start">
                        <div className="w-[72px] h-[72px] bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          <User className="h-8 w-8 text-gray-500" />
                        </div>
                        <div className="flex flex-col gap-1 pt-0.5">
                          <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                            John Example <span className="text-gray-400 font-normal text-base">(JE)</span>
                          </h3>
                          <p className="text-sm text-gray-600">AutoFix Garage</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1"><span>📍</span> San Francisco, CA</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-semibold text-gray-800">Subject ID:</span>
                        <span className="font-mono text-gray-500">abc123…xyz789</span>
                        <button disabled className="inline-flex items-center justify-center rounded-full border p-1.5 text-gray-400 cursor-not-allowed">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* RIGHT: Scores */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                      {[
                        { label: "Subject Score",     val: "82" },
                        { label: "Overall Score",     val: "76" },
                        { label: "Contributor Score", val: "88" },
                        { label: "Voter Score",       val: "70" },
                        { label: "Citizen Score",     val: "91" },
                      ].map((s) => (
                        <div key={s.label}>
                          <p className="text-xl font-bold text-gray-900">{s.val}</p>
                          <p className="text-xs text-gray-600">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Record CTA */}
                  <div className="mt-6 mb-4 rounded-2xl border bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Want to share an experience about this subject?</div>
                      <div className="text-xs text-gray-600 mt-1">Sign in to submit a record. This subject will be pre-selected.</div>
                    </div>
                    <Link href="/loginsignup">
                      <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
                        Submit A Record
                      </button>
                    </Link>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b mb-6 mt-6 text-sm font-medium">
                    {(["records", "reputations", "social"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 text-center px-4 py-2 ${activeTab === tab ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {tab === "records" ? "Records About Me" : tab === "reputations" ? "Reputations & Badges" : "Social Media"}
                      </button>
                    ))}
                  </div>

                  {/* RECORDS TAB */}
                  {activeTab === "records" && (
                    <>
                      {/* Filters — disabled */}
                      <div className="mb-5 flex flex-wrap items-center gap-3">
                        {["Newest", "All stages", "All credibility recommendations", "All record types", "All time"].map((label) => (
                          <select key={label} disabled className="rounded-xl border px-3 py-2 text-sm bg-white text-gray-400 cursor-not-allowed">
                            <option>{label}</option>
                          </select>
                        ))}
                      </div>

                      {/* Breakdown */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3">Record Breakdown</h4>
                        <div className="grid grid-cols-3 gap-4">
                          {[["8","Total Records"],["5","Evidence-Based"],["3","Opinion-Based"]].map(([val, label]) => (
                            <div key={label} className="text-center">
                              <div className="text-2xl font-bold text-gray-900">{val}</div>
                              <div className="text-sm text-gray-500">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Record cards */}
                      <div className="space-y-4">
                        {[
                          {
                            title: "Unresolved Repairs and Poor Communication",
                            category: "Mechanic",
                            date: "Dec 15, 2024",
                            comments: 24,
                            cred: "Evidence-Based",
                            credColor: "text-green-700 bg-green-50 border-green-200",
                            credIcon: <CheckCircle className="w-3 h-3" />,
                            desc: "I've attached repair invoices and email exchanges that show how my car was kept for weeks without updates or resolution.",
                          },
                          {
                            title: "Average Service Experience",
                            category: "Mechanic",
                            date: "Dec 10, 2024",
                            comments: 12,
                            cred: "Opinion-Based",
                            credColor: "text-orange-700 bg-orange-50 border-orange-200",
                            credIcon: <AlertTriangle className="w-3 h-3" />,
                            desc: "In my opinion, the service was just okay. Nothing terrible happened, but I expected more professionalism from a certified shop.",
                          },
                        ].map((r) => (
                          <div key={r.title} className="w-full rounded-2xl border bg-white p-4 hover:shadow-sm hover:border-gray-300 transition">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="text-sm font-semibold text-gray-900">{r.title}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-500 whitespace-nowrap">AI Credibility Recommendation:</span>
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-2 py-0.5 ${r.credColor}`}>
                                  {r.credIcon} {r.cred}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-gray-700">{r.category}</span>
                              <span className="text-xs text-gray-500">📅 {r.date}</span>
                              <span className="text-xs text-gray-500">💬 {r.comments} comments</span>
                            </div>
                            <div className="mt-3 text-sm text-gray-700 line-clamp-3">{r.desc}</div>
                            <div className="mt-4 flex gap-2">
                              <button disabled className="rounded-xl border px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed">View record</button>
                              <button disabled className="rounded-xl border px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed">Expand</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>Rows:</span>
                          <select disabled className="rounded-lg border px-2 py-1 bg-white text-gray-400 cursor-not-allowed">
                            <option>10</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <button disabled className="rounded-lg border px-3 py-1.5 text-sm opacity-40">Prev</button>
                          <div className="text-sm text-gray-700">Page <span className="font-semibold">1</span> / 1</div>
                          <button disabled className="rounded-lg border px-3 py-1.5 text-sm opacity-40">Next</button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* REPUTATIONS TAB */}
                  {activeTab === "reputations" && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Badges</h4>
                      {randomBadges.length ? (
                        <div className="flex flex-wrap gap-3">
                          {randomBadges.map((badge) => (
                            <div key={badge.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-gray-50 text-sm font-medium text-gray-700">
                              <span>{badge.icon}</span>
                              <span>{badge.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No badges earned yet.</p>
                      )}
                    </div>
                  )}

                  {/* SOCIAL TAB */}
                  {activeTab === "social" && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Social Media</h4>
                      <div className="space-y-3">
                        {[
                          { platform: "Instagram", handle: "@johnexample", icon: "📸" },
                          { platform: "X / Twitter", handle: "@johnexample", icon: "🐦" },
                        ].map((s) => (
                          <div key={s.platform} className="flex items-center gap-4 rounded-xl border bg-white p-4">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
                              {s.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900">{s.platform}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{s.handle}</div>
                            </div>
                            <button disabled className="inline-flex items-center justify-center rounded-full border p-1.5 text-gray-400 cursor-not-allowed">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="voting-section" className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Community Review</h2>
            <p className="text-gray-600">Fair and transparent community moderation through public review</p>
          </div>

          <div className="border border-blue-300 rounded-lg p-6 mb-8 bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-700">What Are You Reviewing?</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Should this record be deleted?</h4>
              <p className="text-sm text-gray-600">
                The subject has requested deletion of this published record and participated in the debate process.
                You're deciding whether to grant their deletion request.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-800">KEEP PUBLISHED</h4>
                </div>
                <p className="text-sm text-green-600 mb-3">Deny deletion request - record stays public</p>
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Vote KEEP when:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>The evidence appears credible and substantial</li>
                    <li>The feedback provides value to the community</li>
                    <li>The public has a right to be informed</li>
                    <li>The record could help others in similar situations</li>
                  </ul>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-800">GRANT DELETION</h4>
                </div>
                <p className="text-sm text-red-600 mb-3">Approve deletion request - remove record</p>
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Vote GRANT DELETION when:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>The evidence is weak, questionable, or insufficient</li>
                    <li>The feedback appears frivolous or vindictive</li>
                    <li>The record violates community standards</li>
                    <li>Keeping it public would cause unjust harm</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-red-300 rounded-lg p-6 mb-8 bg-red-50">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-700">Voter Quality Badge System</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-red-700">20% Downvote Badge of Shame:</span>
                <span className="text-red-600"> Get 20% downvotes from total voters on your explanation → automatic "</span>
                <span className="text-yellow-600">⚠ Low-Quality Voter</span>
                <span className="text-red-600">" badge for the life of the record.</span>
              </div>

              <div>
                <span className="font-semibold text-red-700">33% Voter Trigger + Public Execution:</span>
                <span className="text-red-600"> If 33% of voters flag you + 50% public approval → automatic "</span>
                <span className="text-red-600 font-semibold">CONVICTED Lost Voting Right</span>
                <span className="text-red-600">" badge for the life of the record.</span>
              </div>

              <div className="text-red-600">
                <span className="font-medium">
                  Poor explanations damage your reputation in each record permanently and lowers your "Voter" Score. Write thoughtful, detailed reasoning.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="guidelines-section" className="bg-white pt-3 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Submission Guidelines</h2>
            <p className="text-gray-600">What makes appropriate feedback for our platform</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 bg-green-50 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">Appropriate Feedback</h3>
              </div>
              <ul className="space-y-3 text-sm text-green-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1">✅</span>
                  <span>Excellent customer or client support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">✅</span>
                  <span>Business transaction disputes with evidence</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">✅</span>
                  <span>Professional relationship experiences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">✅</span>
                  <span>Acknowledging accountability and integrity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">✅</span>
                  <span>Documenting patterns of reliability</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">✅</span>
                  <span>First-hand experiences with supporting evidence</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 bg-red-50 border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">Inappropriate Content</h3>
              </div>
              <ul className="space-y-3 text-sm text-red-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1">❌</span>
                  <span>Personal relationships without public relevance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">❌</span>
                  <span>Unverifiable hearsay or rumors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">❌</span>
                  <span>Protected class discrimination (race, religion, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">❌</span>
                  <span>Sexual harassment allegations (handle through proper channels)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">❌</span>
                  <span>Criminal allegations (report to law enforcement)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">❌</span>
                  <span>Content violating others' privacy rights</span>
                </li>
              </ul>
            </Card>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800">
                  AI Credibility Recommendation Feedback
                </h3>
              </div>
              <p className="text-xs text-blue-600 max-w-xl">
                Analyzes any supporting evidence and recommends a credibility label,
                including but not limited to the options below.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-700">
              <div>
                <h4 className="font-medium mb-2">Evidence-Based Classification:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Documented proof (emails, contracts, messages)</li>
                  <li>Verifiable timestamps and sources</li>
                  <li>Multiple independent evidence points</li>
                  <li>Clear connection to the subject</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Opinion-Based Classification:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Personal accounts without documentation</li>
                  <li>Single perspective experiences</li>
                  <li>Subjective interpretations</li>
                  <li>General character assessments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="legal-section" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Legal Framework</h2>
            <p className="text-gray-600">Understanding rights, responsibilities, and protections</p>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-green-50 border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-3">For Contributors</h3>
              <div className="space-y-3 text-sm text-green-700">
                <p>
                  <span className="font-medium">Truth Defense:</span> You're protected against defamation claims if your
                  submission is truthful or constitutes honest opinion.
                </p>
                <p>
                  <span className="font-medium">Fair Comment:</span> Opinions based on disclosed facts are generally
                  protected as fair comment.
                </p>
                <p>
                  <span className="font-medium">Public Interest:</span> Matters of legitimate public concern receive
                  greater protection.
                </p>
                <p>
                  <span className="font-medium">Responsibility:</span> You may be liable for knowingly false statements
                  or submissions made with malicious intent.
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-blue-50 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">For Subjects</h3>
              <div className="space-y-3 text-sm text-blue-700">
                <p>
                  <span className="font-medium">Right to Response:</span> You receive immediate notification of any
                  feedback and have full right to respond and challenge.
                </p>
                <p>
                  <span className="font-medium">Dispute Process:</span> Our 72-hour debate and community review process
                  provides a mechanism for challenging inaccurate information.
                </p>
                <p>
                  <span className="font-medium">Legal Recourse:</span> You maintain all legal rights against knowingly
                  false statements, with DNounce providing necessary information for legitimate legal actions.
                </p>
                <p>
                  <span className="font-medium">Privacy Considerations:</span> While DNounce is a public platform, we
                  comply with legitimate privacy concerns and legal requirements.
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-purple-50 border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">Platform Protections</h3>
              <div className="space-y-3 text-sm text-purple-700">
                <p>
                  <span className="font-medium">Section 230 Protection:</span> DNounce is protected from liability for
                  user-generated content under 47 U.S.C. § 230.
                </p>
                <p>
                  <span className="font-medium">Good Faith Moderation:</span> We engage in content moderation and
                  verification in good faith without losing liability protections.
                </p>
                <p>
                  <span className="font-medium">Transparent Processes:</span> All moderation and verification processes
                  are documented and available for legal examination.
                </p>
                <p>
                  <span className="font-medium">Legal Compliance:</span> We comply with legitimate court orders and
                  legal requirements while protecting user rights.
                </p>
              </div>
            </Card>
            <section id="submit-record-section" className="bg-gray-50 py-16">
              <div className="max-w-3xl mx-auto px-4">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Share Feedback</h2>
                  <p className="text-gray-600">Share experiences through our platform</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">EXAMPLE ONLY — NOT REAL DATA</p>
                    <p className="text-sm text-yellow-700">This is a preview. Sign up to submit a real record.</p>
                  </div>
                </div>

                <Card className="bg-white shadow-md rounded-2xl p-4 sm:p-6 md:p-8 space-y-8">

                  {/* Contact Information */}
                  <div className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm space-y-4">
                    <div className="text-center mb-2">
                      <h3 className="text-base font-semibold text-gray-900">Contact Information</h3>
                      <p className="text-sm text-gray-500">Enter a phone number and/or email to find matching DNounce users or existing subjects.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="mb-2 text-[15px] font-medium text-gray-800">Phone Number</label>
                        <Input placeholder="e.g. (718) 555-1234" disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-2 text-[15px] font-medium text-gray-800">Email Address</label>
                        <Input placeholder="e.g. johndoe@example.com" disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-700"><span className="font-semibold">Why we ask:</span> Every submission triggers a quick notification to the subject so they can view/respond.</p>
                    </div>
                  </div>

                  {/* Subject Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <label className="mb-2 text-[15px] font-medium text-gray-800">First Name <span className="text-red-500">*</span></label>
                        <Input placeholder="e.g. John" disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-2 text-[15px] font-medium text-gray-800">Last Name</label>
                        <Input placeholder="e.g. Doe" disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-2 text-[15px] font-medium text-gray-800">Also Known As</label>
                        <Input placeholder="e.g. Johnny" disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <label className="mb-2 text-[15px] font-medium text-gray-800">Organization / Company</label>
                        <Input placeholder="e.g. Acme Inc." disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-2 text-[15px] font-medium text-gray-800">Relationship <span className="text-red-500">*</span></label>
                        <Input placeholder="Select relationship" disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                      </div>
                      <div className="flex flex-col">
                        <label className="mb-2 text-[15px] font-medium text-gray-800">Category <span className="text-red-500">*</span></label>
                        <Input placeholder="e.g. Barber, Waitress, Na..." disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                        <p className="text-xs text-gray-400 mt-1">Use a label that best fits how you may find this person.</p>
                      </div>
                    </div>

                    <div className="flex flex-col max-w-xs">
                      <label className="mb-2 text-[15px] font-medium text-gray-800">Location <span className="text-red-500">*</span></label>
                      <Input placeholder="City or neighborhood..." disabled className="rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed" />
                      <p className="text-xs text-gray-400 mt-1">Type city name to see neighborhoods, or neighborhood to see full location.</p>
                    </div>
                  </div>

                  {/* Results placeholder */}
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Results</p>
                    <p className="text-sm text-gray-400">Matching profiles will appear here based on contact info.</p>
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <label className="text-[15px] font-medium text-gray-800">Rate Your Experience <span className="text-red-500">*</span></label>
                    <div className="flex gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Star key={i} className="w-6 h-6 text-gray-300" />
                      ))}
                    </div>
                  </div>

                  {/* Evidence Upload */}
                  <div className="space-y-2">
                    <label className="text-[15px] font-medium text-gray-800">Evidence Upload</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50">
                      <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-400 mb-1">Drag and drop files here or click to browse</p>
                      <p className="text-xs text-gray-400">Supported formats: PDF, JPG, PNG, MP4, DOCX (Max 100MB each)</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-[15px] font-medium text-gray-800">Experience Details <span className="text-red-500">*</span></label>
                    <textarea
                      disabled
                      placeholder="Share the details of your experience as clearly and accurately as possible."
                      className="w-full h-32 p-4 border border-gray-200 rounded-2xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed resize-none"
                    />
                  </div>

                  {/* Terms & Conditions */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        disabled
                        className="mt-1 cursor-not-allowed"
                      />
                      <label className="text-sm text-gray-400">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })}
                          className="text-blue-500 hover:underline"
                        >
                          Terms of Service
                        </button>{" "}
                        and confirm that my submission is truthful and complies with DNounce guidelines.
                      </label>
                    </div>

                    <div className="h-40 overflow-y-auto border border-gray-200 rounded-xl p-4 text-xs text-gray-500 bg-gray-50 leading-relaxed">
                      <h4 className="font-semibold mb-2 text-gray-700">Important Legal Notice:</h4>
                      <p className="mb-2">By submitting this feedback, you acknowledge that DNounce is a public reputation platform and your submission may be publicly visible after AI credibility label classification.</p>
                      <p className="mb-2">You certify that your submission is truthful to the best of your knowledge and based on either verifiable evidence or honest personal opinion.</p>
                      <p className="mb-2">False or malicious submissions may result in permanent account suspension and legal consequences.</p>
                      <p className="mb-2">The subject will be notified of this submission and will have the right to respond and challenge the information through our dispute resolution process.</p>
                      <p className="mb-2">All submissions undergo AI credibility label classification and may be reviewed by community moderators before publication.</p>
                      <p className="mb-2">You retain copyright of your original content but grant DNounce a license to display and distribute it as part of our platform services.</p>
                      <p className="mb-2">DNounce is not responsible for the accuracy of user submissions but provides tools for community verification and dispute resolution.</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-2">
                    <Link href="/loginsignup">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition text-sm">
                        Sign Up to Submit a Record →
                      </button>
                    </Link>
                    <p className="text-center text-xs text-gray-400 mt-3">Already have an account? <Link href="/loginsignup" className="text-blue-500 hover:underline">Log in</Link></p>
                  </div>

                </Card>
              </div>
            </section>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800">Important Disclaimer</h3>
              </div>
              <p className="text-sm text-yellow-700">
                DNounce provides a platform for reputation documentation but does not guarantee the accuracy of
                user submissions. We employ AI credibility label classification and community moderation processes, but users should
                independently verify information and consult legal professionals for specific advice. This platform
                is not a substitute for formal legal processes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">DNounce</h3>
              <p className="text-gray-400 text-sm">
              Verified public reputation platform for documenting real experiences through community-driven
              feedback and AI credibility recommended feedback.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Search Profiles</a></li>
                <li><a href="#" className="hover:text-white">Share Feedback</a></li>
                <li><a href="#" className="hover:text-white">Community Review</a></li>
                <li><a href="#" className="hover:text-white">Guidelines</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Transparency Report</a></li>
                <li><a href="#" className="hover:text-white">Legal Framework</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Support</a></li>
                <li><a href="#" className="hover:text-white">Appeal Process</a></li>
                <li><a href="#" className="hover:text-white">Status Page</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 DNounce. All rights reserved. Verifying experiences, preserving reputations.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}