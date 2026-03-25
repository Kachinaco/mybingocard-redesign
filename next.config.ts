import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3", "sharp"],
  productionBrowserSourceMaps: false,
};

export default nextConfig;
