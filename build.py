#!/usr/bin/env python3
"""Gera index.html (raiz) e dist/index.html a partir de src/site.html + src/nexa.js + functions/_lib/knowledge.js.
Uso: python3 build.py
"""
import json, re, pathlib, shutil

root = pathlib.Path(__file__).parent
html = (root / "src/site.html").read_text()
nexa = (root / "src/nexa.js").read_text()
kjs = (root / "functions/_lib/knowledge.js").read_text()

# Dados da empresa (empresa.json) → rodapé, Política de Privacidade e Termos
emp = json.loads((root / "empresa.json").read_text())
razao, cnpj = emp.get("razao_social","").strip(), emp.get("cnpj","").strip()
nome_legal = f"Nexalytix, marca de {razao}" if razao else "Nexalytix"
controlador = (f"{razao}, inscrita no CNPJ {cnpj}" if razao and cnpj else razao or "Nexalytix") + (f", com sede em {emp['endereco']}" if emp.get("endereco") else "") + ' ("Nexalytix")' * bool(razao)
contatos = [emp.get("email","")]
tel, whats = emp.get("telefone","").strip(), emp.get("whatsapp","").strip()
def walink(n, label):
    wa = re.sub(r"\D", "", n); wa = wa if wa.startswith("55") else "55" + wa
    return f'<a href="https://wa.me/{wa}" target="_blank" rel="noopener">{label}</a>'
if tel and whats and re.sub(r"\D","",tel) == re.sub(r"\D","",whats):
    contatos.append(walink(whats, f"{tel} (telefone e WhatsApp)"))
else:
    if tel: contatos.append("Tel. " + tel)
    if whats: contatos.append(walink(whats, "WhatsApp " + whats))
contatos.append(emp.get("endereco") or emp.get("cidade_uf",""))
tokens = {
    "{{NOME_LEGAL}}": nome_legal,
    "{{CNPJ_RODAPE}}": f" CNPJ {cnpj}." if cnpj else "",
    "{{CONTATOS_RODAPE}}": " · ".join(c for c in contatos if c),
    "{{CONTROLADOR}}": controlador,
    "{{EMAIL}}": emp.get("email","contato@nexalytix.com.br"),
    "{{EMAIL_PRIVACIDADE}}": emp.get("email_privacidade") or emp.get("email",""),
    "{{ATUALIZADO_EM}}": emp.get("atualizado_em",""),
    "{{FORO}}": (emp.get("cidade_uf") or "São Paulo, SP").replace(", ", "/"),
    "{{SEDE}}": emp.get("endereco") or emp.get("cidade_uf",""),
    "{{WHATS_CARD}}": (f'<div class="card"><h3>Telefone e WhatsApp</h3><p class="muted small">{whats or tel}</p>' + (walink(whats, "Chamar no WhatsApp →") if whats else "") + '</div>') if (whats or tel) else "",
    "{{CONTATO_TERMOS}}": (" · Tel. " + emp["telefone"]) if emp.get("telefone") else "",
}
for k, v in tokens.items():
    html = html.replace(k, v)
faltam = [k for k in ("razao_social", "cnpj", "telefone", "whatsapp") if not emp.get(k)]
if faltam:
    print("AVISO: preencha em empresa.json antes da produção:", ", ".join(faltam))

kb = re.search(r"export const KNOWLEDGE = `(.*?)`;", kjs, re.S).group(1)
schema_src = re.search(r"input_schema: (\{.*?\n  \}),\n\};", kjs, re.S).group(1)
# converte o objeto JS do schema em JSON
schema_json = re.sub(r"(\s)(\w+):", r'\1"\2":', schema_src)
schema_json = re.sub(r",(\s*[}\]])", r"\1", schema_json)
schema = json.loads(schema_json)

nexa = nexa.replace('/*__KB__*/""', json.dumps(kb, ensure_ascii=False)).replace("/*__SCHEMA__*/{}", json.dumps(schema, ensure_ascii=False))

# 1) remove o tratamento antigo de formulários (substituído por nexa.js)
html = re.sub(r"/\* ---------- Forms ---------- \*/.*?(?=const intentSel)", "/* Formulários: ver script do assistente abaixo */\n", html, flags=re.S)

