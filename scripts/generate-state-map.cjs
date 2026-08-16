const fs = require('fs');
const path = require('path');

const STATE_MANIFEST = path.resolve(__dirname, '..', '..', 'mybingocard-redesigns', 'prototype', 'state-manifest.js');
const source = fs.readFileSync(STATE_MANIFEST, 'utf8');
const sandbox = { window: {}, Object, Array, String, Number, Boolean, Date, Math, JSON, console };
sandbox.window.Object = Object;
const fn = new Function(...Object.keys(sandbox), source);
fn(...Object.values(sandbox));
const stateOptions = sandbox.window.MBC_STATE_OPTIONS || {};
const systemRoutes = sandbox.window.MBC_SYSTEM_ROUTES || [];

const map = {};
for (const [route, states] of Object.entries(stateOptions)) {
  map[route] = states.map((s) => ({ id: s.id, label: s.label }));
}
const outFile = path.resolve(__dirname, '..', 'lib', 'mbc-states.ts');
const lines = [
  "// Auto-generated from mybingocard-redesigns/prototype/state-manifest.js",
  "export type MbcState = { id: string; label: string };",
  "export const MBC_STATES: Record<string, MbcState[]> = " + JSON.stringify(map, null, 2) + ";",
  "export const MBC_SYSTEM_ROUTE_PATHS: string[] = " + JSON.stringify(systemRoutes.map((r) => r.path), null, 2) + ";",
  "export function getMbcStates(route: string): MbcState[] {",
  "  return MBC_STATES[route] || [];",
  "}",
];
fs.writeFileSync(outFile, lines.join('\n') + '\n');
console.log('Wrote', outFile);
