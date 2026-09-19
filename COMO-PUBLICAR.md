# Como publicar o site (homologação grátis no GitHub, depois produção)

O arquivo `index.html` nesta pasta é o site completo — já com o formulário de Contato conectado ao seu CRM via Make.com. Ele é 100% estático (HTML puro, sem build, sem dependências locais) e usa navegação por hash (`#/servicos`, `#/produtos`, etc.), então funciona igual em qualquer host, seja na raiz de um domínio ou dentro de uma subpasta.

## Homologação grátis: GitHub Pages

1. Crie um repositório novo no GitHub (ex.: `nexalytix-site`). Pode ser público — o GitHub Pages gratuito exige repositório público em contas pessoais free (se preferir privado, precisa de um plano GitHub pago).
2. Suba o `index.html` direto na raiz do repositório (pela interface web do GitHub — **Add file → Upload files** — ou via `git push`, do jeito que preferir).
3. No repositório, vá em **Settings → Pages**.
4. Em **Build and deployment → Source**, selecione **Deploy from a branch**.
5. Em **Branch**, escolha `main` (ou a branch onde está o `index.html`) e a pasta `/ (root)`. Clique em **Save**.
6. Aguarde 1–2 minutos. O GitHub mostra a URL gerada, algo como `https://seu-usuario.github.io/nexalytix-site/`.
7. Abra essa URL e navegue pelas páginas pra conferir que tudo carrega certo.

Pra atualizar depois: é só subir um `index.html` novo no mesmo lugar (substituindo o arquivo) — o GitHub Pages republica sozinho em menos de um minuto.

## Teste do formulário de Contato nessa URL de homologação

O formulário vai funcionar normalmente nessa URL do GitHub Pages (diferente do link do artifact aqui do Claude, que roda num domínio isolado e não passa pelo CORS do Make/CRM). Pode preencher de verdade e conferir se o lead chega no CRM.

## Quando for para produção (nexalytix.com.br)

Quando decidir substituir o conteúdo do domínio, o caminho mais direto é o Cloudflare Pages, já que o domínio está no seu Cloudflare:

1. Painel do Cloudflare → **Workers & Pages** → **Create application** → aba **Pages** → **Upload assets**.
2. Nome do projeto (ex.: `nexalytix-site`) e suba o mesmo `index.html`.
3. **Deploy site** — o Cloudflare gera uma URL temporária (`nexalytix-site.pages.dev`) pra você validar antes de trocar o domínio.
4. Depois de validar: **Custom domains** → **Set up a custom domain** → `nexalytix.com.br` (e `www.` se quiser). Como o domínio já está nesse mesmo Cloudflare, o DNS ajusta sozinho.

Ou, se preferir manter tudo no GitHub: no Cloudflare Pages, em vez de "Upload assets", use **Connect to Git** apontando pro mesmo repositório, com build estático (sem comando de build, diretório de saída `/`) — cada `git push` publica automaticamente.

## O que ainda falta antes de ligar tráfego pago

- **Pixel do Meta e tag do Google Ads** instalados no `<head>` do site, para rastrear conversão.
- Formulário de contato: ✅ já resolvido — conectado ao CRM via Make.com.
- Página de privacidade/LGPD: ✅ já existe no site (`/politica-de-privacidade`, `/cookies`, `/termos-de-uso`).

Me avisa quando quiser seguir com o pixel e a tag de conversão.
