import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(s?: string | null) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function citySlug(location?: string | null) {
  return slugify((location || "").split(",")[0].trim()) || "unknown";
}

function subjectSlug(name?: string | null, nickname?: string | null) {
  const combined = [name, nickname].filter(Boolean).join(" ");
  return slugify(combined) || "profile";
}

const base = "https://www.dnounce.com";
const now = new Date();

const demoSlugs = [
  'freelancer', 'realtor', 'barber', 'nailtech', 'waitress',
  'wedding-photographer', 'personal-trainer', 'tattoo-artist',
  'hair-stylist', 'interior-designer', 'private-chef', 'dog-trainer',
  'music-producer', 'life-coach', 'moving-company', 'auto-mechanic',
  'landlord', 'nanny', 'wedding-planner', 'real-estate-agent',
  'contractor', 'social-media-manager', 'tutor', 'veterinarian',
  'event-photographer'
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all published records with subject info
  const { data: records } = await supabaseAdmin
    .from("records")
    .select("id, subject:subjects(name, nickname, location)")
    .eq("is_published", true)
    .is("deleted_at", null);

  // Fetch all subjects
  const { data: subjects } = await supabaseAdmin
    .from("subjects")
    .select("subject_uuid, name, nickname, location");

  const recordUrls: MetadataRoute.Sitemap = (records ?? []).map((r: any) => ({
    url: `${base}/record/${r.id}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const subjectUrls: MetadataRoute.Sitemap = (subjects ?? []).map((s: any) => ({
    url: `${base}/subject/${s.subject_uuid}/${subjectSlug(s.name, s.nickname)}/${citySlug(s.location)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    // Core pages
    { url: `${base}`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/loginsignup`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/legal`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/links`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },

    // Blog
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog/how-to-check-if-a-contractor-is-licensed`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog/5-red-flags-before-hiring-a-freelancer`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog/landlord-reputation-how-to-screen-a-rental-property-owner`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog/your-right-to-respond-why-one-sided-reviews-hurt-everyone`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog/what-happens-when-a-review-is-disputed`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },

    // Demo record pages
    ...demoSlugs.map(slug => ({
      url: `${base}/d/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),

    // Demo subject pages
    ...demoSlugs.map(slug => ({
      url: `${base}/d/subject/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),

    // Community
    { url: `${base}/dashboard/community/polls`, lastModified: now, changeFrequency: "daily", priority: 0.7 },

    // Real records
    ...recordUrls,

    // Real subject profiles
    ...subjectUrls,
  ];
}
