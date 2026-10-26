# Página do e-book "O abismo da IA nas empresas"

Arquivos novos (não substituem nada do site):

- dist/materiais/abismo-da-ia.html → página em nexalytix.com.br/materiais/abismo-da-ia
- dist/materiais/abismo-da-ia-capa.jpg e abismo-da-ia-og.jpg → capa e imagem de compartilhamento
- dist/materiais/arquivos/o-abismo-da-ia-nexalytix-k7q4.pdf → o e-book
- functions/api/material.js → recebe o formulário, registra no Vetra, envia o e-mail com o link e avisa contato@

Variáveis no Cloudflare (projeto nexalytix-producao):

- RESEND_API_KEY (Secret): chave do Resend. Sem ela, a página entrega o botão de download na tela.
- MATERIAL_EMAIL_FROM (Text, opcional): remetente do e-mail, num domínio verificado no Resend.
  Padrão: "Nexalytix <materiais@nexalytix.com.br>".

Para um e-book novo: copie a página, troque textos e imagens, coloque o PDF em dist/materiais/arquivos/
e acrescente o material na lista MATERIAIS do functions/api/material.js.
