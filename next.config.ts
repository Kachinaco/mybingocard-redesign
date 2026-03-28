import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3", "sharp"],
  transpilePackages: ["@chenglou/pretext"],
  productionBrowserSourceMaps: false,
};

export default nextConfig;
