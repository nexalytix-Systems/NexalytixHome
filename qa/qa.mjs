// Teste de qualidade do site Nexalytix.
// Uso: python3 build.py && node qa/qa.mjs   (gera qa/out/relatorio.md e capturas em qa/out/)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'qa', 'out');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

// Termos que não podem aparecer no site (decisões já tomadas)
const PROIBIDOS = [/BG-?Check/i, /AgendaBella/i, /diesel/i, /certifica[çc][ãa]o do time/i, /50 anos/i, /trabalhe-conosco/i, /\{\{|\}\}/, /\bundefined\b/, /\bNaN\b/, /lorem ipsum/i, /\bTODO\b/, /\[object Object\]/];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u.startsWith('/api/')) { res.writeHead(404); return res.end(); }
  // Igual ao Cloudflare Pages: /academia -> academia.html; endereço desconhecido sem extensão -> index.html
  const p = u.replace(/\/+$/, '') || '/';
  let f = path.join(DIST, p === '/' ? 'index.html' : p);
  if (u === '/radar.json' && !fs.existsSync(f)) f = path.join(ROOT, 'qa', 'radar-exemplo.json'); // exemplo só para o teste
  if ((!fs.existsSync(f) || fs.statSync(f).isDirectory()) && fs.existsSync(f + '.html')) f = f + '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { if (/\.[a-z0-9]+$/i.test(p)) { res.writeHead(404); return res.end('404'); } f = path.join(DIST, 'index.html'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(8787, r));
const BASE = 'http://localhost:8787/';

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const problemas = []; // {nivel, rota, tela, item}
const add = (nivel, rota, tela, item) => problemas.push({ nivel, rota, tela, item });

async function novaPagina(w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p._erros = [];
  p.on('pageerror', e => p._erros.push('JS: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource.*404/.test(m.text())) p._erros.push('Console: ' + m.text()); });
  p.on('requestfailed', r => { if (!r.url().includes('/api/')) p._erros.push('Arquivo não carregou: ' + r.url().replace(BASE, '')); });
  p.on('response', r => { if (r.status() >= 400 && !r.url().includes('/api/')) p._erros.push(`Arquivo ${r.status()}: ` + r.url().replace(BASE, '')); });
  await p.route('**/api/lead', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, crm_id: 'qa', stage: 'ldr' }) }));
  await p.route('**/api/chat', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'Teste', lead: null }) }));
  await p.goto(BASE); await p.waitForTimeout(400);
  return p;
}

