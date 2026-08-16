// State manifest check for MyBingoCard Playful Confetti
// Verifies that each route in the prototype state manifest has a page and that every
// workflow state id is represented in the page source or the prototype capture.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.join(ROOT, "app");
const PROTO_DIR = path.resolve("..", "mybingocard-redesigns", "prototype");
const ROUTE_MANIFEST = path.join(PROTO_DIR, "route-manifest.js");
const STATE_MANIFEST = path.join(PROTO_DIR, "state-manifest.js");
const CAPTURE_DIR = path.join(ROOT, "prototype-captures");

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

const routeWindow = loadManifest(ROUTE_MANIFEST);
const stateWindow = loadManifest(STATE_MANIFEST);
const routes = routeWindow.MBC_ROUTES || [];
const stateOptions = stateWindow.MBC_STATE_OPTIONS || {};
const systemRoutes = stateWindow.MBC_SYSTEM_ROUTES || [];

const sourcePatternByPath = new Map();
for (const route of routes) {
  sourcePatternByPath.set(route.path, route.sourcePattern || route.path);
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function routePatternToAppDir(sourcePattern) {
  // Strip file extension if present (e.g., /create/loading.tsx -> /create/loading)
  const clean = sourcePattern.replace(/\.[a-z]+$/, "");
  return path.join(APP_DIR, ...clean.split("/").filter(Boolean));
}

function isPageFile(entryName) {
  return /^(page|route|layout)\.(tsx|ts|jsx|js)$/.test(entryName);
}

function hasPageForSourcePattern(sourcePattern, routePath = "") {
  if (!sourcePattern) return false;
  // Root-level files (e.g., not-found.tsx, error.tsx) can live at root or app/.
  const rootFiles = ["not-found.tsx", "error.tsx"];
  if (rootFiles.includes(sourcePattern)) {
    if (fileExists(path.join(ROOT, sourcePattern))) return true;
    if (fileExists(path.join(APP_DIR, sourcePattern))) return true;
  }

  // System preview routes map to app/preview/<slug>.
  if (routePath.startsWith("/preview/") || sourcePattern === "/create/loading.tsx" || sourcePattern === "/play/[linkId]/loading.tsx") {
    const previewPath = routePath.replace(/^\/preview\//, "");
    if (previewPath) {
      const previewDir = path.join(APP_DIR, "preview", previewPath);
      if (fs.existsSync(previewDir) && fs.statSync(previewDir).isDirectory() && fs.readdirSync(previewDir).some(isPageFile)) return true;
    }
  }

  // .html prototype source patterns may be implemented as page.tsx in a directory.
  if (sourcePattern.endsWith(".html")) {
    const dir = routePatternToAppDir(sourcePattern.replace(/\.html$/, ""));
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory() && fs.readdirSync(dir).some(isPageFile)) return true;
  }
  // .tsx file paths like /create/loading.tsx.
  if (sourcePattern.endsWith(".tsx")) {
    const filePath = path.join(APP_DIR, ...sourcePattern.split("/").filter(Boolean));
    if (fileExists(filePath)) return true;
  }
  const dir = routePatternToAppDir(sourcePattern);
  if (!fs.existsSync(dir)) return false;
  if (!fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).some(isPageFile);
}

function capturePathFor(routePath) {
  const slug = routePath
    .replace(/^\//, "")
    .replace(/\//g, "-")
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/[^a-zA-Z0-9\-]/g, "") || "index";
  return path.join(CAPTURE_DIR, `${slug}.html.json`);
}

function stateIdsFromCapture(routePath) {
  const capturePath = capturePathFor(routePath);
  if (!fileExists(capturePath)) return new Set();
  try {
    const raw = fs.readFileSync(capturePath, "utf-8");
    const parsed = JSON.parse(raw);
    const html = parsed.html || "";
    const match = html.match(/<select[^>]*data-state-route[^>]*>([\s\S]*?)<\/select>/i);
    if (!match) return new Set();
    const ids = new Set();
    const optionRe = /<option[^>]*value="([^"]+)"/g;
    let m;
    while ((m = optionRe.exec(match[1])) !== null) ids.add(m[1]);
    return ids;
  } catch {
    return new Set();
  }
}

