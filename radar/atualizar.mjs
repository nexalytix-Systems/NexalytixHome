// Radar semanal da Nexalytix: lê feeds RSS, pede à IA uma seleção comentada em pt-BR e grava dist/radar.json.
// Roda sozinho toda semana pelo GitHub Actions (.github/workflows/radar.yml).
// Uso manual: ANTHROPIC_API_KEY=... node radar/atualizar.mjs   (opções: --dry-run para não chamar a IA)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONF = JSON.parse(fs.readFileSync(path.join(ROOT, "radar/fontes.json"), "utf8"));
const SAIDA = process.env.RADAR_SAIDA || path.join(ROOT, "dist/radar.json");
const DIAS = Number(process.env.RADAR_DIAS || 7);
const MODELOS = [process.env.RADAR_MODEL || "claude-sonnet-5", "claude-haiku-4-5-20251001"];
const DRY = process.argv.includes("--dry-run");
const FRENTES = {
  assessment: "Assessment", seguranca: "Segurança", cloud: "Cloud e Infraestrutura", finops: "FinOps",
  ia: "Transformação Digital e IA", dev: "Desenvolvimento e Squads", saas: "SaaS Nexalytix",
  sustentacao: "Sustentação e Manutenção", academia: "Academia",
};
const CATS = CONF.categorias.map((c) => c.id);

// ---------- leitura de RSS/Atom sem dependências ----------
const ent = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, "i")); return m ? ent(m[1]).trim() : ""; };
const texto = (html) => ent(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function parseFeed(xml, fonte) {
  const itens = [];
  const blocos = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocos) {
    let link = tag(b, "link");
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ""; }
    const data = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date");
    const titulo = texto(tag(b, "title"));
    const resumo = texto(tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded")).slice(0, 400);
    const d = new Date(data);
    if (!titulo || !/^https?:\/\//.test(link) || isNaN(d)) continue;
    itens.push({ fonte: fonte.nome, categoria: fonte.categoria, titulo, url: link.trim(), data: d.toISOString(), trecho: resumo });
  }
  return itens;
}

async function baixar(f) {
  try {
    const ctl = AbortSignal.timeout(20000);
    const r = await fetch(f.url, { signal: ctl, headers: { "user-agent": "NexalytixRadarBot/1.0 (+https://nexalytix.com.br)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const itens = parseFeed(await r.text(), f);
    console.log(`ok   ${f.nome}: ${itens.length} itens`);
    return itens;
  } catch (e) { console.warn(`erro ${f.nome}: ${e.message}`); return []; }
}

// ---------- seleção pela IA ----------
const TOOL = {
  name: "publicar_radar",
  description: "Publica a seleção semanal do Radar Nexalytix.",
  input_schema: {
    type: "object",
    properties: {
      resumo_semana: { type: "string", description: "1 a 2 frases sobre o que marcou a semana, em pt-BR" },
      itens: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer", description: "id da notícia na lista recebida" },
            categoria: { type: "string", enum: CATS },
            titulo: { type: "string", description: "título reescrito em pt-BR, até 110 caracteres" },
            resumo: { type: "string", description: "2 frases com suas palavras, em pt-BR, até 320 caracteres" },
            por_que_importa: { type: "string", description: "1 frase para empresas brasileiras: impacto e o que fazer, até 220 caracteres" },
            frente: { type: "string", enum: Object.keys(FRENTES) },
            destaque: { type: "boolean" },
          },
          required: ["id", "categoria", "titulo", "resumo", "por_que_importa", "frente", "destaque"],
        },
      },
    },
    required: ["resumo_semana", "itens"],
  },
};

const SISTEMA = `Você é o editor do "Radar da semana" da Nexalytix, empresa brasileira de tecnologia (cloud, segurança, FinOps, transformação digital e IA, SaaS, desenvolvimento e a Academia de formação em tecnologia). O público são gestores de pequenas, médias e grandes empresas no Brasil.
Escolha as notícias mais relevantes da semana para esse público, de 3 a 4 por categoria (tecnologia, negocios = negócios e setor financeiro, ativos = ativos digitais, seguranca, educacao). Total entre 12 e 18. Marque 3 itens como destaque (os mais importantes da semana, de categorias diferentes).
Regras:
- Use somente notícias da lista recebida, pelo id. Nunca invente fatos, números ou fontes; use apenas o que está no título e no trecho.
- Escreva título e resumo com suas próprias palavras, em português do Brasil, sem copiar frases da fonte. Traduza notícias em inglês.
- Evite fofoca, celebridades, promoções, reviews de produto de consumo, listas de compras, política partidária e conteúdo patrocinado.
- Em ativos digitais e finanças: informe, nunca recomende comprar ou vender; não faça previsão de preço.
- "por_que_importa": impacto prático para empresas e o que fazer, ligado à frente da Nexalytix escolhida em "frente".
- Prefira fatos com data, números e consequências claras. Se uma categoria não tiver notícias boas, coloque menos itens nela.`;

async function chamarIA(lista) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY ausente");
  const conteudo = lista.map((n) => `#${n.id} [${n.categoria}] ${n.fonte} · ${n.data.slice(0, 10)}\n${n.titulo}\n${n.trecho}`).join("\n\n");
  let ultimoErro;
  for (const model of MODELOS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 6000, system: SISTEMA, tools: [TOOL], tool_choice: { type: "tool", name: "publicar_radar" },
        messages: [{ role: "user", content: `Notícias dos últimos ${DIAS} dias:\n\n${conteudo}` }] }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { ultimoErro = new Error(`${model}: HTTP ${r.status} ${JSON.stringify(j).slice(0, 300)}`); console.warn(ultimoErro.message); continue; }
    const tu = (j.content || []).find((c) => c.type === "tool_use");
    if (!tu) { ultimoErro = new Error(`${model}: resposta sem seleção`); continue; }
    console.log(`IA: ${model}`);
    return tu.input;
  }
  throw ultimoErro;
}

