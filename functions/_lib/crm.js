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
    consentimento_lgpd: extra.consentimento_lgpd ?? Boolean(input.consentimento_lgpd),
    transcricao: clean(extra.transcricao, 8000),
    criado_em: new Date().toISOString(),
  };
  if (!lead.transcricao) delete lead.transcricao;
  return lead;
}

export function validateLead(lead) {
  if (!lead.nome) return "Informe o nome.";
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
    url = env.CRM_LEADS_URL;
    const header = env.CRM_AUTH_HEADER || "x-api-key";
    headers[header] = header.toLowerCase() === "authorization" ? `Bearer ${env.CRM_API_KEY}` : env.CRM_API_KEY;
    // Mapeamento de campos para o Vetra CRM: ajuste aqui se o endpoint usar outros nomes.
    body = {
      name: lead.nome,
      email: lead.email || undefined,
      phone: lead.whatsapp || undefined,
      company: lead.empresa || undefined,
      source: `site:${lead.origem}`,
      notes: [
        `Assunto: ${lead.assunto}`,
        lead.porte && `Porte: ${lead.porte}`,
        lead.mensagem && `Mensagem: ${lead.mensagem}`,
        lead.pagina && `Página: ${lead.pagina}`,
        lead.transcricao && `Conversa com o assistente:\n${lead.transcricao}`,
      ].filter(Boolean).join("\n"),
      consent_lgpd: lead.consentimento_lgpd,
    };
  } else {
    throw new Error("CRM não configurado: defina MAKE_WEBHOOK_URL ou CRM_LEADS_URL + CRM_API_KEY.");
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`CRM respondeu ${res.status}: ${txt.slice(0, 200)}`);
  }
  return true;
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
