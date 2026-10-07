// Pré-renderização das páginas montadas no navegador (domínios, etapas e SaaS).
// Uso: python3 build.py && node qa/prerender.mjs && python3 build.py
// Gera prerender.json, que o build.py usa para já entregar o conteúdo pronto no HTML.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srv = spawn('node', [path.join(ROOT, 'qa', 'servidor-pages.mjs'), path.join(ROOT, 'dist'), '8799']);
await new Promise(r => srv.stdout.once('data', r));
const ROTAS = ['cloud', 'seguranca', 'finops', 'dev', 'pmo', 'assessment', 'consultoria', 'implementacao', 'sustentacao', 'saas-erp', 'saas-crm', 'saas-financeiro', 'saas-transcribe', 'saas-alya'];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message));
await p.route('**/api/**', r => r.abort());
const out = {};
for (const k of ROTAS) {
  const url = 'http://127.0.0.1:8799' + (k.startsWith('saas-') ? '/saas/' + k.slice(5) : '/' + k);
  await p.goto(url); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const s = document.querySelector('.page.on'); return { page: s.dataset.page, html: s.innerHTML }; });
  if (!r.html.trim() || !/<h1/.test(r.html)) throw new Error('Página sem conteúdo: ' + k);
  out[k] = r;
}
await b.close(); srv.kill();
if (erros.length) throw new Error('Erros de JS: ' + erros.join(' | '));
fs.writeFileSync(path.join(ROOT, 'prerender.json'), JSON.stringify(out));
console.log('prerender.json:', Object.keys(out).length, 'páginas');
