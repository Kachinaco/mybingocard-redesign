const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function extractMetadata(source) {
  const match = source.match(/export const metadata:\s*Metadata\s*=\s*({[\s\S]*?};?\n)/);
  if (!match) return '';
  const block = match[1];
  const end = block.lastIndexOf('};');
  return block.slice(0, end + 1);
}

function layoutSource({ metadata }) {
  const hasMetadata = metadata && metadata.trim().length > 0;
  const lines = [
    'import type { Metadata } from "next";',
    'import PlayfulShell from "@/components/PlayfulShell";',
    '',
  ];
  if (hasMetadata) {
    lines.push('export const metadata: Metadata = ' + metadata + ';', '');
  }
  lines.push('export default function Layout({ children }: { children: React.ReactNode }) {');
  lines.push('  return (');
  lines.push('    <PlayfulShell>');
  lines.push('      {children}');
  lines.push('    </PlayfulShell>');
  lines.push('  );');
  lines.push('}');
  return lines.join('\n') + '\n';
}

const targets = [
  { dir: 'app/login', route: '/login' },
  { dir: 'app/signup', route: '/signup' },
  { dir: 'app/forgot-password', route: '/forgot-password' },
  { dir: 'app/reset-password', route: '/reset-password' },
  { dir: 'app/magic-link', route: '/magic-link' },
  { dir: 'app/verify-email', route: '/verify-email' },
  { dir: 'app/auth-error', route: '/auth-error' },
  { dir: 'app/activate', route: '/activate' },
  { dir: 'app/welcome', route: '/welcome' },
  { dir: 'app/settings', route: '/settings' },
  { dir: 'app/dashboard', route: '/dashboard' },
  { dir: 'app/game', route: '/game' },
  { dir: 'app/cards/[id]', route: '/cards/demo-card' },
  { dir: 'app/share/[shareLink]', route: '/share/demo-share' },
  { dir: 'app/play/[linkId]', route: '/play/demo-link' },
  { dir: 'app/admin', route: '/admin' },
  { dir: 'app/admin/users/[id]', route: '/admin/users/demo-user' },
];

for (const t of targets) {
  const dir = path.join(ROOT, t.dir);
  const layoutPath = path.join(dir, 'layout.tsx');
  fs.mkdirSync(dir, { recursive: true });
  let existing = '';
  if (fs.existsSync(layoutPath)) {
    existing = fs.readFileSync(layoutPath, 'utf8');
  }
  const metadata = extractMetadata(existing);
  const source = layoutSource({ metadata });
  fs.writeFileSync(layoutPath, source);
  console.log('wrote', t.dir, 'route', t.route, 'metadata', metadata ? 'yes' : 'no');
}
