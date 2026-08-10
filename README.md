# Ownerinc Quiz

Quiz mobile-first que indica Own Time ou Nest por afinidade e prepara uma
submissao versionada para um ingress server-side capture-only.

O envio externo fica desligado por padrao. O navegador chama somente
`POST /api/leads` na mesma origem; o endereco do webhook nunca e exposto no
frontend.

## Requisitos e operacao local

- Node.js 20 ou superior.
- Variaveis de ambiente conforme `.env.example`.

O servidor le o ambiente do processo; `.env.example` nao e carregado
automaticamente. Exemplo PowerShell apenas com configuracao publica:

```powershell
$env:PRIVACY_POLICY_URL = "https://ownerinc.com.br/politica-de-privacidade/"
$env:OWNTIME_URL = "https://owntime.com.br/"
$env:NEST_URL = "https://nestgramado.com.br/"
$env:OWNERINC_QUIZ_WEBHOOK_ENABLED = "false"
npm run serve
```

Abra `http://localhost:4182`. Para usar outra porta, defina `PORT`.

## Testes e build

```sh
npm test
npm run build
npm run verify
```

`build` valida sintaxe, JSON Schema e executa a suite. O projeto nao possui
bundler; a imagem Docker e o artefato de empacotamento para a VPS.

## Ambiente

| Variavel | Obrigatoria | Uso |
| --- | --- | --- |
| `PORT` | Nao | Porta do servidor; padrao `4182`. |
| `PUBLIC_ORIGIN` | Sim em publicacao | Origem HTTPS esperada para validar `Origin`. |
| `PRIVACY_POLICY_URL` | Sim | URL publica entregue por `/api/config`. |
| `OWNTIME_URL` | Sim | URL publica entregue por `/api/config`. |
| `NEST_URL` | Sim | URL publica entregue por `/api/config`. |
| `OWNERINC_QUIZ_WEBHOOK_ENABLED` | Sim | Precisa ser literalmente `true`; default seguro e OFF. |
| `OWNERINC_QUIZ_WEBHOOK_URL` | Somente com flag ON | Destino privado unico, lido apenas no servidor. |
| `OWNERINC_QUIZ_CONSENT_TEXT_VERSION` | Somente com flag ON | Versao verificavel do texto aceito. |
| `OWNERINC_QUIZ_POLICY_REFERENCE` | Somente com flag ON | Referencia versionada da politica. |
| `OWNERINC_QUIZ_ENVIRONMENT` | Nao | Metadata tecnica; padrao `production`. |

O runtime Docker tambem aceita as variantes prefixadas
`OWNERINC_QUIZ_PRIVACY_POLICY_URL`, `OWNERINC_QUIZ_OWNTIME_URL` e
`OWNERINC_QUIZ_NEST_URL`. Nunca versione `.env`, endpoint real ou segredo.

Em desenvolvimento sem `PUBLIC_ORIGIN`, o servidor Node aceita somente a
origem local efetivamente atendida. Em publicacao, configure a origem HTTPS
externa. O handler compartilhado tambem exige essa origem quando
`PUBLIC_ORIGIN` estiver definido.

## Contrato de submissao

O JSON Schema esta em
`contracts/ownerinc.quiz.submission.v1.schema.json`.

Identificadores fixos:

- `schema_version`: `ownerinc.quiz.submission.v1`;
- `quiz_version`: `ownerinc.quiz.affinity.v1`;
- `flow_id`: `ownerinc.quiz.lead_capture.v1`;
- `form_id`: `ownerinc.quiz.contact_form.v1`.

O cliente cria um UUID v4 por tentativa, registra `occurred_at`, normaliza o
contato e envia respostas por chaves estaveis. O servidor valida o objeto
exato, recalcula o resultado e deriva:

- `OWN_TIME_HOME_CLUB_GRAMADO` para `owntime`;
- `NEST_MOUNTAIN_LODGE` para `nest`.

O envelope inclui empreendimento, source/campaign, contato, answers keyed,
resultado, consentimento, idempotencia e metadata server-side. Nao inclui
prompts, labels, IP ou user-agent.

Consentimento falso ou configuracao sem versao do texto/politica falham
fechado. A chave `Idempotency-Key` repete `submission_id`, mas deduplicacao
duravel precisa existir e ser validada no receptor; o cliente nao assume
exactly-once.

## Feature flag e resposta

- Flag diferente de `true`: `503 QUIZ_WEBHOOK_DISABLED` e zero fetch externo.
- Flag ON com configuracao incompleta: `503` e zero fetch externo.
- Entrada invalida: `4xx` com codigo estavel, sem detalhes sensiveis.
- Ingress precisa responder exatamente `202`; outro status ou erro vira `502`.
- Sucesso ao navegador: HTTP `202 ACCEPTED_CAPTURE_ONLY`.

Nao ha fila nem persistencia de PII na aplicacao. O endpoint real e qualquer
segredo ficam somente no armazenamento de runtime aprovado. Dedupe duravel deve
ser aplicado no ingress por `submission_id`; o header e o campo de idempotencia
sao sempre propagados pelo backend.

## Deploy isolado

`deploy/` contem Dockerfile, compose sem `ports`, healthcheck e exemplos sem
segredo. `deploy/vps/` contem o updater pull-based com branch explicita, lock,
build/test sem rede, candidato, healthcheck, promocao e rollback.

O updater nao altera DNS, Nginx Proxy Manager, Cloudflare ou dominio. Um commit
so pode ser promovido se ja contiver todos os artifacts integrados e passar os
gates. Em estado publico, flag ON exige simultaneamente configuracao completa e
o marcador local `CAPTURE_ONLY_PUBLIC_ENABLED_V1`; sem ambos, o deploy falha
fechado e preserva a release atual.

## Checklist de promocao publica

- consentimento literal e referencia da politica versionados no runtime;
- deduplicacao duravel por `submission_id` comprovada no ingress;
- rate limiting do backend configurado para o unico hop confiavel do NPM;
- logos oficiais presentes nos paths referenciados;
- backup de runtime/NPM e rollback do placeholder preservados;
- feature flag ON restrita ao ingress CAPTURE_ONLY.

Os SVGs de hero atuais sao parte do conceito editorial entregue. Os logos PNG
oficiais de Owntime e Nest sao empacotados localmente, com fallback textual se
um asset falhar. Nenhum downstream CRM, mensageria ou e-mail faz parte deste
contrato.
