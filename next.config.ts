import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "etfhkltquzhysvmhbkfg.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
  async redirects() {
    return [
      // Old demo URLs → new /d/ URLs (301 permanent)
      { source: '/demo/freelancer', destination: '/d/freelancer', permanent: true },
      { source: '/demo/realtor', destination: '/d/realtor', permanent: true },
      { source: '/demo/barber', destination: '/d/barber', permanent: true },
      { source: '/demo/nailtech', destination: '/d/nailtech', permanent: true },
      { source: '/demo/waitress', destination: '/d/waitress', permanent: true },
      { source: '/subject/demo/freelancer', destination: '/d/subject/freelancer', permanent: true },
      { source: '/subject/demo/realtor', destination: '/d/subject/realtor', permanent: true },
      { source: '/subject/demo/barber', destination: '/d/subject/barber', permanent: true },
      { source: '/subject/demo/nailtech', destination: '/d/subject/nailtech', permanent: true },
      { source: '/subject/demo/waitress', destination: '/d/subject/waitress', permanent: true },
    ];
  },
};

export default nextConfig;
