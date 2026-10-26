// POST /api/material — formulário das páginas de materiais (e-books).
// 1) registra o lead no Vetra CRM (mesmo caminho do formulário do site)
// 2) envia por e-mail o link de download para a pessoa (Resend)
// 3) avisa contato@nexalytix.com.br com as respostas
// Se o e-mail para a pessoa não sair, a página mostra o botão de download, para o material nunca se perder.
import { normalizeLead, validateLead, forwardLead, json, originAllowed } from "../_lib/crm.js";

// Materiais disponíveis. Para um e-book novo, acrescente uma entrada aqui e publique a página e o PDF.
const MATERIAIS = {
  "abismo-da-ia": {
    titulo: "O abismo da IA nas empresas",
    curto: "E-book Abismo da IA", // aparece no canal do Vetra: "Site Nexalytix · LinkedIn · E-book Abismo da IA"
    arquivo: "/materiais/arquivos/o-abismo-da-ia-nexalytix-k7q4.pdf",
  },
};

const FONTES = { linkedin: "LinkedIn", instagram: "Instagram", whatsapp: "WhatsApp", email: "E-mail", google: "Google" };
const OPCOES = {
  porte: ["Até 10 funcionários", "11 a 50", "51 a 200", "201 a 500", "Mais de 500"],
  uso_ia: ["Ainda não usa", "Pessoas usam por conta própria", "Fazendo testes", "Já tem IA em produção"],
  objetivo: ["Reduzir custos", "Vender mais", "Melhorar o atendimento", "Automatizar documentos e processos", "Segurança e LGPD"],
  prazo: ["Agora", "Em até 3 meses", "Em até 6 meses", "Só pesquisando"],
};
const pick = (v, lista) => (lista.includes(v) ? v : "");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function temperatura(r) {
  if (r.prazo === "Agora" || r.prazo === "Em até 3 meses") return "Quente";
  if (r.prazo === "Só pesquisando") return "Frio";
  return "Morno";
}

