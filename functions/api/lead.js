// POST /api/lead — recebe formulários do site e envia ao CRM.
import { normalizeLead, validateLead, forwardLead, json, originAllowed } from "../_lib/crm.js";
import { notifyLead } from "../_lib/notify.js";

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return json({ ok: false, error: "Origem não permitida." }, 403);

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Envio inválido." }, 400);
  }

  // Honeypot anti-spam: campo invisível que pessoas não preenchem.
  if (data.website) return json({ ok: true });

  if (!data.consentimento_lgpd) return json({ ok: false, error: "Marque a autorização de contato (LGPD)." }, 400);

  const lead = normalizeLead(data, { origem: data.origem || "formulario", consentimento_lgpd: true, site: new URL(request.url).origin });
  const problem = validateLead(lead);
  if (problem) return json({ ok: false, error: problem }, 400);

  // 1) CRM  2) alerta por e-mail para contato@ (sempre, com o resultado do CRM).
  // Se o CRM falhar mas o e-mail sair, o lead está a salvo: o visitante vê sucesso.
  let crm;
  try {
    const out = await forwardLead(env, lead);
    crm = { ok: true, id: out.id, stage: out.stage };
  } catch (e) {
    console.error("lead_forward_failed", e.code || "", e.message);
    crm = { ok: false, code: e.code || "crm_erro", detail: e.detail || e.message };
  }
  const email = await notifyLead(env, lead, crm);
  if (crm.ok || email.ok) return json({ ok: true });
  // Na homologação (*.pages.dev) devolve o detalhe do CRM para facilitar o diagnóstico
  const homolog = new URL(request.url).hostname.endsWith(".pages.dev");
  return json({ ok: false, code: crm.code, detail: homolog ? crm.detail : undefined, error: `Não conseguimos registrar agora (código ${crm.code}).` }, 502);
}

