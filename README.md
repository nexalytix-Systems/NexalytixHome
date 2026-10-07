# Site Nexalytix: assistente Alya (IA) + integração com o CRM

## Como funciona

```
Visitante ──> Chat "Alya" ──> /api/chat ──> Claude (Anthropic API)
                                  │  quando tem nome + contato, a IA chama registrar_lead
                                  ▼
Formulários do site ─────────> /api/lead ──> Make (webhook) ──> Vetra CRM
                                        └──> ou direto no Vetra CRM (/api/public/leads)
```

- As chaves (Anthropic, CRM, Make) ficam **só no servidor**, como variáveis do Cloudflare Pages. Nada sensível vai para o navegador.
- Todo lead chega ao CRM com: nome, e-mail, WhatsApp, empresa, porte, assunto, mensagem, página de origem, consentimento LGPD e, quando vem do chat, a transcrição da conversa.
- Se a IA estiver fora do ar, o chat vira um formulário curto que também vai para o CRM.
- Anti-spam: campo invisível (honeypot) e bloqueio de chamadas de outros domínios.

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `dist/index.html` | Site pronto para publicar na Cloudflare (gerado pelo `build.py`) |
| `functions/api/chat.js` | Endpoint do assistente (Claude + registro de lead) |
| `functions/api/lead.js` | Endpoint dos formulários |
| `functions/_lib/knowledge.js` | **Base de conhecimento e regras da Alya**: edite aqui preços, serviços e tom |
| `functions/_lib/crm.js` | Envio ao Make ou ao CRM e mapeamento de campos |
| `src/site.html`, `src/nexa.js`, `build.py` | **Fonte do site.** Edite aqui e rode `python3 build.py`: ele gera `index.html` (raiz, usado pelo GitHub Pages), `dist/index.html` (Cloudflare Pages) e `preview.html` |
| `index.html` (raiz) | Gerado pelo `build.py`. Não edite direto: as mudanças se perdem no próximo build |
| `assets/alya-avatar.svg` | Avatar da assistente (também usado como ícone do site) |

Para trocar o nome da assistente: altere `BOT_NAME` em `src/nexa.js`, o nome em `knowledge.js` e os textos do widget em `build.py`.

## Logotipo da Hyland

O site mostra "Hyland" em texto no lugar do logotipo. Coloque o arquivo oficial (do portal de parceiros ou do kit de marca da Hyland) em `assets/logo-hyland.svg` ou `.png` e troque os elementos `<span class="logo-chip logo-text" data-logo="hyland">Hyland</span>` por `<span class="logo-chip"><img src="assets/logo-hyland.svg" alt="Hyland"></span>`.

## Publicar no Cloudflare Pages

O upload arrastando arquivos no painel **não** executa a pasta `functions/`. Use o Wrangler (1 comando):

```bash
npm i -g wrangler
wrangler login
# na pasta do pacote, com dist/ e functions/ lado a lado:
wrangler pages deploy dist --project-name nexalytix
```

Ou conecte o repositório do GitHub ao projeto Pages (diretório de saída: `dist`). As duas formas publicam as funções.

## Variáveis de ambiente (Pages → Settings → Variables and Secrets)

| Variável | Obrigatória | Valor |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Sim, para o chat | Chave da API Anthropic (tipo secret) |
| `ANTHROPIC_MODEL` | Não | Padrão `claude-haiku-4-5-20251001` (rápido e barato) |
| `MAKE_WEBHOOK_URL` | Opção A | URL do webhook do cenário no Make |
| `MAKE_WEBHOOK_TOKEN` | Não | Chave do webhook, se você ativar "API key" no Make (enviada no header `x-make-apikey`) |
| `CRM_LEADS_URL` | Opção B | `https://nexalytixcrm.lovable.app/api/public/leads` |
| `CRM_API_KEY` | Opção B | Chave secreta do endpoint de leads do Vetra CRM |
| `CRM_AUTH_HEADER` | Não | Nome do header da chave no CRM. Padrão `x-api-key`; use `authorization` para `Bearer` |
| `CRM_COMPANY_ID_ACADEMIA` | Não | UUID da empresa "Contraturno Escolar" no Vetra. A lista de espera da Academia vai para ela; sem a variável, vai para a Nexalytix |
| `CRM_COMPANY_ID` | Não | UUID da empresa no Vetra CRM. Padrão: o da Nexalytix (`d706a0c1-648b-4dc8-b96c-4ca02ff8c77f`) |
| `ALLOWED_ORIGINS` | Não | Outros domínios autorizados, separados por vírgula (ex.: `https://www.nexalytix.com.br`) |

Se `MAKE_WEBHOOK_URL` existir, ele tem prioridade. Sem nenhuma das opções, os formulários mostram erro com o e-mail de contato.

## Opção A: cenário no Make (recomendado, permite automações extras)

Sua conta Make ainda não tem cenários. Crie um com 3 módulos:

1. **Webhooks → Custom webhook**: crie o webhook e copie a URL para `MAKE_WEBHOOK_URL`. Envie um lead de teste pelo site para o Make aprender a estrutura.
2. **HTTP → Make a request**: `POST` para `https://nexalytixcrm.lovable.app/api/public/leads`, header com a chave do CRM, corpo JSON mapeando os campos (`nome`, `email`, `whatsapp`, `empresa`, `assunto`, `mensagem`, `transcricao`...).
3. (Opcional) **Router**: se `assunto` = `emergencia`, mande WhatsApp ou e-mail imediato para o time.

Campos que o site envia ao webhook:

```json
{
  "nome": "Ana Souza", "email": "ana@empresa.com.br", "whatsapp": "",
  "empresa": "Empresa X", "porte": "Média empresa", "assunto": "diagnostico",
  "mensagem": "Quer reduzir custo de nuvem", "origem": "chatbot",
  "pagina": "#assessment", "consentimento_lgpd": true,
  "transcricao": "Visitante: ...\nAlya: ...", "criado_em": "2026-09-23T17:00:00.000Z"
}
```

Valores de `assunto`: `diagnostico`, `servico`, `demo`, `cotacao`, `treinamento`, `parceria`, `emergencia`, `outro`.

## Opção B: direto no Vetra CRM

Defina `CRM_LEADS_URL` e `CRM_API_KEY` (a mesma chave cadastrada como `LEADS_API_KEY` no CRM). O mapeamento está em `toVetra()` em `functions/_lib/crm.js` e segue a especificação do endpoint: `company_id`, `nome`, `email`, `whatsapp`, `empresa`, `porte` (micro/pequena/media/startup/grande), `assunto`, `mensagem`, `origem`, `pagina` (URL completa), `consentimento_lgpd`, `transcricao`, `interesse`, `cargo`, `linkedin`, `instagram`, `origem: "Site"` (Origem da captação), `canal` (Detalhe da origem: Formulário de contato, Alya, Academia, Parceiros, Newsletter) e `status: "ldr"`. O Vetra coloca o assunto como primeira linha da Nota. Resposta esperada: `201 { ok: true, id, stage }`.

## Testar depois de publicar

```bash
curl -X POST https://nexalytix.com.br/api/lead -H 'content-type: application/json' \
  -d '{"nome":"Teste","email":"teste@nexalytix.com.br","assunto":"outro","consentimento_lgpd":true}'
# esperado: {"ok":true} e o lead aparecendo no CRM
```

## Dados da empresa (rodapé, Privacidade e Termos)

Edite `empresa.json` (razão social, CNPJ, endereço, telefone, WhatsApp, e-mail de privacidade) e rode `python3 build.py`. O build avisa o que ainda falta preencher. As páginas ficam em `#privacidade` e `#termos`.

## Antes de ir para produção

- Remover/confirmar os pontos pendentes do briefing (números da Home, descrições dos SaaS).
- Revisar a Política de Privacidade para citar o uso de IA no atendimento e o armazenamento dos leads no CRM.
- Definir um limite de gasto na conta Anthropic.

## GitHub Pages x Cloudflare Pages

- **GitHub Pages** (nexalytix-systems.github.io/NexalytixHome) serve só arquivos estáticos: o site e a Alya aparecem, mas a IA e o envio de leads não funcionam, porque as funções `/api/chat` e `/api/lead` não rodam lá. Nesse caso a Alya mostra o formulário curto e avisa que não conseguiu enviar. Use só como prévia.
- **Cloudflare Pages** (nexalytix.com.br) roda as funções da pasta `functions/`: IA e leads funcionam.

## Teste de qualidade (QA)

```bash
python3 build.py
node qa/qa.mjs   # precisa do Playwright (npm i playwright) e de um Chromium; use CHROME=/caminho/do/chrome se necessário
```

Abre todas as páginas (descobertas pelos links) no computador (1360px) e no celular (390px) e verifica: erros de JavaScript, arquivos que não carregam, imagens quebradas, página mais larga que a tela, páginas sem título, links para páginas inexistentes, textos proibidos (BG-Check, AgendaBella, "50 anos", marcadores {{ }}), menu do celular, chat da Alya e os 4 formulários (aviso com campos vazios e envio com campos preenchidos, com o CRM simulado). Gera `qa/out/relatorio.md` e uma captura de cada página em `qa/out/`.

## Radar da semana (automático)

- `radar/fontes.json`: lista de feeds RSS por categoria (tecnologia, negócios e setor financeiro, ativos digitais, segurança, educação). Pode incluir ou remover fontes.
- `radar/atualizar.mjs`: coleta as notícias dos últimos 7 dias, pede à IA (Anthropic) a seleção de 12 a 18 itens com resumo e "por que importa", valida (só notícias reais da lista, com link da fonte) e grava `dist/radar.json`. Se algo falhar, o radar anterior continua no ar.
- `.github/workflows/radar.yml`: roda toda segunda-feira às 6h (Brasília) e publica o `dist/radar.json` no repositório; o Cloudflare Pages atualiza o site sozinho.
- Configuração única no GitHub: secret `ANTHROPIC_API_KEY` e Settings → Actions → General → Workflow permissions = "Read and write permissions".
- Para atualizar todo dia, troque o cron para `"0 9 * * *"`.
- Como o robô publica no repositório, antes de enviar mudanças locais rode `git pull --rebase`.

## Endereços das páginas (SEO)

- Cada seção tem endereço próprio: `/academia`, `/seguranca`, `/saas/erp` etc. O `build.py` gera um arquivo por página em `dist/` (por exemplo `dist/academia.html`) com título, descrição e endereço canônico próprios. A lista fica em `ROUTES`, no `build.py`.
- Links antigos com `#` (como `/#academia`) continuam funcionando: o site troca para `/academia` automaticamente.
- Endereços antigos que mudaram de nome ficam em `dist/_redirects`.
- `dist/sitemap.xml`, `dist/robots.txt` e `dist/llms.txt` são gerados pelo `build.py`.
- Para testar localmente como no Cloudflare Pages: `node qa/servidor-pages.mjs dist 8766` e abrir http://127.0.0.1:8766/academia.
- A prévia (`preview.html`) continua usando endereços com `#`.
- **Pré-renderização:** as páginas de domínios, etapas e SaaS são montadas no navegador. Para que buscadores simples, prévias de link e robôs de IA vejam o conteúdo certo, o build usa `prerender.json`. Sempre que mudar textos dessas páginas, rode: `python3 build.py && node qa/prerender.mjs && python3 build.py`.