# 2) CSS do chat
css = """
.hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}
#nexaOpen{position:fixed;right:20px;bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:45;display:inline-flex;align-items:center;gap:10px;padding:12px 18px 12px 12px;border-radius:999px;border:0;background:var(--band);color:var(--band-text);font:600 .92rem var(--font-b);cursor:pointer;box-shadow:0 12px 30px -10px rgba(6,9,16,.55)}
#nexaOpen .av{width:36px;height:36px;border-radius:11px;display:block}
#nexa{position:fixed;right:20px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:46;width:min(390px,calc(100vw - 32px));height:min(620px,calc(100dvh - 120px));background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 60px -24px rgba(6,9,16,.5);display:flex;flex-direction:column;overflow:hidden}
#nexa[hidden]{display:none!important}
.nexa-head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--band);color:var(--band-text)}
.nexa-head .av{width:38px;height:38px;border-radius:12px;flex:none;display:block}
.nexa-head b{display:block;font-family:var(--font-d);font-size:.98rem}
.nexa-head span{display:block;font-size:.75rem;color:var(--band-muted)}
.nexa-head button{margin-left:auto;background:none;border:1px solid var(--band-line);color:var(--band-text);border-radius:8px;width:34px;height:34px;cursor:pointer}
.nexa-intro{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:#050811;color:#E8EEF8;align-self:stretch}.nexa-intro video,.nexa-intro img{width:72px;height:72px;border-radius:10px;object-fit:cover;flex:none}.nexa-intro b{display:block;font-family:var(--font-d);font-size:1rem}.nexa-intro span{font-size:.8rem;color:#9FB0C8}
#nexaLog{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--bg)}
.msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:.92rem;line-height:1.5;overflow-wrap:anywhere}
.msg p{margin:0}.msg p+p{margin-top:6px}
.msg ul{margin:4px 0;padding-left:18px}
.msg.bot{background:var(--surface);border:1px solid var(--line);border-bottom-left-radius:4px;align-self:flex-start}
.msg.user{background:var(--primary);color:var(--primary-ink);border-bottom-right-radius:4px;align-self:flex-end}
.msg.user a{color:inherit}
.typing{display:flex;gap:4px;padding:4px 0}
.typing i{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:blink 1.2s infinite}
.typing i:nth-child(2){animation-delay:.2s}.typing i:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
.nexa-chips{display:flex;flex-wrap:wrap;gap:6px}
.nexa-note{align-self:center;font-size:.78rem;color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent);padding:6px 10px;border-radius:999px;text-align:center}
.nexa-lead{display:grid;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px}
.nexa-lead input:not([type=checkbox]),.nexa-lead textarea{font:inherit;font-size:.9rem;padding:9px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);width:100%}
.nexa-lead .btn{padding:10px 14px;justify-content:center}
#nexaForm{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line);background:var(--surface)}
#nexaInput{flex:1;min-width:0;font:inherit;font-size:.93rem;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text)}
#nexaForm .btn{padding:11px 14px}
.nexa-foot{font-size:.7rem;color:var(--muted);text-align:center;padding:0 12px 10px;background:var(--surface)}
.lead-row{display:grid;gap:4px;padding:12px 0;border-top:1px solid var(--line)}
.lead-row .top{display:flex;justify-content:space-between;gap:8px;align-items:center}
#ownerLeads{background:none;border:1px solid var(--band-line);color:var(--band-muted);border-radius:6px;padding:4px 10px;cursor:pointer;font:500 .8rem var(--font-b)}
@media (max-width:560px){#nexa{right:0;left:0;bottom:0;width:100%;height:calc(100dvh - 60px);border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom,0px)}#nexaOpen{right:14px;padding:10px}#nexaOpen .lbl{display:none}}
"""
html = html.replace("@media (prefers-reduced-motion:reduce)", css + "@media (prefers-reduced-motion:reduce)", 1)

# 3) honeypot em todos os formulários + WhatsApp no contato
html = html.replace('<form class="f" ', '<form class="f" autocomplete="on" ')
html = re.sub(r'(<form class="f"[^>]*>)', r'\1\n        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">', html)

# 4) atalho para o chat no contato + botão de leads no rodapé
html = html.replace(
    '<div class="card"><h3>Endereço</h3>',
    '<div class="card"><h3>Prefere conversar agora?</h3><p class="muted small">A Alya, nossa assistente com IA, tira dúvidas e passa seu contato para o time.</p><button type="button" class="btn btn-ghost" data-nexa style="justify-self:start">Falar com a Alya</button></div>\n      <div class="card"><h3>Endereço</h3>')
html = html.replace(
    '<a href="#termos">Termos de uso</a></span>',
    '<a href="#termos">Termos de uso</a> <button type="button" id="ownerLeads" hidden>Leads da prévia</button></span>', 1)
assert 'id="ownerLeads"' in html, "botão de leads não inserido"

