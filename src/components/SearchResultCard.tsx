"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Building2,
  Layers,
  Star,
  Hash,
  ChevronRight,
  X,
} from "lucide-react";

interface SearchResultCardProps {
  type: "profile" | "organization" | "record" | "category" | "hashtag" | string;
  title: string;
  nickname?: string;
  subtitle?: string;
  location?: string;
  category?: string;
  id?: string;
  href?: string;
  onRemove?: () => void;
  avatarUrl?: string | null;
}

export default function SearchResultCard({
  type,
  title,
  nickname,
  subtitle,
  location,
  category,
  id,
  href = "#",
  onRemove,
  avatarUrl,
}: SearchResultCardProps) {
  const typeStyles = {
    profile:      { icon: User,     color: "text-green-600 border-green-500"  },
    organization: { icon: Building2, color: "text-blue-600 border-blue-500"   },
    record:       { icon: Layers,   color: "text-purple-600 border-purple-500" },
    category:     { icon: Star,     color: "text-amber-600 border-amber-500"  },
    hashtag:      { icon: Hash,     color: "text-pink-600 border-pink-500"    },
  }[type] || { icon: User, color: "text-gray-600 border-gray-400" };

  const Icon = typeStyles.icon;
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isProfileLike = type === "profile" || type === "organization" || type === "category";
  const isRecordLike  = type === "record"  || type === "hashtag";

  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-xl p-3 hover:shadow-sm transition bg-white">
      {/* left side */}
      <div className="flex items-center gap-3 min-w-0">
        {/* avatar / icon */}
        <div
          className={`w-9 h-9 flex items-center justify-center rounded-full border overflow-hidden flex-shrink-0 ${avatarUrl ? "border-gray-900 cursor-pointer" : typeStyles.color}`}
          onClick={(e) => {
            if (avatarUrl) { e.preventDefault(); e.stopPropagation(); setLightboxOpen(true); }
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={title} className="w-full h-full object-cover select-none pointer-events-none" style={{ WebkitUserSelect: "none", userSelect: "none" }} />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>

        {lightboxOpen && avatarUrl && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
            <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setLightboxOpen(false)} className="absolute -top-10 right-0 text-white hover:text-gray-300 transition">
                <X className="w-6 h-6" />
              </button>
              <img src={avatarUrl} alt={title} className="w-full rounded-2xl object-cover shadow-2xl" />
            </div>
          </div>
        )}

        {/* text area */}
        <div className="min-w-0">
          {isProfileLike ? (
            <>
              {/* Line 1: Full Name (Nickname) */}
              <p className="font-semibold text-gray-900 truncate">
                {title}
                {nickname && <span className="font-normal text-gray-500"> ({nickname})</span>}
              </p>
              {/* Line 2: Category */}
              {category && (
                <p className="text-sm text-gray-600 truncate">{category}</p>
              )}
              {/* Line 3: Organization · Location */}
              {(subtitle || location) && (
                <p className="text-sm text-gray-500 truncate">
                  {subtitle}
                  {subtitle && location && " · "}
                  {location}
                </p>
              )}
              {/* Line 4: ID */}
              {id && <p className="text-xs text-gray-400 truncate">ID: {id}</p>}
            </>
          ) : (
            <>
              {/* Record / Hashtag layout — keep as is */}
              <p className="font-semibold text-gray-900 truncate">{title}</p>
              {(subtitle || location || category) && (
                <p className="text-sm text-gray-600 truncate">
                  {location}
                  {location && category && ""}
                  {category && (
                    <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {category}
                    </span>
                  )}
                  {!location && !category && subtitle}
                </p>
              )}
              {id && <p className="text-xs text-gray-400 truncate">ID: {id}</p>}
            </>
          )}
        </div>
      </div>

      {/* right actions */}
      <div className="flex items-center gap-3 flex-shrink-0 pl-2">
        <Link href={href} className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
          View
          <ChevronRight className="w-4 h-4" />
        </Link>
        {onRemove && (
          <button onClick={onRemove} className="text-gray-400 hover:text-gray-600 transition" aria-label="Remove">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}