async function enviarEmail(env, msg) {
  if (!env.RESEND_API_KEY) return { ok: false, code: "email_sem_config" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify(msg),
    });
    if (!res.ok) { console.error("email_falhou", res.status, (await res.text().catch(() => "")).slice(0, 200)); return { ok: false, code: `email_${res.status}` }; }
    return { ok: true };
  } catch (e) { console.error("email_falhou", e.message); return { ok: false, code: "email_rede" }; }
}

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return json({ ok: false, error: "Origem não permitida." }, 403);
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: "Envio inválido." }, 400); }
  if (d.website) return json({ ok: true, enviado: true }); // campo invisível anti-robô

  const mat = MATERIAIS[d.material];
  if (!mat) return json({ ok: false, error: "Material não encontrado." }, 400);
  if (!d.consentimento_lgpd) return json({ ok: false, error: "Marque a autorização de contato (LGPD)." }, 400);

  const site = new URL(request.url).origin;
  const r = { porte: pick(d.porte, OPCOES.porte), uso_ia: pick(d.uso_ia, OPCOES.uso_ia), objetivo: pick(d.objetivo, OPCOES.objetivo), prazo: pick(d.prazo, OPCOES.prazo) };
  const fonte = FONTES[String(d.utm_source || "").toLowerCase()] || "Site";
  const temp = temperatura(r);
  const linkDownload = site + mat.arquivo;
  const resumo = [
    `E-book: ${mat.titulo}`,
    r.uso_ia && `Uso de IA hoje: ${r.uso_ia}`,
    r.objetivo && `Objetivo principal: ${r.objetivo}`,
    r.prazo && `Quando pretende agir: ${r.prazo}`,
    `Temperatura: ${temp}`,
    `Origem: ${fonte}${d.utm_medium ? " · " + String(d.utm_medium).slice(0, 30) : ""}${d.utm_campaign ? " · " + String(d.utm_campaign).slice(0, 40) : ""}`,
  ].filter(Boolean).join(" | ");

  const lead = normalizeLead(
    { nome: d.nome, email: d.email, whatsapp: d.whatsapp, empresa: d.empresa, cargo: d.cargo, porte: r.porte, assunto: "outro", mensagem: resumo, interesse: `E-book: ${mat.titulo}`, pagina: `/materiais/${d.material}` },
    { origem: `${fonte} · ${mat.curto}`.slice(0, 40), consentimento_lgpd: true, site }
  );
  if (!lead.email) return json({ ok: false, error: "Informe um e-mail válido para receber o material." }, 400);
  const problem = validateLead(lead);
  if (problem) return json({ ok: false, error: problem }, 400);

  // 1) CRM
  let crm;
  try { const out = await forwardLead(env, lead); crm = { ok: true, id: out.id }; }
  catch (e) { console.error("lead_forward_failed", e.code || "", e.message); crm = { ok: false, code: e.code || "crm_erro" }; }

  const from = env.MATERIAL_EMAIL_FROM || env.NOTIFY_EMAIL_FROM || "Nexalytix <materiais@nexalytix.com.br>";
  const primeiroNome = (lead.nome || "").split(" ")[0];

  // 2) e-mail para a pessoa com o link
  const paraPessoa = await enviarEmail(env, {
    from, to: [lead.email], reply_to: env.NOTIFY_EMAIL_TO || "contato@nexalytix.com.br",
    subject: `Seu e-book: ${mat.titulo}`,
    text: `Olá, ${primeiroNome}!\n\nObrigado pelo interesse. Baixe o e-book "${mat.titulo}" neste link:\n${linkDownload}\n\nQuer saber de que lado do abismo sua empresa está? Conheça o Assessment de IA da Nexalytix: ${site}/assessment\n\nEquipe Nexalytix\ncontato@nexalytix.com.br · WhatsApp (11) 96590-4251`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1A2133;max-width:560px;line-height:1.5">
<p>Olá, ${esc(primeiroNome)}!</p><p>Obrigado pelo interesse. Seu e-book <b>${esc(mat.titulo)}</b> está pronto para download:</p>
<p style="margin:24px 0"><a href="${linkDownload}" style="background:#E2580A;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:bold;display:inline-block">Baixar o e-book</a></p>
<p>Ao final do material há um autodiagnóstico de 10 perguntas. Se quiser conversar sobre o resultado, é só responder este e-mail.</p>
<p>Quer estar entre as empresas que geram resultado com IA? Conheça o <a href="${site}/assessment" style="color:#0C42B4">Assessment de IA da Nexalytix</a>.</p>
<p style="color:#5A6378;font-size:13px;margin-top:28px">Equipe Nexalytix · contato@nexalytix.com.br · WhatsApp (11) 96590-4251<br>Você recebeu este e-mail porque pediu o material em nexalytix.com.br.</p></div>`,
  });

  // 3) alerta interno para contato@
  const to = (env.NOTIFY_EMAIL_TO || "contato@nexalytix.com.br").split(",").map((s) => s.trim()).filter(Boolean);
  const linhas = [["Nome", lead.nome], ["E-mail", lead.email], ["WhatsApp", lead.whatsapp], ["Empresa", lead.empresa], ["Cargo", lead.cargo], ["Porte", r.porte], ["Uso de IA hoje", r.uso_ia], ["Objetivo principal", r.objetivo], ["Quando pretende agir", r.prazo], ["Temperatura", temp], ["Origem", fonte], ["CRM", crm.ok ? `registrado (id ${crm.id || "-"})` : `NÃO registrado (${crm.code}) — cadastre manualmente`], ["E-mail com o e-book", paraPessoa.ok ? "enviado" : "não enviado (a pessoa baixou pela página)"]].filter(([, v]) => v);
  await enviarEmail(env, {
    from, to, reply_to: lead.email,
    subject: `[${temp}] E-book ${mat.titulo}: ${lead.nome}${lead.empresa ? " · " + lead.empresa : ""}`.slice(0, 150),
    text: linhas.map(([k, v]) => `${k}: ${v}`).join("\n"),
    html: `<table style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A2133;border-collapse:collapse">${linhas.map(([k, v]) => `<tr><td style="padding:5px 14px 5px 0;color:#5A6378">${esc(k)}</td><td style="padding:5px 0">${esc(v)}</td></tr>`).join("")}</table>`,
  });

  // Se o e-mail para a pessoa saiu, a página só confirma; se não saiu, entrega o link na tela.
  if (paraPessoa.ok) return json({ ok: true, enviado: true });
  return json({ ok: true, enviado: false, download: mat.arquivo });
}
