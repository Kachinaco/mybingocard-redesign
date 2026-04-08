import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3", "sharp"],
  transpilePackages: ["@chenglou/pretext"],
  productionBrowserSourceMaps: false,
};

export default nextConfig;
