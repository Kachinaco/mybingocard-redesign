// Route manifest check for MyBingoCard Playful Confetti
// Reads the prototype route manifest and verifies every route has a matching App Router entry.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.join(ROOT, "app");
const MANIFEST_PATH = path.resolve(
  "..",
  "mybingocard-redesigns",
  "prototype",
  "route-manifest.js",
);

const STATE_MANIFEST_PATH = path.resolve(
  "..",
  "mybingocard-redesigns",
  "prototype",
  "state-manifest.js"
);

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`Missing prototype manifest: ${MANIFEST_PATH}`);
  process.exit(1);
}

function loadManifest(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing manifest: ${filePath}`);
  }
  const source = fs.readFileSync(filePath, "utf-8");
  const sandbox = {
    window: {},
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON,
    console,
  };
  sandbox.window.Object = Object;
  const fn = new Function(...Object.keys(sandbox), source);
  fn(...Object.values(sandbox));
  return sandbox.window;
}

const routeWindow = loadManifest(MANIFEST_PATH);
const stateWindow = loadManifest(STATE_MANIFEST_PATH);
const routes = routeWindow.MBC_ROUTES || [];
const groups = routeWindow.MBC_ROUTE_GROUPS || [];
const systemRoutes = stateWindow.MBC_SYSTEM_ROUTES || [];
const allRoutes = [...routes, ...systemRoutes];

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isStaticRouteFileFor(sourcePattern) {
  // Exact file path patterns from system routes.
  const rootFiles = ["not-found.tsx", "error.tsx", "unsupported-browser.html"];
  if (rootFiles.includes(sourcePattern)) {
    return (
      fileExists(path.join(ROOT, sourcePattern)) ||
      fileExists(path.join(APP_DIR, sourcePattern))
    );
  }
  return false;
}

function hasPageDir(sourcePattern) {
  const dir = routePatternToAppDir(sourcePattern.replace(/\.html$/, ""));
  if (!fs.existsSync(dir)) return false;
  if (!fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).some((e) =>
    /^(page|layout|route)\.(tsx|ts|jsx|js)$/.test(e)
  );
}

function routePatternToAppDir(sourcePattern) {
  // sourcePattern is like /game/host/[roomCode] or /b/[code].
  // Map to app/ directory path without trailing page.tsx.
  return path.join(APP_DIR, ...sourcePattern.split("/").filter(Boolean));
}

function hasPageForSourcePattern(sourcePattern, routePath = "") {
  if (isStaticRouteFileFor(sourcePattern)) return true;

  // System preview routes map from a prototype source pattern to a preview page.
  const previewRoute = routePath.startsWith("/preview/");
  if (previewRoute || sourcePattern === "/create/loading.tsx" || sourcePattern === "/play/[linkId]/loading.tsx") {
    const previewPath = routePath.replace(/^\/preview\//, "");
    if (previewPath) {
      const previewDir = path.join(APP_DIR, "preview", previewPath);
      if (fs.existsSync(previewDir) && fs.readdirSync(previewDir).some((e) => /^(page|layout)\.(tsx|ts|jsx|js)$/.test(e))) {
        return true;
      }
    }
  }

  // .html system routes are implemented as page.tsx in a directory.
  if (sourcePattern.endsWith(".html")) {
    return hasPageDir(sourcePattern);
  }

  // .tsx file paths within the app directory (e.g., loading.tsx segments).
  if (sourcePattern.endsWith(".tsx") || sourcePattern.endsWith(".ts")) {
    const filePath = path.join(APP_DIR, ...sourcePattern.split("/").filter(Boolean));
    if (fileExists(filePath)) return true;
  }

  const dir = routePatternToAppDir(sourcePattern);
  if (!fs.existsSync(dir)) return false;
  if (!fs.statSync(dir).isDirectory()) return false;
  const entries = fs.readdirSync(dir);
  return entries.some(
    (e) =>
      e === "page.tsx" ||
      e === "page.ts" ||
      e === "page.jsx" ||
      e === "page.js" ||
      e === "route.ts" ||
      e === "route.js" ||
      e === "layout.tsx" ||
      e === "layout.ts" ||
      e === "layout.jsx" ||
      e === "layout.js",
  );
}

const results = [];
let missing = 0;
let ok = 0;

for (const route of allRoutes) {
  const sourcePattern = route.sourcePattern || route.path;
  const found = hasPageForSourcePattern(sourcePattern, route.path);
  const group = groups.find((g) => g.id === route.group) ||
    (route.group === "system-states" ? { label: "System states" } : null);
  const entry = {
    path: route.path,
    title: route.title,
    group: route.group,
    sourcePattern,
    found,
    groupLabel: group?.label || route.group,
  };
  results.push(entry);
  if (found) ok++;
  else missing++;
}

const groupOrder = [...groups.map((g) => g.id), "system-states"];
results.sort(
  (a, b) =>
    groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) ||
    a.path.localeCompare(b.path),
);

console.log(`MyBingoCard route manifest check`);
console.log(`Total routes: ${allRoutes.length}`);
console.log(`Found: ${ok}`);
console.log(`Missing: ${missing}`);
console.log("");

if (missing > 0) {
  console.log("Missing routes:");
  for (const r of results.filter((r) => !r.found)) {
    console.log(`  - ${r.path} (${r.title}) [${r.groupLabel}]`);
  }
  console.log("");
}

const output = {
  total: allRoutes.length,
  found: ok,
  missing,
  routes: results,
};

const outPath = path.join(ROOT, "scripts", "route-manifest-check.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote details to ${outPath}`);

process.exit(missing > 0 ? 1 : 0);
