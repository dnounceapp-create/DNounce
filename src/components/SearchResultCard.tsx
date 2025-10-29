"use client";

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
  /** record type */
  type: "profile" | "organization" | "record" | "category" | "hashtag" | string;
  /** main display name */
  title: string;
  /** optional subtitle (e.g. company name, category) */
  subtitle?: string;
  /** optional location */
  location?: string;
  /** record id */
  id?: string;
  /** link destination */
  href?: string;
  /** when user clicks the ❌ */
  onRemove?: () => void;
}

/**
 * Uniform card for search results
 * - consistent rounded border + hover effect
 * - left icon avatar
 * - right “View” button + “X” remove
 * - truncates long text elegantly
 */
export default function SearchResultCard({
  type,
  title,
  subtitle,
  location,
  id,
  href = "#",
  onRemove,
}: SearchResultCardProps) {
  /** choose icon + color per type */
  const typeStyles = {
    profile: { icon: User, color: "text-green-600 border-green-500" },
    organization: { icon: Building2, color: "text-blue-600 border-blue-500" },
    record: { icon: Layers, color: "text-purple-600 border-purple-500" },
    category: { icon: Star, color: "text-amber-600 border-amber-500" },
    hashtag: { icon: Hash, color: "text-pink-600 border-pink-500" },
  }[type] || { icon: User, color: "text-gray-600 border-gray-400" };

  const Icon = typeStyles.icon;

  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-xl p-3 hover:shadow-sm transition bg-white">
      {/* left side */}
      <div className="flex items-center gap-3 min-w-0">
        {/* circular icon */}
        <div
          className={`w-9 h-9 flex items-center justify-center rounded-full border ${typeStyles.color} flex-shrink-0`}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* text area */}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{title}</p>
          {(subtitle || location) && (
            <p className="text-sm text-gray-600 truncate">
              {subtitle}
              {subtitle && location && " · "}
              {location}
            </p>
          )}
          {id && (
            <p className="text-xs text-gray-400 truncate">ID: {id}</p>
          )}
        </div>
      </div>

      {/* right actions */}
      <div className="flex items-center gap-3 flex-shrink-0 pl-2">
        <Link
          href={href}
          className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
        >
          View
          <ChevronRight className="w-4 h-4" />
        </Link>

        {onRemove && (
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