# 5) widget + script
widget = """
<button type="button" id="nexaOpen" aria-expanded="false" aria-controls="nexa" aria-label="Fale com a Alya, assistente da Nexalytix"><img class="av" src="assets/alya-avatar.svg" alt="" width="36" height="36"><span class="lbl">Fale com a Alya</span></button>
<section id="nexa" hidden role="dialog" aria-label="Chat com a Alya, assistente da Nexalytix">
  <div class="nexa-head"><img class="av" src="assets/alya-avatar.svg" alt="" width="38" height="38"><div><b>Alya</b><span>Assistente com IA da Nexalytix · online</span></div><button type="button" id="nexaClose" aria-label="Fechar chat">✕</button></div>
  <div id="nexaLog" aria-live="polite"></div>
  <form id="nexaForm"><input id="nexaInput" autocomplete="off" placeholder="Escreva sua pergunta" aria-label="Mensagem para a Alya" maxlength="1500"><button class="btn btn-primary" id="nexaSend" type="submit">Enviar</button><button class="btn btn-ghost" id="nexaStop" type="button" hidden>Parar</button></form>
  <p class="nexa-foot">Respostas geradas por IA podem conter erros; o time Nexalytix confirma propostas e prazos. <a href="#privacidade">Privacidade</a></p>
</section>
<script>
""" + nexa + "\n</script>\n"
html = html.rstrip() + "\n" + widget

out = root / "dist"
out.mkdir(exist_ok=True)
# Versão da prévia (claude.ai adiciona o esqueleto <html>/<head>)
(root / "preview.html").write_text(html)
# Versão de produção: documento HTML completo
m = re.match(r"\s*(<title>.*?</title>\s*<meta name=\"description\"[^>]*>)", html, re.S)
head_bits = m.group(1)
body = html[m.end():]

