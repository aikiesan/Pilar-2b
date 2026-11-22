// Leaflet canvas restyle benchmark — see docs/planning/MICROTRANSICOES_PLANO_DE_VIABILIDADE.md §2.
// Measures, on the map's real geometry: (A) restyling every municipality once per frame (a tween),
// (B) restyling only the features in the viewport, (C) today's behaviour, remounting the layer.
//
// 1. With the Docker stack up, export the geometry the map really uses:
//      node scripts/perf/restyle-bench/run.mjs --export
// 2. Run:
//      node scripts/perf/restyle-bench/run.mjs            (prints one JSON line per case)
// Options: --api=http://localhost:8000  --cpu=1,4  --dpr=1,2
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=').slice(1).join('=');
const api = arg('api', 'http://localhost:8000');
const geoFile = path.join(here, 'municipalities_map.geojson');

if (process.argv.includes('--export')) {
  const res = await fetch(`${api}/api/v1/municipalities/geojson?fields=map&detail=map`);
  if (!res.ok) throw new Error(`export failed: HTTP ${res.status}`);
  const gj = await res.json();
  fs.writeFileSync(geoFile, JSON.stringify(gj));
  const sp = { ...gj, features: gj.features.filter((f) => String(f.properties?.ibge_code ?? '').startsWith('35')) };
  fs.writeFileSync(path.join(here, 'municipalities_sp.geojson'), JSON.stringify(sp));
  let v = 0; const c = (a) => (Array.isArray(a[0]) ? a.forEach(c) : v++);
  gj.features.forEach((f) => f.geometry && c(f.geometry.coordinates));
  console.log(`exported ${gj.features.length} features, ${v} vertices (${(v / gj.features.length).toFixed(0)} avg); SP ${sp.features.length}`);
  process.exit(0);
}
if (!fs.existsSync(geoFile)) { console.error('Run with --export first (Docker stack up).'); process.exit(1); }

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.geojson': 'application/json' };
const srv = http.createServer((q, r) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  const p = url.startsWith('/node_modules/') ? path.join(frontendRoot, url) : path.join(here, url);
  if (!p.startsWith(frontendRoot)) { r.writeHead(403); return r.end(); }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(p)] ?? 'application/octet-stream' }); r.end(d); });
}).listen(8765);

const cases = [
  { name: 'SP zoom 7', file: 'municipalities_sp.geojson', view: { c: [-22.3, -48.6], z: 7 } },
  { name: 'national zoom 4', file: 'municipalities_map.geojson', view: { c: [-14.5, -52], z: 4 } },
  { name: 'national data, SP view zoom 7', file: 'municipalities_map.geojson', view: { c: [-22.3, -48.6], z: 7 } },
];
const browser = await chromium.launch();
for (const dpr of arg('dpr', '1').split(',').map(Number))
  for (const cpu of arg('cpu', '1,4').split(',').map(Number))
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      await page.goto('http://localhost:8765/bench.html');
      const r = await page.evaluate(([f, v]) => window.bench(f, v), [c.file, c.view]);
      console.log(JSON.stringify({ case: c.name, dpr, cpuSlowdown: cpu, ...r }));
      await ctx.close();
    }
await browser.close();
srv.close();
