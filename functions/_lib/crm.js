// Encaminha um lead para o CRM da Nexalytix.
// Prioridade: MAKE_WEBHOOK_URL (se configurado) → CRM direto (CRM_LEADS_URL + CRM_API_KEY).
// As chaves ficam só no servidor (variáveis do Cloudflare Pages), nunca no navegador.

const clean = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function normalizeLead(input = {}, extra = {}) {
  const lead = {
    nome: clean(input.nome, 120),
    email: clean(input.email, 160).toLowerCase(),
    whatsapp: clean(input.whatsapp, 40),
    empresa: clean(input.empresa, 160),
    porte: clean(input.porte, 40),
    assunto: clean(input.assunto || input.intent, 40) || "outro",
    mensagem: clean(input.mensagem || input.msg || input.resumo, 2000),
    origem: clean(extra.origem || input.origem, 40) || "site",
    pagina: clean(extra.pagina || input.pagina, 200),
    interesse: clean(input.interesse, 200),
    consentimento_lgpd: extra.consentimento_lgpd ?? Boolean(input.consentimento_lgpd),
    transcricao: clean(extra.transcricao, 8000),
    criado_em: new Date().toISOString(),
  };
  if (!lead.transcricao) delete lead.transcricao;
  if (!lead.interesse) delete lead.interesse;
  // Página como URL completa (o CRM espera URL): "#contato" → "https://site/#contato"
  if (extra.site && lead.pagina && lead.pagina.startsWith("#")) lead.pagina = `${extra.site}/${lead.pagina}`;
  return lead;
}

export function validateLead(lead) {
  if (lead.nome.length < 2) return "Informe o nome.";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  const phoneOk = lead.whatsapp.replace(/\D/g, "").length >= 10;
  if (!emailOk && !phoneOk) return "Informe um e-mail válido ou um WhatsApp com DDD.";
  return null;
}

export async function forwardLead(env, lead) {
  let url, headers = { "content-type": "application/json" }, body = lead;

  if (env.MAKE_WEBHOOK_URL) {
    url = env.MAKE_WEBHOOK_URL;
    if (env.MAKE_WEBHOOK_TOKEN) headers["x-make-apikey"] = env.MAKE_WEBHOOK_TOKEN;
  } else if (env.CRM_LEADS_URL && env.CRM_API_KEY) {
    // Vetra CRM (POST /api/public/leads). Especificação: nome + (email ou whatsapp) + company_id.
    url = env.CRM_LEADS_URL;
    const header = env.CRM_AUTH_HEADER || "x-api-key";
    headers[header] = header.toLowerCase() === "authorization" ? `Bearer ${env.CRM_API_KEY}` : env.CRM_API_KEY;
    body = toVetra(lead, env);
    } else {
    throw new Error("CRM não configurado: defina MAKE_WEBHOOK_URL ou CRM_LEADS_URL + CRM_API_KEY.");
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const txt = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`CRM respondeu ${res.status}: ${txt.slice(0, 300)}`);
  let out = {};
  try { out = JSON.parse(txt); } catch {}
  if (out && out.ok === false) throw new Error(`CRM recusou: ${txt.slice(0, 300)}`);
  return out;
}

// ---- Vetra CRM: mapeamento dos campos do site ----
const VETRA_COMPANY_ID = "d706a0c1-648b-4dc8-b96c-4ca02ff8c77f"; // empresa Nexalytix no CRM (pode trocar via CRM_COMPANY_ID)

const ASSUNTOS = {
  diagnostico: "Assessment / diagnóstico",
  servico: "Contratar serviço",
  demo: "Demonstração de SaaS",
  cotacao: "Cotação de produto ou parceiro",
  treinamento: "Academia / treinamento",
  parceria: "Parceria",
  emergencia: "Emergência / incidente",
  outro: "Outro",
};

function portePadrao(p) {
  const s = (p || "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("micro")) return "micro";
  if (s.includes("pequen")) return "pequena";
  if (s.includes("méd") || s.includes("med")) return "media";
  if (s.includes("grand")) return "grande";
  if (s.includes("startup") || s.includes("tech")) return "startup";
  return s.slice(0, 60);
}

export function toVetra(lead, env = {}) {
  const v = {
    company_id: env.CRM_COMPANY_ID || VETRA_COMPANY_ID,
    nome: lead.nome.slice(0, 100),
    email: lead.email || undefined,
    whatsapp: lead.whatsapp || undefined,
    empresa: lead.empresa ? lead.empresa.slice(0, 150) : undefined,
    porte: portePadrao(lead.porte),
    assunto: ASSUNTOS[lead.assunto] || lead.assunto.slice(0, 150),
    mensagem: lead.mensagem || undefined,
    origem: lead.origem.slice(0, 120),
    pagina: /^https?:\/\//.test(lead.pagina) ? lead.pagina.slice(0, 500) : undefined,
    consentimento_lgpd: !!lead.consentimento_lgpd,
    transcricao: lead.transcricao || undefined,
    interesse: lead.interesse || undefined,
    status: "ldr",
  };
  Object.keys(v).forEach((k) => v[k] === undefined && delete v[k]);
  return v;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// Aceita só chamadas do próprio site (ALLOWED_ORIGINS separado por vírgula; padrão: o próprio host).
export function originAllowed(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // navegadores sempre enviam Origin em POST; ferramentas de teste podem não enviar
  const host = new URL(request.url).host;
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const o = new URL(origin);
    return o.host === host || allowed.includes(o.origin);
  } catch {
    return false;
  }
}
