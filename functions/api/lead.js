// POST /api/lead — recebe formulários do site e envia ao CRM.
import { normalizeLead, validateLead, forwardLead, json, originAllowed } from "../_lib/crm.js";

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

  const lead = normalizeLead(data, { origem: data.origem || "formulario", consentimento_lgpd: true });
  const problem = validateLead(lead);
  if (problem) return json({ ok: false, error: problem }, 400);

  try {
    await forwardLead(env, lead);
    return json({ ok: true });
  } catch (e) {
    console.error("lead_forward_failed", e.message);
    return json({ ok: false, error: "Não conseguimos registrar agora. Escreva para contato@nexalytix.com.br." }, 502);
  }
}

