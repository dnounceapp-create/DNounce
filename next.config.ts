import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return []; // no redirects from root
  },
};

export default nextConfig;