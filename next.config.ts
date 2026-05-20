import type { NextConfig } from "next";

const appBuildId =
  process.env.NEXT_PUBLIC_APP_BUILD_ID ||
  process.env.BUILD_ID ||
  process.env.GIT_SHA ||
  `local-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
const privateBrowserSourceMaps = process.env.MBC_PRIVATE_BROWSER_SOURCE_MAPS !== "0";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
  },
  generateBuildId: async () => appBuildId,
  serverExternalPackages: [
    "better-sqlite3",
    "sharp",
    "mongodb",
    "bson",
    "mongodb-connection-string-url",
    "@mongodb-js/saslprep",
  ],
  transpilePackages: ["@chenglou/pretext"],
  // Source maps are generated for server-side/admin-only symbolication.
  // Public access is blocked by middleware.ts and the production Nginx .map rule.
  productionBrowserSourceMaps: privateBrowserSourceMaps,
};

export default nextConfig;
