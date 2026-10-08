// Alerta por e-mail a cada lead recebido pelo site (formulários e Alya).
// Vai sempre para um único endereço (NOTIFY_EMAIL_TO, padrão contato@nexalytix.com.br),
// com o resultado do CRM: se o CRM falhar, o e-mail garante que o lead não se perde.
//
// Envio: Resend (RESEND_API_KEY) ou, como alternativa, um webhook do Make (NOTIFY_WEBHOOK_URL)
// que manda o e-mail. Sem nenhum dos dois, o alerta é ignorado e o log registra "email_sem_config".
import { CANAIS } from "./crm.js";

const ASSUNTOS = {
  diagnostico: "Pedido de Assessment",
  cotacao: "Pedido de orçamento",
  demo: "Pedido de demonstração",
  servico: "Contratar um serviço",
  emergencia: "URGENTE: incidente de segurança",
  parceria: "Programa de parceiros",
  treinamento: "Lista de espera da Academia",
  outro: "Novo contato",
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function montarAlerta(lead, crm = {}) {
  const urgente = lead.assunto === "emergencia";
  const tipo = lead.origem === "formulario-newsletter" ? "Inscrição na newsletter" : lead.origem === "chatbot" || lead.origem === "chat-formulario" ? `Lead da Alya: ${ASSUNTOS[lead.assunto] || "conversa"}` : (ASSUNTOS[lead.assunto] || "Novo contato");
  const canal = CANAIS[lead.origem] || lead.origem || "Site";
  const subject = `${urgente ? "[URGENTE] " : "[Site] "}${tipo}: ${lead.nome}${lead.empresa ? " · " + lead.empresa : ""}`.slice(0, 150);
  const crmLinha = crm.ok
    ? `Registrado no CRM${crm.id ? ` (id ${crm.id})` : ""}.`
    : `NÃO foi registrado no CRM (código ${crm.code || "desconhecido"}). Cadastre manualmente a partir deste e-mail.`;
  const campos = [
    ["Nome", lead.nome],
    ["E-mail", lead.email],
    ["WhatsApp", lead.whatsapp],
    ["Empresa", lead.empresa],
    ["Cargo", lead.cargo],
    ["Porte", lead.porte],
    ["Interesse", lead.interesse],
    ["Instagram", lead.instagram],
    ["LinkedIn", lead.linkedin],
    ["Mensagem", lead.mensagem],
    ["Canal", canal],
    ["Página", lead.pagina],
    ["Recebido em", new Date(lead.criado_em || Date.now()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
  ].filter(([, v]) => v);
  const text = [tipo, crmLinha, "", ...campos.map(([k, v]) => `${k}: ${v}`), ...(lead.transcricao ? ["", "Conversa com a Alya:", lead.transcricao] : []), "", "Responda este e-mail para falar direto com a pessoa."].join("\n");
  const cor = crm.ok ? "#1E8E5A" : "#B4470A";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A2133;max-width:640px">
<h2 style="margin:0 0 8px;font-size:18px">${esc(tipo)}</h2>
<p style="margin:0 0 16px;padding:10px 12px;border-left:4px solid ${cor};background:#F6F8FC">${esc(crmLinha)}</p>
<table style="border-collapse:collapse;width:100%">${campos.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5A6378;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join("")}</table>
${lead.transcricao ? `<h3 style="font-size:15px;margin:20px 0 8px">Conversa com a Alya</h3><pre style="white-space:pre-wrap;font-family:inherit;background:#F6F8FC;padding:12px;border-radius:8px">${esc(lead.transcricao)}</pre>` : ""}
<p style="margin:20px 0 0;color:#5A6378;font-size:12px">Responda este e-mail para falar direto com a pessoa. Alerta automático do site nexalytix.com.br.</p></div>`;
  return { subject, text, html, urgente };
}

export async function notifyLead(env, lead, crm = {}) {
  const to = (env.NOTIFY_EMAIL_TO || "contato@nexalytix.com.br").split(",").map((s) => s.trim()).filter(Boolean);
  const from = env.NOTIFY_EMAIL_FROM || "Site Nexalytix <site@nexalytix.com.br>";
  const { subject, text, html, urgente } = montarAlerta(lead, crm);
  const replyTo = lead.email || undefined;
  try {
    let res;
    if (env.RESEND_API_KEY) {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({ from, to, subject, text, html, reply_to: replyTo, headers: urgente ? { "X-Priority": "1" } : undefined }),
      });
    } else if (env.NOTIFY_WEBHOOK_URL) {
      res = await fetch(env.NOTIFY_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, subject, text, html, reply_to: replyTo, urgente, crm_ok: !!crm.ok, lead }),
      });
    } else {
      console.warn("email_sem_config");
      return { ok: false, code: "email_sem_config" };
    }
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("email_falhou", res.status, t.slice(0, 200));
      return { ok: false, code: `email_${res.status}` };
    }
    console.log("email_ok");
    return { ok: true };
  } catch (e) {
    console.error("email_falhou", e.message);
    return { ok: false, code: "email_rede" };
  }
}