// 1) Descobrir rotas navegando pelos links
const desk = await novaPagina(1360, 900);
const rotas = new Set(['home']); const fila = ['home']; const visitadas = new Set();
while (fila.length) {
  const r = fila.shift(); if (visitadas.has(r)) continue; visitadas.add(r);
  await desk.evaluate(h => { nxGo(h); }, r); await desk.waitForTimeout(120);
  const hs = await desk.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).map(h => h[0] === '#' ? h.slice(1) : (h[0] === '/' && h[1] !== '/' && !/^\/(api|assets)\//.test(h) && !/\.[a-z0-9]+$/i.test(h)) ? nxKeyFromPath(h) : '').filter(Boolean));
  for (const h of hs) if (!rotas.has(h)) { rotas.add(h); fila.push(h); }
}
const lista = [...rotas].sort();

// 1b) Cada endereço próprio abre direto na página certa, com título e canônico próprios
const titulos = new Map();
for (const r of lista) {
  const url = BASE.replace(/\/$/, '') + (r === 'home' ? '/' : r.startsWith('saas-') ? '/saas/' + r.slice(5) : '/' + r);
  const pg = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  await pg.goto(url); await pg.waitForTimeout(250);
  const i = await pg.evaluate(() => ({ t: document.title, c: (document.querySelector('link[rel=canonical]') || {}).href || '', v: [...document.querySelectorAll('.page')].filter(x => getComputedStyle(x).display !== 'none').length, k: nxRouteKey() }));
  await pg.close();
  if (r !== 'solucoes' && i.k !== r) add('Alto', r, 'endereço', `Abrir ${url} leva para "${i.k}"`);
  if (i.v !== 1) add('Alto', r, 'endereço', `Ao abrir direto, ${i.v} páginas visíveis`);
  if (r !== 'solucoes') { if (titulos.has(i.t) && titulos.get(i.t) !== r) add('Médio', r, 'endereço', `Título repetido com ${titulos.get(i.t)}: ${i.t}`); titulos.set(i.t, r); }
}

// 2) Checar cada rota em computador e celular
const telas = [['computador', 1360, 900], ['celular', 390, 844]];
const resumo = {};
for (const [nome, w, h] of telas) {
  const p = nome === 'computador' ? desk : await novaPagina(w, h);
  for (const r of lista) {
    p._erros = [];
    await p.evaluate(x => { nxGo(x); }, r); await p.waitForTimeout(220);
    const info = await p.evaluate((proib) => {
      const pg = document.querySelector('.page.on');
      const res = { pagina: pg && pg.dataset.page, hash: nxRouteKey() };
      res.h1 = pg ? (pg.querySelector('h1') || {}).textContent || '' : '';
      res.largura = document.documentElement.scrollWidth; res.janela = innerWidth;
      res.texto = pg ? pg.innerText.length : 0;
      res.proibidos = [];
      const cl = document.body.cloneNode(true); cl.querySelectorAll("script,style,template").forEach(n => n.remove()); const txt = cl.textContent.replace(/\s+/g, " ");
      for (const re of proib) { const m = txt.match(new RegExp(re.s, re.f)); if (m) res.proibidos.push(m[0]); }
      res.imgsQuebradas = [...document.querySelectorAll('.page.on img, header img, footer img')].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
      res.imgsSemAlt = [...document.querySelectorAll('.page.on img')].filter(i => !i.hasAttribute('alt')).map(i => i.getAttribute('src'));
      // elementos que vazam para fora da tela
      res.vazando = [...(pg ? pg.querySelectorAll('*') : [])].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''));
      // links que levam a rotas inexistentes
      return res;
    }, PROIBIDOS.map(re => ({ s: re.source, f: re.flags })));
    const chave = r;
    resumo[chave] = resumo[chave] || { pagina: info.pagina, h1: info.h1.trim().slice(0, 80) };
    if (r !== 'home' && info.pagina === 'home' && r !== '') add('Alto', r, nome, 'Link leva para uma página que não existe (cai na Home)');
    if (!info.h1.trim() && info.pagina !== 'home') add('Médio', r, nome, 'Página sem título principal (h1)');
    if (info.texto < 200) add('Médio', r, nome, `Página quase vazia (${info.texto} caracteres)`);
    if (info.largura > info.janela + 1) add('Alto', r, nome, `Página mais larga que a tela (${info.largura}px em ${info.janela}px): ${info.vazando.join(', ')}`);
    for (const t of info.proibidos) add('Alto', r, nome, `Texto que não deveria aparecer: "${t}"`);
    for (const i of info.imgsQuebradas) add('Alto', r, nome, `Imagem quebrada: ${i}`);
    for (const i of info.imgsSemAlt) add('Baixo', r, nome, `Imagem sem texto alternativo: ${i}`);
    for (const e of p._erros) add('Alto', r, nome, e);
    await p.screenshot({ path: path.join(OUT, `${nome}-${r || 'home'}.png`), fullPage: true });
  }
  if (nome === 'celular') {
    // menu do celular abre e fecha
    await p.evaluate(() => { nxGo('home'); }); await p.waitForTimeout(150);
    await p.click('#menuBtn'); await p.waitForTimeout(150);
    if (await p.evaluate(() => document.querySelector('#mobile').hidden)) add('Alto', 'menu', nome, 'Menu do celular não abre');
    await p.click('#mobile a[href="/saas"]'); await p.waitForTimeout(150);
    if (!(await p.evaluate(() => document.querySelector('#mobile').hidden))) add('Médio', 'menu', nome, 'Menu do celular não fecha ao navegar');
  }
  // Alya abre
  await p.evaluate(() => { nxGo('home'); }); await p.waitForTimeout(150);
  await p.click('#nexaOpen'); await p.waitForTimeout(300);
  if (await p.evaluate(() => document.querySelector('#nexa').hidden)) add('Alto', 'Alya', nome, 'Chat da Alya não abre');
  await p.click('#nexaClose').catch(() => {});
}

