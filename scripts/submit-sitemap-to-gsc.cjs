#!/usr/bin/env node
/**
 * Submit the canonical MyBingoCard sitemap to Google Search Console.
 *
 * The production recovery cron runs as root, so the service-account key remains
 * root-readable instead of being copied into the application runtime.
 */

const fs = require("node:fs");
const { google } = require("googleapis");

const DEFAULT_DOMAIN = "mybingocard.com";
const SERVICE_ACCOUNT_FILE = process.env.MYBINGOCARD_GSC_SERVICE_ACCOUNT_FILE
  || "/root/config/env/google-indexing-service-account.json";

function resolveDomain(value) {
  const candidate = String(value || DEFAULT_DOMAIN)
    .trim()
    .toLowerCase()
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(candidate)) {
    throw new Error(`Invalid Search Console domain: ${value}`);
  }
  if (candidate !== DEFAULT_DOMAIN) {
    throw new Error(`This helper only submits the ${DEFAULT_DOMAIN} sitemap`);
  }
  return candidate;
}

function requestFor() {
  return {
    siteUrl: `sc-domain:${DEFAULT_DOMAIN}`,
    feedpath: `https://${DEFAULT_DOMAIN}/sitemap.xml`,
  };
}

async function main() {
  resolveDomain(process.argv.slice(2).find((arg) => !arg.startsWith("--")));
  const request = requestFor();

  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ dryRun: true, ...request }, null, 2));
    return;
  }

  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    throw new Error(`Search Console service-account key not found: ${SERVICE_ACCOUNT_FILE}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: ["https://www.googleapis.com/auth/webmasters"],
  });
  const client = await auth.getClient();
  const searchconsole = google.searchconsole({ version: "v1", auth: client });

  await searchconsole.sitemaps.submit(request);
  console.log(JSON.stringify({
    ok: true,
    submittedAt: new Date().toISOString(),
    ...request,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Search Console sitemap submission failed: ${error.message || error}`);
  process.exit(1);
});