// ---------- validação ----------
const PROIBIDO = /\b(compre|venda agora|recomendamos comprar|vai subir|vai cair)\b/i;
function validar(sel, porId) {
  const itens = [];
  const usados = new Set();
  for (const it of sel.itens || []) {
    const n = porId.get(it.id);
    if (!n || usados.has(it.id)) continue; // só notícias reais da lista
    if (!CATS.includes(it.categoria) || !FRENTES[it.frente]) continue;
    const titulo = String(it.titulo || "").trim().slice(0, 140), resumo = String(it.resumo || "").trim().slice(0, 420), pq = String(it.por_que_importa || "").trim().slice(0, 300);
    if (titulo.length < 15 || resumo.length < 40 || pq.length < 20) continue;
    if (PROIBIDO.test(resumo + " " + pq)) continue;
    usados.add(it.id);
    itens.push({ categoria: it.categoria, titulo, resumo, por_que_importa: pq, frente: it.frente, frente_nome: FRENTES[it.frente], destaque: !!it.destaque, fonte: n.fonte, url: n.url, data: n.data });
  }
  if (itens.length < 8) throw new Error(`Seleção insuficiente (${itens.length} itens válidos). Radar anterior mantido.`);
  if (!itens.some((i) => i.destaque)) itens.slice(0, 3).forEach((i) => (i.destaque = true));
  return itens;
}

// ---------- execução ----------
const agora = new Date();
const limite = new Date(agora - DIAS * 864e5);
const todas = (await Promise.all(CONF.fontes.map(baixar))).flat()
  .filter((n) => new Date(n.data) >= limite && new Date(n.data) <= new Date(+agora + 864e5));
const vistos = new Set();
const lista = [];
for (const n of todas.sort((a, b) => b.data.localeCompare(a.data))) {
  const k = n.url.split("?")[0] + "|" + n.titulo.toLowerCase().slice(0, 60);
  if (vistos.has(k)) continue; vistos.add(k);
  const porFonte = lista.filter((x) => x.fonte === n.fonte).length;
  if (porFonte >= 15) continue;
  lista.push({ ...n, id: lista.length + 1 });
}
console.log(`Notícias candidatas: ${lista.length}`);
if (lista.length < 10) { console.error("Poucas notícias coletadas. Radar anterior mantido."); process.exit(1); }
if (DRY) { console.log(JSON.stringify(lista.slice(0, 5), null, 2)); process.exit(0); }

const sel = await chamarIA(lista);
const itens = validar(sel, new Map(lista.map((n) => [n.id, n])));
const ordem = Object.fromEntries(CATS.map((c, i) => [c, i]));
itens.sort((a, b) => ordem[a.categoria] - ordem[b.categoria] || b.data.localeCompare(a.data));
const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).replace(".", "");
const radar = {
  atualizado_em: agora.toISOString(),
  periodo: `${fmt(limite)} a ${fmt(agora)} de ${agora.getFullYear()}`,
  resumo_semana: String(sel.resumo_semana || "").slice(0, 400),
  categorias: CONF.categorias,
  itens,
};
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, JSON.stringify(radar, null, 2));
console.log(`Radar gravado: ${itens.length} itens (${itens.filter((i) => i.destaque).length} destaques) em ${path.relative(ROOT, SAIDA)}`);