// 3) Formulários: vazio deve mostrar erro; preenchido deve enviar
const p = desk;
const forms = await p.evaluate(() => [...document.querySelectorAll('form.f')].map(f => ({ form: f.dataset.form, page: f.closest('.page') ? f.closest('.page').dataset.page : '' })));
for (const { form, page } of forms) {
  await p.evaluate(x => { nxGo(x); }, page); await p.waitForTimeout(200);
  const sel = `form[data-form="${form}"]`;
  await p.click(`${sel} button[type=submit]`); await p.waitForTimeout(200);
  const msgVazio = (await p.textContent(`${sel} .form-msg`)).trim();
  if (!msgVazio) add('Alto', page, 'computador', `Formulário "${form}" vazio não mostra aviso`);
  // preencher campos obrigatórios
  await p.evaluate((s) => {
    const f = document.querySelector(s);
    for (const i of f.querySelectorAll('[required]')) {
      if (i.type === 'checkbox') i.checked = true;
      else if (i.type === 'email') i.value = 'qa@empresa.com.br';
      else if (i.tagName === 'SELECT') i.selectedIndex = 0;
      else i.value = 'Teste QA';
    }
  }, sel);
  await p.click(`${sel} button[type=submit]`); await p.waitForTimeout(400);
  const ok = await p.$(`${sel} .ok-box`);
  if (!ok) add('Alto', page, 'computador', `Formulário "${form}" preenchido não confirma o envio: "${(await p.textContent(`${sel} .form-msg`)).trim()}"`);
  // rótulos
  const semRotulo = await p.evaluate(s => [...document.querySelectorAll(`${s} input:not([type=hidden]):not(.hp):not([type=checkbox]), ${s} select, ${s} textarea`)].filter(i => !(i.id && document.querySelector(`label[for="${i.id}"]`)) && !i.getAttribute('aria-label')).map(i => i.name), sel);
  for (const n of semRotulo) add('Baixo', page, 'computador', `Campo "${n}" do formulário "${form}" sem rótulo`);
}

// 4) Verificações gerais do HTML
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const semScript = html.replace(/<script[\s\S]*?<\/script>/g, '');
const ids = [...semScript.matchAll(/\sid="([^"$]+)"/g)].map(m => m[1]);
const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
for (const d of dup) add('Médio', 'geral', '-', `ID repetido no HTML: #${d}`);
for (const m of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener/.test(m[0])) add('Baixo', 'geral', '-', `Link externo sem rel="noopener": ${m[0].slice(0, 80)}`);
if (!/<title>[^<]{10,}<\/title>/.test(html)) add('Médio', 'geral', '-', 'Título da página ausente');
if (!/name="description"/.test(html)) add('Médio', 'geral', '-', 'Meta description ausente');
const peso = fs.statSync(path.join(DIST, 'index.html')).size;
if (peso > 400000) add('Médio', 'geral', '-', `HTML principal pesado: ${(peso / 1024).toFixed(0)} KB`);

await browser.close(); server.close();

// 5) Relatório
const ordem = { Alto: 0, 'Médio': 1, Baixo: 2 };
problemas.sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || a.rota.localeCompare(b.rota));
const unico = []; const vistos = new Set();
for (const x of problemas) { const k = x.nivel + x.rota + x.item; if (vistos.has(k)) { const u = unico.find(y => y.nivel + y.rota + y.item === k); if (!u.tela.includes(x.tela)) u.tela += ' e ' + x.tela; continue; } vistos.add(k); unico.push({ ...x }); }
const linhas = [`# Teste de qualidade — ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, '',
  `Rotas testadas: ${lista.length} · Formulários: ${forms.length} · Telas: computador (1360px) e celular (390px)`, '',
  `**Resultado:** ${unico.filter(x => x.nivel === 'Alto').length} alto · ${unico.filter(x => x.nivel === 'Médio').length} médio · ${unico.filter(x => x.nivel === 'Baixo').length} baixo`, '',
  '| Nível | Onde | Tela | Problema |', '| --- | --- | --- | --- |',
  ...unico.map(x => `| ${x.nivel} | ${x.rota} | ${x.tela} | ${x.item.replace(/\|/g, '/')} |`), '',
  '## Rotas', '', '| Rota | Página | Título |', '| --- | --- | --- |', ...lista.map(r => `| #${r} | ${resumo[r]?.pagina} | ${(resumo[r]?.h1 || '').replace(/\|/g, '/')} |`)];
fs.writeFileSync(path.join(OUT, 'relatorio.md'), linhas.join('\n'));
fs.writeFileSync(path.join(OUT, 'relatorio.json'), JSON.stringify({ rotas: lista, problemas: unico }, null, 2));
console.log(linhas.slice(0, 8 + unico.length).join('\n'));
