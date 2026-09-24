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
| `dist/index.html` | Site pronto para publicar (gerado pelo `build.py`) |
| `functions/api/chat.js` | Endpoint do assistente (Claude + registro de lead) |
| `functions/api/lead.js` | Endpoint dos formulários |
| `functions/_lib/knowledge.js` | **Base de conhecimento e regras da Alya**: edite aqui preços, serviços e tom |
| `functions/_lib/crm.js` | Envio ao Make ou ao CRM e mapeamento de campos |
| `src/nexa.js`, `index.html`, `build.py` | Fonte do site; rode `python3 build.py` após editar (gera `dist/index.html` para produção e `preview.html` para a prévia) |
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

Defina `CRM_LEADS_URL` e `CRM_API_KEY`. O mapeamento está em `functions/_lib/crm.js` e envia `name`, `email`, `phone`, `company`, `source`, `notes`, `consent_lgpd`. **Confira os nomes de campo e o header de autenticação do endpoint do Vetra** e ajuste nesse arquivo se forem diferentes.

## Testar depois de publicar

```bash
curl -X POST https://nexalytix.com.br/api/lead -H 'content-type: application/json' \
  -d '{"nome":"Teste","email":"teste@nexalytix.com.br","assunto":"outro","consentimento_lgpd":true}'
# esperado: {"ok":true} e o lead aparecendo no CRM
```

## Antes de ir para produção

- Remover/confirmar os pontos pendentes do briefing (números da Home, descrições dos SaaS).
- Revisar a Política de Privacidade para citar o uso de IA no atendimento e o armazenamento dos leads no CRM.
- Definir um limite de gasto na conta Anthropic.
