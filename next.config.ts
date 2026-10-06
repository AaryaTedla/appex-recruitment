import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.APPEX_BUILD_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
