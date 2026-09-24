#!/usr/bin/env python3
"""Gera dist/index.html a partir de index.html + src/nexa.js + functions/_lib/knowledge.js.
Uso: python3 build.py
"""
import json, re, pathlib, shutil

root = pathlib.Path(__file__).parent
html = (root / "index.html").read_text()
nexa = (root / "src/nexa.js").read_text()
kjs = (root / "functions/_lib/knowledge.js").read_text()

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
html = html.replace(
    '<div class="field"><label for="c-msg">',
    '<div class="field"><label for="c-whats">WhatsApp com DDD (opcional)</label><input id="c-whats" name="whatsapp" type="tel" autocomplete="tel" placeholder="(11) 90000-0000"></div>\n        <div class="field"><label for="c-msg">')

# 4) atalho para o chat no contato + botão de leads no rodapé
html = html.replace(
    '<div class="card"><h3>Sede operacional</h3>',
    '<div class="card"><h3>Prefere conversar agora?</h3><p class="muted small">A Alya, nossa assistente com IA, tira dúvidas e passa seu contato para o time.</p><button type="button" class="btn btn-ghost" data-nexa style="justify-self:start">Falar com a Alya</button></div>\n      <div class="card"><h3>Sede operacional</h3>')
html = html.replace(
    '<span>contato@nexalytix.com.br · São Paulo, SP</span></div>',
    '<span>contato@nexalytix.com.br · São Paulo, SP <button type="button" id="ownerLeads" hidden>Leads da prévia</button></span></div>')

# 5) widget + script
widget = """
<button type="button" id="nexaOpen" aria-expanded="false" aria-controls="nexa"><img class="av" src="assets/alya-avatar.svg" alt="" width="36" height="36"><span class="lbl">Fale com a Alya</span></button>
<section id="nexa" hidden role="dialog" aria-label="Chat com a Alya, assistente da Nexalytix">
  <div class="nexa-head"><img class="av" src="assets/alya-avatar.svg" alt="" width="38" height="38"><div><b>Alya</b><span>Assistente com IA da Nexalytix · online</span></div><button type="button" id="nexaClose" aria-label="Fechar chat">✕</button></div>
  <div id="nexaLog" aria-live="polite"></div>
  <form id="nexaForm"><input id="nexaInput" autocomplete="off" placeholder="Escreva sua pergunta" aria-label="Mensagem para a Alya" maxlength="1500"><button class="btn btn-primary" id="nexaSend" type="submit">Enviar</button><button class="btn btn-ghost" id="nexaStop" type="button" hidden>Parar</button></form>
  <p class="nexa-foot">Respostas geradas por IA podem conter erros; o time Nexalytix confirma propostas e prazos.</p>
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
prod = (
    '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    + head_bits
    + '\n<link rel="icon" href="assets/alya-avatar.svg" type="image/svg+xml">\n'
    + '<meta property="og:title" content="Nexalytix | SaaS, Cloud, FinOps, Segurança e IA">\n'
    + '<meta property="og:description" content="Tecnologia e segurança em um só ecossistema, do diagnóstico à operação contínua.">\n'
    + '<meta property="og:locale" content="pt_BR">\n'
    + body.split("<style>",1)[0] + "<style>" + body.split("<style>",1)[1].split("</style>",1)[0] + "</style>\n</head>\n<body>\n"
    + body.split("</style>",1)[1] + "\n</body>\n</html>\n"
)
(out / "index.html").write_text(prod)
if (root / "assets").exists():
    shutil.copytree(root / "assets", out / "assets", dirs_exist_ok=True)
print("dist/index.html", len(html), "bytes")