function stateIdsFromPageSource(sourcePattern) {
  if (!sourcePattern) return new Set();
  const dir = routePatternToAppDir(sourcePattern);
  if (!fs.existsSync(dir)) return new Set();
  const ids = new Set();
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(tsx|ts|jsx|js)$/.test(name)) continue;
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) continue;
    const text = fs.readFileSync(file, "utf-8");
    const re = /['"](?:state|workflow|mbc-state|data-state)['"]\s*[:=]\s*['"]([^'"]+)['"]|value=['"]([^'"]+)['"]\s*selected|data-state=['"]([^'"]+)['"]|\{\/\*\s*mbc-states:\s*([^}]+)\*\/\s*\}/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const id = m[1] || m[2] || m[3];
      if (id) ids.add(id);
    }
  }
  return ids;
}

const results = [];
let totalStates = 0;
let missingStateIds = 0;
let routeMissingPage = 0;

for (const [routePath, states] of Object.entries(stateOptions)) {
  const stateIds = states.map((s) => s.id);
  totalStates += stateIds.length;
  const sourcePattern = sourcePatternByPath.get(routePath) || routePath;
  const captureIds = stateIdsFromCapture(routePath);
  const sourceIds = stateIdsFromPageSource(sourcePattern);
  const allKnownIds = new Set([...captureIds, ...sourceIds]);
  const missingIds = stateIds.filter((id) => !allKnownIds.has(id));
  const pageExists = hasPageForSourcePattern(sourcePattern, routePath);
  if (!pageExists) routeMissingPage++;
  missingStateIds += missingIds.length;
  results.push({
    routePath,
    sourcePattern,
    pageExists,
    stateIds,
    captureIds: [...captureIds],
    sourceIds: [...sourceIds],
    missingIds,
  });
}

for (const route of systemRoutes) {
  const sourcePattern = route.sourcePattern || route.path;
  const pageExists = hasPageForSourcePattern(sourcePattern, route.path);
  if (!pageExists) routeMissingPage++;
  results.push({
    routePath: route.path,
    sourcePattern,
    pageExists,
    systemRoute: true,
  });
}

console.log("MyBingoCard state manifest check");
console.log(`Routes with state options: ${Object.keys(stateOptions).length}`);
console.log(`Total states expected: ${totalStates}`);
console.log(`States covered by capture/source: ${totalStates - missingStateIds}`);
console.log(`States not covered: ${missingStateIds}`);
console.log(`Routes/system routes with missing page: ${routeMissingPage}`);
console.log("");

if (missingStateIds > 0 || routeMissingPage > 0) {
  console.log("Details:");
  for (const r of results) {
    if (r.systemRoute) {
      if (!r.pageExists) console.log(`  MISSING PAGE ${r.routePath} -> ${r.sourcePattern}`);
      continue;
    }
    if (!r.pageExists || r.missingIds.length > 0) {
      console.log(`  ${r.routePath} (${r.sourcePattern})`);
      if (!r.pageExists) console.log(`    - missing page`);
      for (const id of r.missingIds) {
        console.log(`    - missing state id: ${id}`);
      }
    }
  }
  console.log("");
}

const outPath = path.join(ROOT, "scripts", "state-manifest-check.json");
fs.writeFileSync(
  outPath,
  JSON.stringify({
    totalStates,
    missingStateIds,
    routeMissingPage,
    routes: results,
  }, null, 2),
);
console.log(`Wrote details to ${outPath}`);
process.exit(missingStateIds > 0 || routeMissingPage > 0 ? 1 : 0);
