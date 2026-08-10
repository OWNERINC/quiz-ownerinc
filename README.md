# LP Tijolo

Quiz mobile-first que indica Owntime ou Nest por afinidade e, com consentimento,
encaminha o lead a um webhook server-side.

## Requisitos e operacao local

- Node.js 20 ou superior.
- Variaveis de ambiente configuradas conforme `.env.example`.

O servidor le as variaveis do ambiente do processo; `.env.example` e apenas o
contrato e nao e carregado automaticamente. Em PowerShell, por exemplo:

```powershell
$env:PRIVACY_POLICY_URL = "https://ownerinc.com.br/politica-de-privacidade/"
$env:OWNTIME_URL = "https://owntime.com.br/"
$env:NEST_URL = "https://nestgramado.com.br/"
npm run serve
```

Abra `http://localhost:4182`. Para usar outra porta, defina `PORT` antes de
iniciar o servidor.

## Testes

```sh
npm test
npm run verify
```

Os dois comandos executam a suite isolada do projeto; `verify` e a entrada usada
pelo verificador agregado do workspace.

## Ambiente

| Variavel | Obrigatoria | Visibilidade e uso |
| --- | --- | --- |
| `PORT` | Nao | Porta do servidor; padrao `4182`. |
| `PUBLIC_ORIGIN` | Sim em publicacao | Origem HTTPS publica esperada (por exemplo, `https://quiz.ownerinc.com.br`); autoridade para validar `Origin` atras do terminador TLS. |
| `PRIVACY_POLICY_URL` | Sim | Configuracao publica HTTPS, entregue ao navegador por `/api/config`. |
| `OWNTIME_URL` | Sim | Configuracao publica HTTPS, entregue ao navegador por `/api/config`. |
| `NEST_URL` | Sim | Configuracao publica HTTPS, entregue ao navegador por `/api/config`. |
| `NEST_WEBHOOK_URL` | Sim para receber leads Nest | Destino server-side dos leads classificados como Nest; pode ser o mesmo endpoint n8n usado por Owntime; nunca e exposto ao navegador. |
| `NEST_WEBHOOK_TOKEN` | Nao | Token Bearer exclusivo do webhook Nest. |
| `OWNTIME_WEBHOOK_URL` | Sim para receber leads Owntime | Destino server-side dos leads classificados como Owntime; pode ser o mesmo endpoint n8n usado por Nest; nunca e exposto ao navegador. |
| `OWNTIME_WEBHOOK_TOKEN` | Nao | Token Bearer exclusivo do webhook Owntime. |

Nao versione `.env` nem valores reais de webhook. As tres URLs publicas precisam
usar HTTPS; configuracao ausente ou invalida impede a inicializacao.

Em desenvolvimento sem `PUBLIC_ORIGIN`, a validacao de origem aceita apenas a
origem HTTP/HTTPS local efetivamente atendida (`localhost`, `127.0.0.1` ou
`::1`). Em publicacao, configure `PUBLIC_ORIGIN` com a origem HTTPS externa. O
servidor nao confia em `Forwarded`, `X-Forwarded-Host` ou `X-Forwarded-Proto`.

## Contrato do webhook

`POST /api/leads` valida e normaliza a entrada, recalcula o resultado a partir
das cinco respostas e envia `POST` para `NEST_WEBHOOK_URL` ou
`OWNTIME_WEBHOOK_URL`. Para um webhook n8n único, configure as duas variáveis
com a mesma URL. O token correspondente, quando configurado, segue no header
`Authorization`.
`X-Idempotency-Key` recebe o mesmo UUID de `submissionId`.

Payload normalizado:

```json
{
  "submissionId": "UUID gerado pelo servidor",
  "source": "lp-tijolo",
  "submittedAt": "data ISO 8601 gerada pelo servidor",
  "name": "Nome sem espacos excedentes",
  "whatsapp": "+5551999999999",
  "email": "email@example.com",
  "answers": ["owntime", "nest", "owntime", "nest", "owntime"],
  "profile": {
    "companhia": "familia",
    "momento": "memorias-em-familia",
    "viagem": "conforto-familiar"
  },
  "result": "owntime",
  "scores": { "owntime": 3, "nest": 2 },
  "utm": {
    "source": "instagram",
    "medium": "social",
    "campaign": "campanha",
    "content": "criativo",
    "term": "termo"
  },
  "consent": {
    "contact": true,
    "acceptedAt": "mesma data ISO 8601 de submittedAt"
  }
}
```

`utm` contem somente valores string presentes entre `source`, `medium`,
`campaign`, `content` e `term`; chaves ausentes sao omitidas. O servidor aceita
cinco respostas `owntime` ou `nest` para a afinidade e valida separadamente as
tres respostas de perfil. O telefone brasileiro e normalizado para `+55`, e o
servidor nao confia em `result` enviado pelo navegador.

O lead so e confirmado ao navegador com HTTP `201` depois que o webhook do
resultado correspondente responde com sucesso. Sem a URL correspondente, a API
responde `503`. Timeout de 10 segundos, erro de rede ou resposta nao bem-sucedida
do webhook retornam `502`; nao ha fila, persistencia local nem confirmacao falsa,
e o usuario recebe orientacao para tentar novamente.

No n8n, o corpo chega como JSON no nivel raiz, sem um wrapper `data`. Os campos
principais para o fluxo sao `submissionId`, `source`, `submittedAt`, `name`,
`whatsapp`, `email`, `answers`, `profile`, `result`, `scores`, `utm` e
`consent`. Use `result` para separar Owntime e Nest e `submissionId` como chave
de idempotencia; o header `X-Idempotency-Key` repete esse mesmo valor.

## Gate de publicacao

O endpoint de leads precisa de rate limiting na borda (CDN, WAF, gateway ou
reverse proxy) antes de qualquer publicacao. Como a topologia de producao ainda
nao foi definida, este preview deliberadamente nao usa limite em memoria no
processo Node: esse limite seria inconsistente entre replicas e identificaria o
proxy compartilhado em vez do visitante. A publicacao fica bloqueada ate a
regra de borda ser configurada e validada.

## Assets pendentes para publicacao

Esta versao de preview usa placeholders locais claramente identificados para as
cenas de resultado. Ela nao esta pronta para deploy de producao. Antes da
publicacao, ainda e necessario:

- Configurar e validar o webhook de producao e seu token, se exigido.
- Confirmar a URL vigente da politica de privacidade.
- Documentar e validar o processo de deploy.
- Fornecer os quatro assets oficiais aprovados nos caminhos exatos:
  `public/assets/results/owntime-hero.webp`,
  `public/assets/results/owntime-logo-white.png`,
  `public/assets/results/nest-hero.webp` e
  `public/assets/results/nest-logo-white.png`.

- Heros: no minimo `2400x1500`, paisagem e alta resolucao, com arquitetura ou
  natureza nos dois tercos da direita e o ponto focal dentro do recorte central
  seguro para celular.
- Logos: PNG transparente branco, com pelo menos `1600px` de largura.
- Ao receber os heros, substituir em `public/styles.css` as duas URLs dos SVGs
  `*-hero-placeholder.svg` pelos respectivos arquivos `*-hero.webp`. Os logos ja
  sao referenciados nos caminhos finais e mantem fallback textual enquanto
  estiverem ausentes.
