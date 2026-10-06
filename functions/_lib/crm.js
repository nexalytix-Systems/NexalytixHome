// Encaminha um lead para o CRM da Nexalytix.
// Prioridade: MAKE_WEBHOOK_URL (se configurado) → CRM direto (CRM_LEADS_URL + CRM_API_KEY).
// As chaves ficam só no servidor (variáveis do Cloudflare Pages), nunca no navegador.

const clean = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ---- Formatação dos campos ----
// Celular/WhatsApp → "+55 11 96590-4251" (aceita com ou sem 55, com ou sem máscara)
export function normFone(v) {
  const raw = clean(v, 40);
  if (!raw) return "";
  let d = raw.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) {
    const ddd = d.slice(0, 2), n = d.slice(2);
    return `+55 ${ddd} ${n.length === 9 ? n.slice(0, 5) + "-" + n.slice(5) : n.slice(0, 4) + "-" + n.slice(4)}`;
  }
  return raw; // formato desconhecido: validateLead decide
}
// Instagram → "@perfil"
export function normInstagram(v) {
  let s = clean(v, 200);
  if (!s) return "";
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^instagram\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0];
  return s ? "@" + s : "";
}
// LinkedIn → "https://www.linkedin.com/company/slug" (ou /in/ para perfil pessoal)
export function normLinkedin(v) {
  let s = clean(v, 300);
  if (!s) return "";
  const m = s.match(/linkedin\.com\/(company|in|school|showcase)\/([^/?#\s]+)/i);
  if (m) return `https://www.linkedin.com/${m[1].toLowerCase()}/${m[2]}`;
  if (/^[\w-]{2,100}$/.test(s)) return `https://www.linkedin.com/company/${s}`;
  return s; // validateLead decide
}

export function normalizeLead(input = {}, extra = {}) {
  const lead = {
    nome: clean(input.nome, 120),
    email: clean(input.email, 160).toLowerCase(),
    whatsapp: normFone(input.whatsapp),
    empresa: clean(input.empresa, 160),
    porte: clean(input.porte, 40),
    assunto: clean(input.assunto || input.intent, 40) || "outro",
    mensagem: clean(input.mensagem || input.msg || input.resumo, 2000),
    origem: clean(extra.origem || input.origem, 40) || "site",
    pagina: clean(extra.pagina || input.pagina, 200),
    interesse: clean(input.interesse, 200),
    cargo: clean(input.cargo, 100),
    instagram: normInstagram(input.instagram),
    linkedin: normLinkedin(input.linkedin),
    consentimento_lgpd: extra.consentimento_lgpd ?? Boolean(input.consentimento_lgpd),
    transcricao: clean(extra.transcricao, 8000),
    criado_em: new Date().toISOString(),
  };
  if (!lead.transcricao) delete lead.transcricao;
  for (const k of ["interesse", "cargo", "instagram", "linkedin"]) if (!lead[k]) delete lead[k];
  // Página como URL completa (o CRM espera URL): "#contato" → "https://site/#contato"
  if (extra.site && lead.pagina && lead.pagina.startsWith("#")) lead.pagina = `${extra.site}/${lead.pagina}`;
  return lead;
}

export function validateLead(lead) {
  if (lead.nome.length < 2) return "Informe o nome.";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  const phoneOk = /^\+55 \d{2} \d{4,5}-\d{4}$/.test(lead.whatsapp);
  if (!emailOk && !phoneOk) return "Informe um e-mail válido ou um WhatsApp com DDD.";
  if (lead.email && !emailOk) return "Confira o e-mail: use o formato nome@empresa.com.br.";
  if (lead.whatsapp && !/^\+55 \d{2} \d{4,5}-\d{4}$/.test(lead.whatsapp)) return "Confira o celular/WhatsApp: informe DDD e número, como (11) 96590-4251.";
  if (lead.instagram && !/^@[A-Za-z0-9._]{1,30}$/.test(lead.instagram)) return "Confira o Instagram: use o @ do perfil, como @suaempresa.";
  if (lead.linkedin && !/^https:\/\/www\.linkedin\.com\/(company|in|school|showcase)\/[^\s/]+$/.test(lead.linkedin)) return "Confira o LinkedIn: cole o link da página, como linkedin.com/company/suaempresa.";
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
    const e = new Error("CRM não configurado: defina MAKE_WEBHOOK_URL ou CRM_LEADS_URL + CRM_API_KEY."); e.code = "crm_sem_config"; throw e;
  }

  let res;
  try { res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) }); }
  catch (err) { const e = new Error(`Falha de rede ao chamar o CRM: ${err.message}`); e.code = "crm_rede"; throw e; }
  const txt = await res.text().catch(() => "");
  if (!res.ok) {
    const e = new Error(`CRM respondeu ${res.status}: ${txt.slice(0, 300)}`);
    e.code = `crm_${res.status}`;
    // Detalhe legível (sem dados sensíveis) para diagnóstico na homologação
    try {
      const j = JSON.parse(txt);
      const campos = j.issues ? Object.entries(j.issues).map(([k, v]) => `${k}: ${[].concat(v).join(", ")}`).join("; ") : "";
      e.detail = [j.error, campos].filter(Boolean).join(" · ").slice(0, 300);
    } catch { e.detail = txt.slice(0, 200); }
    throw e;
  }
  let out = null;
  try { out = JSON.parse(txt); } catch {}
  if (out && out.ok === false) { const e = new Error(`CRM recusou: ${txt.slice(0, 300)}`); e.code = "crm_recusou"; e.detail = out.error; throw e; }
  // No Vetra, sucesso só vale com { ok: true, id }. Qualquer outra resposta (ex.: página HTML) é tratada como erro.
  if (!env.MAKE_WEBHOOK_URL && !(out && out.ok === true && out.id)) {
    const e = new Error(`Resposta inesperada do CRM (${res.status}): ${txt.slice(0, 200)}`);
    e.code = "crm_resposta";
    e.detail = `HTTP ${res.status} · ${(res.headers.get("content-type") || "").split(";")[0]} · ${txt.replace(/\s+/g, " ").slice(0, 120)}`;
    throw e;
  }
  console.log("lead_forward_ok", out && out.id, out && out.stage);
  return out || {};
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

const CANAIS = {
  "formulario-contato": "Formulário de contato",
  "formulario-academia": "Lista de espera da Academia",
  "formulario-parceiros": "Programa de parceiros",
  "formulario-newsletter": "Newsletter",
  formulario: "Formulário do site",
  chatbot: "Alya (chat do site)",
  "chat-formulario": "Alya (formulário do chat)",
};

export function toVetra(lead, env = {}) {
  const canal = (CANAIS[lead.origem] || lead.origem || "Site").slice(0, 120);
  const v = {
    company_id: env.CRM_COMPANY_ID || VETRA_COMPANY_ID,
    nome: lead.nome.slice(0, 100),
    email: lead.email || undefined,
    whatsapp: lead.whatsapp || undefined,
    empresa: lead.empresa ? lead.empresa.slice(0, 150) : undefined,
    porte: portePadrao(lead.porte),
    assunto: ASSUNTOS[lead.assunto] || lead.assunto.slice(0, 150),
    mensagem: lead.mensagem || undefined,
    origem: "Site", // lista "Origem da captação" do Vetra
    canal, // "Detalhe da origem" no Vetra
    cargo: lead.cargo ? lead.cargo.slice(0, 120) : undefined,
    linkedin: lead.linkedin || undefined,
    instagram: lead.instagram || undefined,
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
