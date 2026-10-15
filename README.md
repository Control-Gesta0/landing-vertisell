# Landing page Vertisell

Site estático (HTML, CSS e JS puros, sem build). Para publicar, envie a pasta inteira
para qualquer hospedagem estática (Vercel, Netlify, Hostinger, cPanel etc.) com
`index.html` na raiz.

## Antes de publicar

1. **Número do WhatsApp**: em `assets/js/main.js`, preencha `CONFIG.whatsapp` só com
   dígitos, com DDI e DDD (ex.: `'5511912345678'`). Sem número, os botões levam ao
   formulário do fim da página.
2. **Desconto de 37%**: os preços "de" (R$ 312,70 / 630,16 / 947,62 / 1.582,54) estão
   em `index.html`, na seção `#planos`. Pelo Código de Defesa do Consumidor, o preço
   riscado precisa ser um valor que vocês praticam de fato.
3. **Domínio**: em `index.html`, troque `og:image` (`assets/img/og-vertisell.jpg`, a
   imagem que aparece quando o link é compartilhado no WhatsApp) pela URL absoluta do seu
   domínio, por exemplo `https://seudominio.com.br/assets/img/og-vertisell.jpg`.

## Onde editar

| O quê | Arquivo |
|---|---|
| Textos e seções | `index.html` |
| Números com fonte (seção de pesquisas, follow-up, fontes do ROI) | `assets/js/data.js` |
| Premissas da calculadora de ROI | `assets/js/roi.js` (`ROI_MODEL`) |
| Frases do título rotativo e roteiro do celular do topo | `assets/js/main.js` (`PAIRS`, `HERO_CHAT`) |
| Demonstração animada do CRM | `assets/js/demo.js` e `assets/css/demo.css` |
| Cores, fontes e espaçamentos | `assets/css/base.css` (tokens no `:root`) |

## Testar localmente

```bash
python -m http.server 5173
```

Depois abra `http://localhost:5173`. Screenshots automáticos (Chrome headless):
`node tools/shot.mjs --url index.html --out dev/shots/home.png`.

Todos os dados de clientes nas animações são fictícios. As avaliações são as do Google
enviadas pelo cliente. Os selos G2 e Capterra são da tecnologia que roda a plataforma.