# ---------- Páginas com endereço próprio: título e descrição de cada uma ----------
ROUTES = {
  "home": ("Nexalytix | SaaS, Cloud, FinOps, Segurança e IA", "Nexalytix: SaaS, Cloud, FinOps e Segurança em um só ecossistema, do diagnóstico à operação contínua."),
  "ecossistema": ("Ecossistema Nexalytix | Como as frentes se conectam", "Assessment, consultoria, implementação e sustentação em torno do seu negócio, com domínios, SaaS, Academia e parceiros conectados."),
  "servicos": ("Serviços de TI e Segurança | Nexalytix", "Do assessment à sustentação: catálogo de serviços em cloud, segurança, FinOps, IA, desenvolvimento de produtos e PMO."),
  "assessment": ("Assessment e diagnóstico de TI | Nexalytix", "Diagnóstico de negócio, tecnologia e cultura, com riscos e oportunidades priorizados e um roadmap com quick wins. Entrega em até 10 dias."),
  "consultoria": ("Consultoria em Cloud, Segurança e IA | Nexalytix", "Arquitetura, planos de migração, segurança, governança e FinOps para transformar o diagnóstico em plano de ação."),
  "implementacao": ("Implementação e migração para cloud | Nexalytix", "Migração para cloud, segurança, automação, IA e software sob medida, entregues por squads com método e previsibilidade."),
  "sustentacao": ("Sustentação e suporte de TI 24x7 | Nexalytix", "Operação contínua: monitoramento 24x7, SOC, FinOps contínuo, service desk e manutenção preventiva e corretiva."),
  "cloud": ("Cloud e Infraestrutura | Nexalytix", "Migração e modernização em AWS, Azure, GCP e OMID, redes, backup e recuperação de desastres, com operação 24x7."),
  "seguranca": ("Segurança, SOC e CISO as a Service | Nexalytix", "Assessment de segurança, pentest, SOC 24x7, resposta a incidentes, LGPD e CISO as a Service para empresas de todos os portes."),
  "finops": ("FinOps e redução de custos de cloud | Nexalytix", "Diagnóstico de custos de nuvem, governança FinOps e otimização contínua, com metas e relatório mensal."),
  "ia": ("Transformação Digital e IA | Nexalytix", "Diagnóstico de maturidade em IA, agentes de atendimento e automação de documentos e processos, com segurança e LGPD."),
  "dev": ("Desenvolvimento de Negócios e Produtos | Nexalytix", "Discovery, MVP, software sob medida, squads e CTO as a Service para tirar produtos digitais do papel."),
  "pmo": ("PMO as a Service e Gestão de Projetos | Nexalytix", "Estruturação de PMO, gestão de portfólio e de projetos e PMO as a Service para entregar no prazo e no orçamento."),
  "saas": ("SaaS Nexalytix | ERP, CRM, Financeiro e IA", "Produtos próprios: ERP, CRM, Sistema Financeiro, Transcribe e a assistente Alya, com implantação e suporte Nexalytix."),
  "saas-erp": ("ERP Nexalytix | Gestão empresarial integrada", "Compras, estoque, vendas e faturamento integrados em um só sistema, para tirar a operação das planilhas."),
  "saas-crm": ("CRM Nexalytix | Vendas e relacionamento", "Funil de vendas, leads e relacionamento com clientes em um só lugar, com contatos do site, WhatsApp e indicações."),
  "saas-financeiro": ("Sistema Financeiro Nexalytix | Gestão financeira", "Contas a pagar e a receber, fluxo de caixa e conciliação para saber quanto entra, quanto sai e quanto sobra."),
  "saas-transcribe": ("Transcribe | Transcrição de áudio e vídeo com IA", "Reuniões, atendimentos e entrevistas viram texto pesquisável, com resumo e pontos de ação gerados por IA."),
  "saas-alya": ("Alya | Assistente de IA para o seu site", "Atendimento 24 horas com IA treinada no conteúdo da sua empresa e ligada ao CRM, transformando conversas em leads."),
  "academia": ("Academia Nexalytix | Formação em TI e residência em squads", "Fundamentos de TI, dez trilhas e residência em squads com projetos reais. Lista de espera da turma piloto aberta."),
  "parceiros": ("Programa de Parceiros | Nexalytix", "Indique clientes, some seu talento a projetos ou leve nossas soluções para a sua carteira: indicação, freelancers, revendas e fabricantes."),
  "aliancas": ("Parceiros de tecnologia | Nexalytix", "Hyland, ManageEngine, Acronis e OMID, com implementação, suporte e operação da Nexalytix."),
  "conteudos": ("Conteúdos e Radar semanal | Nexalytix", "Resumo semanal das principais notícias de tecnologia, negócios e setor financeiro, ativos digitais, segurança e educação."),
  "sobre": ("Sobre a Nexalytix | Grupo Vieira Prime", "Quem somos e como trabalhamos: tecnologia e segurança em um só ecossistema, do diagnóstico à operação contínua."),
  "contato": ("Fale com um especialista | Nexalytix", "Agende um diagnóstico, peça uma proposta ou relate um incidente de segurança. Retorno em até 24 horas úteis."),
  "privacidade": ("Política de Privacidade | Nexalytix", "Como a Nexalytix coleta, usa, guarda e protege dados pessoais, conforme a LGPD."),
  "termos": ("Termos de Uso | Nexalytix", "Regras de uso do site e dos canais digitais da Nexalytix."),
}
def route_path(k):
    return "/" if k == "home" else ("/saas/" + k[5:] if k.startswith("saas-") else "/" + k)

# ---------- SEO: canonical, Open Graph, dados estruturados e exibição inicial ----------
SITE = "https://nexalytix.com.br"
_end = emp["endereco"]
_ld = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": SITE + "/#empresa",
  "name": "Nexalytix",
  "legalName": emp["razao_social"],
  "taxID": emp["cnpj"],
  "url": SITE + "/",
  "logo": SITE + "/assets/logo-nexalytix-systems.png",
  "image": SITE + "/assets/og-nexalytix.jpg",
  "description": "Ecossistema de tecnologia: SaaS, Cloud, FinOps, Segurança, IA e Academia, do diagnóstico à operação contínua.",
  "email": emp["email"],
  "telephone": "+55 " + emp["telefone"],
  "address": {"@type": "PostalAddress", "streetAddress": "Alameda Grajaú, 219, Alphaville Industrial",
              "addressLocality": "Barueri", "addressRegion": "SP", "postalCode": "06454-050", "addressCountry": "BR"},
  "areaServed": "BR",
  "knowsAbout": ["Cloud", "FinOps", "Segurança da informação", "SOC", "Inteligência artificial", "ERP", "CRM", "PMO", "DevOps"],
  "contactPoint": {"@type": "ContactPoint", "contactType": "sales", "telephone": "+55 " + emp["telefone"], "email": emp["email"], "availableLanguage": "pt-BR"}
}
_boot = ("(function(){var d=document.documentElement;d.dataset.mode='path';"
         "var p=location.pathname.replace(/\\/+$/,'')||'/';var k=(p==='/'||p==='/index.html')?'home':p.slice(1);"
         "if(/^saas\\/[a-z0-9-]+$/.test(k))k='produto';var h=location.hash.slice(1);"
         "if(k==='home'&&/^[a-z0-9-]+$/.test(h))k=h.indexOf('saas-')===0?'produto':h;"
         "var m={assessment:'etapa',consultoria:'etapa',implementacao:'etapa',sustentacao:'etapa',cloud:'dominio',seguranca:'dominio',finops:'dominio',dev:'dominio',pmo:'dominio',solucoes:'saas'};"
         "k=m[k]||k;if(!/^[a-z0-9-]+$/.test(k))k='home';var s=document.createElement('style');s.id='bootcss';"
         "s.textContent='.page[data-page=\"'+k+'\"]{display:block}footer{visibility:hidden}';document.head.appendChild(s);})();")
