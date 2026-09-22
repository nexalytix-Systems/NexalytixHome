# Nexalytix — site multi-página (staging)

18 páginas reais (URLs próprias, sem `#/rota`), cobrindo todo o menu principal e o rodapé. As páginas fora do menu principal (subpáginas de Serviços, Consultoria, legal etc.) continuam funcionando através de `app-completo.html` — o site atual completo —, então nenhum link quebra.

## Páginas incluídas nesta leva

- `index.html` — Home
- `servicos.html` — Serviços
- `produtos.html` — SaaS Nexalytix Ecosystem
- `infraestrutura-e-ciberseguranca.html` — Infraestrutura e Cibersegurança
- `parceiros.html` — Produtos e Parceiros (Acronis · ManageEngine · Omid Cloud)
- `business-studios.html` — Business Studios
- `academy-e-digital.html` — Academy e Digital
- `inovacao-e-transformacao.html` — Inovação e Novos Negócios
- `ecossistema.html` — Visão geral do Ecossistema
- `sobre.html` — Nexalytix Systems (Quem somos)
- `grupo-vieira-prime.html` — Grupo Vieira Prime
- `cases.html`, `insights.html`, `radar.html` — Conteúdos
- `programa-de-formacao.html`, `nexafriends.html`, `compartilhe-seu-portfolio.html` — Pessoas & Contatos
- `contato.html` — Contato (formulário conectado ao CRM via Make.com, igual ao site atual)

## Como subir no GitHub Pages

1. No repositório no GitHub, clique em **Add file → Upload files**.
2. Arraste todo o conteúdo desta pasta (os arquivos e as subpastas `assets/`, `css/`, `js/` direto na raiz do repo, ou na pasta que você escolher para o Pages).
3. Em **Settings → Pages**, selecione a branch e a pasta e salve.
4. O GitHub te dá uma URL tipo `https://seu-usuario.github.io/nome-do-repo/`.

## Importante: isso é staging, não produção

Como ainda é para revisão, as páginas saem com:
- `<meta name="robots" content="noindex, nofollow">`
- Sem tag de URL canônica fixa

Isso evita que o Google confunda essa URL temporária com o site de verdade. Quando for para o ar em **nexalytix.com.br**, me avisa que eu tiro esse bloqueio e coloco as URLs canônicas certas antes do deploy final.

## Estrutura

```
index.html, servicos.html, produtos.html, ...    → as 18 páginas reais
app-completo.html                                 → site atual completo (fallback das páginas ainda não migradas: Consultoria, Transformação Digital, IA, Sistemas, Automação, Dados, Cloud, Portfólio, páginas legais etc.)
assets/                                           → logo, mascote, logos de parceiros
css/site.css                                      → estilos compartilhados
js/site.js                                        → menu, FAQ, formulário de contato, "Encontre sua solução"
```

## Próxima fase (ainda não incluída)

As subpáginas mais profundas, hoje só no `app-completo.html`: Transformação Digital, Inteligência Artificial, Sistemas (+ ERP), Automação, Dados, Cloud, Consultoria (+ Diagnóstico Digital), Portfólio, e as páginas legais (Política de Privacidade, Cookies, Termos de Uso). Depois disso, o site inteiro está migrado e o `app-completo.html` deixa de ser necessário.
