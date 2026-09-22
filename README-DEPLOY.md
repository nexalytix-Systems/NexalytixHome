# Nexalytix — piloto multi-página (staging)

Este pacote é um piloto: Home + 3 páginas reais (Serviços, SaaS, Infraestrutura e Cibersegurança), com URLs próprias em vez do antigo `#/rota`. As páginas ainda não migradas continuam funcionando através de `app-completo.html` (o site atual completo), então nenhum link quebra.

## Como subir no GitHub Pages

1. No repositório no GitHub, clique em **Add file → Upload files**.
2. Arraste todo o conteúdo desta pasta (não a pasta em si — os arquivos e subpastas `assets/`, `css/`, `js/` direto na raiz do repo, ou de um branch/pasta dedicado a isso).
3. Em **Settings → Pages**, selecione a branch e a pasta (`/root` ou `/docs`, dependendo de onde você subiu os arquivos) e salve.
4. O GitHub vai te dar uma URL tipo `https://seu-usuario.github.io/nome-do-repo/` — é nela que o site vai abrir.

## Importante: isso é staging, não produção

Como ainda é só para revisão, as páginas saem com:
- `<meta name="robots" content="noindex, nofollow">` — pede para buscadores não indexarem essa cópia
- Sem tag de URL canônica fixa

Isso evita que o Google confunda essa URL temporária do GitHub Pages com o site de verdade. Quando for para o ar em **nexalytix.com.br**, me avisa que eu tiro esse bloqueio e coloco as URLs canônicas certas antes do deploy final.

## Estrutura

```
index.html                               → Home
servicos.html                            → Serviços
produtos.html                            → SaaS Nexalytix Ecosystem
infraestrutura-e-ciberseguranca.html     → Infraestrutura e Cibersegurança
app-completo.html                        → site atual completo (fallback das páginas ainda não migradas)
assets/                                  → logo, mascote, logos de parceiros
css/site.css                             → estilos compartilhados
js/site.js                               → menu, FAQ, formulário de contato, "Encontre sua solução"
```