SEO_HEAD = (
    f'<link rel="canonical" href="{SITE}/">\n'
    f'<meta property="og:type" content="website">\n'
    f'<meta property="og:site_name" content="Nexalytix">\n'
    f'<meta property="og:url" content="{SITE}/">\n'
    f'<meta property="og:image" content="{SITE}/assets/og-nexalytix.jpg">\n'
    '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
    '<meta property="og:image:alt" content="Nexalytix: tecnologia e segurança em um só ecossistema">\n'
    '<meta name="twitter:card" content="summary_large_image">\n'
    '<meta name="theme-color" content="#0A0D16">\n'
    '<script type="application/ld+json">' + json.dumps(_ld, ensure_ascii=False) + '</script>\n'
    '<script>' + _boot + '</script>\n'
    '<script>window.NX_META=' + json.dumps({k: list(v) for k, v in ROUTES.items()}, ensure_ascii=False) + ';</script>\n'
)

prod = (
    '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    + head_bits
    + '\n<link rel="icon" href="assets/alya-avatar.svg" type="image/svg+xml">\n'
    + '<meta property="og:title" content="Nexalytix | SaaS, Cloud, FinOps, Segurança e IA">\n'
    + '<meta property="og:description" content="Tecnologia e segurança em um só ecossistema, do diagnóstico à operação contínua.">\n'
    + '<meta property="og:locale" content="pt_BR">\n'
    + SEO_HEAD
    + body.split("<style>",1)[0] + "<style>" + body.split("<style>",1)[1].split("</style>",1)[0] + "</style>\n</head>\n<body>\n"
    + body.split("</style>",1)[1] + "\n</body>\n</html>\n"
)
# Endereços absolutos (as páginas ficam em /academia, /saas/erp etc.)
prod = re.sub(r'(?<=["\'(])assets/', '/assets/', prod)
_keys = set(ROUTES) | {"solucoes"}
prod = re.sub(r'href="#([a-z0-9-]+)"', lambda m: f'href="{route_path(m.group(1))}"' if m.group(1) in _keys else m.group(0), prod)
assert prod.count('<title>') == 1
def page_html(k):
    t, d = ROUTES[k]
    url = SITE + route_path(k)
    h = re.sub(r"<title>.*?</title>", lambda _: f"<title>{t}</title>", prod, count=1, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*">', lambda _: f'<meta name="description" content="{d}">', h, count=1)
    h = h.replace(f'<link rel="canonical" href="{SITE}/">', f'<link rel="canonical" href="{url}">', 1)
    h = h.replace(f'<meta property="og:url" content="{SITE}/">', f'<meta property="og:url" content="{url}">', 1)
    h = re.sub(r'<meta property="og:title" content="[^"]*">', lambda _: f'<meta property="og:title" content="{t}">', h, count=1)
    h = re.sub(r'<meta property="og:description" content="[^"]*">', lambda _: f'<meta property="og:description" content="{d}">', h, count=1)
    return h
prod = page_html("home")
(out / "index.html").write_text(prod)
for _k in ROUTES:
    if _k == "home":
        continue
    _f = out / (route_path(_k).lstrip("/") + ".html")
    _f.parent.mkdir(parents=True, exist_ok=True)
    _f.write_text(page_html(_k))
# Cópia na raiz: GitHub Pages publica a raiz do repositório
(root / "index.html").write_text(prod)
if (root / "assets").exists():
    shutil.copytree(root / "assets", out / "assets", dirs_exist_ok=True)
# ---------- Arquivos para buscadores e agentes de IA ----------
from datetime import date as _date
(out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n")
(out / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + "".join(f'  <url><loc>{SITE}{route_path(k)}</loc><lastmod>{_date.today().isoformat()}</lastmod></url>\n' for k in ROUTES)
    + '</urlset>\n')
(out / "llms.txt").write_text((root / "llms.txt").read_text())
print("dist/index.html", len(html), "bytes")
