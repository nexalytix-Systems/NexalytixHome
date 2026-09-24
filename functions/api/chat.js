// POST /api/chat — assistente com IA (Claude) do site Nexalytix.
// Corpo: { messages: [{role:"user"|"assistant", content:string}], pagina?: string }
// Resposta: { reply: string, leadSaved: boolean }
import { KNOWLEDGE, LEAD_TOOL } from "../_lib/knowledge.js";
import { normalizeLead, validateLead, forwardLead, json, originAllowed } from "../_lib/crm.js";

const MAX_TURNS = 24;
const MAX_CHARS = 1500;

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return json({ error: "Origem não permitida." }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "Assistente não configurado." }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Envio inválido." }, 400);
  }

  // Sanitiza o histórico enviado pelo navegador.
  let messages = Array.isArray(body.messages) ? body.messages : [];
  messages = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_TURNS);
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return json({ error: "A conversa precisa terminar com uma mensagem do visitante." }, 400);
  }

  const pagina = typeof body.pagina === "string" ? body.pagina.slice(0, 200) : "";
  const transcript = messages.map((m) => `${m.role === "user" ? "Visitante" : "Alya"}: ${m.content}`).join("\n");
  let leadSaved = false;
  const convo = [...messages];

  for (let round = 0; round < 3; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 700,
        system: KNOWLEDGE,
        tools: [LEAD_TOOL],
        messages: convo,
      }),
    });

    if (!res.ok) {
      console.error("anthropic_error", res.status, (await res.text()).slice(0, 300));
      return json({ error: "O assistente está indisponível agora. Use o formulário de contato." }, 502);
    }

    const data = await res.json();
    const toolUses = (data.content || []).filter((c) => c.type === "tool_use");
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();

    if (data.stop_reason !== "tool_use" || !toolUses.length) {
      return json({ reply: text || "Pode repetir, por favor?", leadSaved });
    }

    convo.push({ role: "assistant", content: data.content });
    const results = [];
    for (const tu of toolUses) {
      let result;
      if (tu.name === LEAD_TOOL.name && !leadSaved) {
        const lead = normalizeLead(tu.input, { origem: "chatbot", pagina, transcricao: transcript, consentimento_lgpd: true });
        const problem = validateLead(lead);
        if (problem) {
          result = { ok: false, error: problem };
        } else {
          try {
            await forwardLead(env, lead);
            leadSaved = true;
            result = { ok: true };
          } catch (e) {
            console.error("lead_forward_failed", e.message);
            result = { ok: false, error: "Falha ao registrar. Peça ao visitante para escrever para contato@nexalytix.com.br." };
          }
        }
      } else {
        result = { ok: leadSaved, error: leadSaved ? undefined : "Ferramenta desconhecida." };
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) });
    }
    convo.push({ role: "user", content: results });
  }

  return json({ reply: "Registrei suas informações. Nosso time retorna em até 24 horas úteis.", leadSaved });
}

