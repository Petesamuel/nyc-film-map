// Copies the built web map into www/ for the phone apps.
// Directory links like "about/" become "about/index.html" because app web views don't serve folder indexes.
import fs from 'fs'; import path from 'path';
const SRC = process.env.SITE || '../..', OUT = 'www';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const keep = ['index.html', 'community.js', 'pages.css', 'ver.txt', 'd', 'vendor', 'about', 'feedback', 'takedown', 'terms', 'privacy', 'support'];
for (const k of keep) { const s = path.join(SRC, k); if (fs.existsSync(s)) fs.cpSync(s, path.join(OUT, k), { recursive: true }); }
const fix = f => { let h = fs.readFileSync(f, 'utf8'); h = h.replace(/href="(\.\.\/|)(about|feedback|takedown|terms|privacy|support)\/"/g, 'href="$1$2/index.html"').replace(/href="\.\.\/"/g, 'href="../index.html"').replace(/href="\.\.\/\.\.\/"/g, 'href="../../index.html"'); fs.writeFileSync(f, h); };
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory() && !['d', 'vendor'].includes(e.name)) walk(p); else if (p.endsWith('.html')) fix(p); } };
walk(OUT);
fs.writeFileSync(path.join(OUT, 'community.js'), fs.readFileSync(path.join(OUT, 'community.js'), 'utf8').replace(/href="(about|feedback|takedown|terms|privacy)\/"/g, 'href="$1/index.html"'));
console.log('www ready');
