# Quiz Owntime e Nest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um quiz mobile-first de cinco perguntas que recomenda somente Owntime ou Nest e encaminha leads consentidos por webhook.

**Architecture:** HTML, CSS e JavaScript nativos rodam no navegador; `public/quiz.js` concentra perguntas e classificacao pura. Um servidor Node.js 20 serve os arquivos, publica apenas configuracao nao sensivel e recalcula o resultado antes de encaminhar o lead.

**Tech Stack:** Node.js 20, ES modules, `node:http`, `node:test`, HTML semantico, CSS mobile-first e JavaScript nativo.

## Global Constraints

- Manter toda a mudanca em `projects/lp_tijolo`.
- Nao adicionar dependencias externas.
- Toda resposta A vale Owntime e toda resposta B vale Nest.
- Cinco respostas sao obrigatorias; maioria simples sempre produz um unico resultado.
- Resultado aparece antes do formulario.
- Formulario exige nome, WhatsApp, e-mail e consentimento.
- Nenhum lead e confirmado sem resposta `2xx` do webhook.
- O servidor recalcula o resultado e nunca confia no valor enviado pelo navegador.
- Nenhum dado pessoal ou resposta segue para analytics.
- CSS parte de celular e amplia a composicao progressivamente.
- Alvos interativos possuem no minimo `48px` por `48px`.
- Movimento respeita `prefers-reduced-motion` e nunca controla a visibilidade final.
- Usar apenas os textos e claims aprovados na especificacao.
- Nao usar fotos ou logos de produto obtidos da web sem aprovacao.
- Nao criar commits durante a execucao, salvo pedido explicito do usuario; revisar o diff ao fim de cada tarefa.

## Asset Contract

Copiar agora os assets corporativos existentes para evitar importacao entre produtos:

- `global assets/Logos/OWNERINC_COMPLETA_white.png` -> `public/assets/brand/ownerinc-logo-white.png`
- `global assets/Icones/OWNEIRNC_ICONE_WHITE.png` -> `public/assets/brand/ownerinc-icon-white.png`
- `global assets/fonts/Novelin-Regular.otf` -> `public/assets/fonts/novelin-regular.otf`
- `global assets/fonts/Novelin-Bold.otf` -> `public/assets/fonts/novelin-bold.otf`
- `global assets/fonts/Signaturia-Regular.ttf` -> `public/assets/fonts/signaturia-regular.ttf`

O responsavel pela marca fornecera estes quatro arquivos aprovados antes da
Task 4:

- `public/assets/results/owntime-logo-white.png`
- `public/assets/results/owntime-hero.webp`
- `public/assets/results/nest-logo-white.png`
- `public/assets/results/nest-hero.webp`

Tasks 1 a 3 podem ser executadas sem esses quatro arquivos. Task 4 nao pode ser
marcada como concluida enquanto eles nao existirem.

---

### Task 1: Dominio do quiz e harness executavel

**Files:**
- Create: `package.json`
- Modify: `.env.example`
- Create: `public/quiz.js`
- Create: `tests/quiz.test.mjs`

**Interfaces:**
- Produces: `QUESTIONS: readonly { id: string, prompt: string, options: readonly [{ value: "owntime", label: string }, { value: "nest", label: string }] }[]`
- Produces: `classifyAnswers(answers: string[]): { result: "owntime" | "nest", scores: { owntime: number, nest: number } }`
- Throws: `TypeError("Respostas invalidas.")` para qualquer entrada diferente de cinco valores `owntime|nest`.

- [ ] **Step 1: Criar o harness Node sem dependencias**

```json
{
  "name": "lp-tijolo",
  "private": true,
  "type": "module",
  "scripts": {
    "serve": "node server.mjs",
    "test": "node --test tests/*.test.mjs",
    "verify": "npm test"
  }
}
```

Atualizar `.env.example`:

```dotenv
PORT=4182
LEAD_WEBHOOK_URL=
LEAD_WEBHOOK_TOKEN=
PRIVACY_POLICY_URL=https://ownerinc.com.br/politica-de-privacidade/
OWNTIME_URL=https://owntime.com.br/
NEST_URL=https://nestgramado.com.br/
```

- [ ] **Step 2: Escrever os testes que falham para perguntas e maioria simples**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS, classifyAnswers } from "../public/quiz.js";

test("publishes exactly five binary questions", () => {
  assert.equal(QUESTIONS.length, 5);
  for (const question of QUESTIONS) {
    assert.deepEqual(question.options.map(({ value }) => value), ["owntime", "nest"]);
  }
});

test("returns the simple majority for every possible score", () => {
  assert.equal(classifyAnswers(["owntime", "owntime", "owntime", "nest", "nest"]).result, "owntime");
  assert.equal(classifyAnswers(["nest", "nest", "nest", "owntime", "owntime"]).result, "nest");
  assert.equal(classifyAnswers(Array(5).fill("owntime")).result, "owntime");
  assert.equal(classifyAnswers(Array(5).fill("nest")).result, "nest");
});

test("rejects incomplete or unknown answers", () => {
  assert.throws(() => classifyAnswers(["owntime"]), /Respostas invalidas/);
  assert.throws(() => classifyAnswers(["owntime", "nest", "other", "nest", "owntime"]), /Respostas invalidas/);
});
```

- [ ] **Step 3: Executar o teste para confirmar a falha**

Run: `npm test`

Expected: FAIL porque `public/quiz.js` ainda nao existe.

- [ ] **Step 4: Implementar perguntas e classificacao minima**

Usar exatamente os cinco textos da secao `Perguntas` da especificacao. A funcao
de classificacao deve seguir esta forma:

```js
export function classifyAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length ||
      answers.some((answer) => answer !== "owntime" && answer !== "nest")) {
    throw new TypeError("Respostas invalidas.");
  }

  const owntime = answers.filter((answer) => answer === "owntime").length;
  const nest = answers.length - owntime;
  return { result: owntime > nest ? "owntime" : "nest", scores: { owntime, nest } };
}
```

- [ ] **Step 5: Confirmar o dominio e revisar o diff**

Run: `npm test`

Expected: 3 tests PASS.

Run: `git diff --check -- projects/lp_tijolo`

Expected: sem saida.

---

### Task 2: Servidor, configuracao publica e webhook

**Files:**
- Create: `server.mjs`
- Create: `tests/server.test.mjs`

**Interfaces:**
- Consumes: `classifyAnswers(answers)` de `public/quiz.js`.
- Produces: `validateLead(input): { value: ValidLead } | { error: string }`.
- Produces: `createServer(options?): http.Server`.
- Endpoint: `GET /api/config` retorna `{ privacyPolicyUrl, owntimeUrl, nestUrl }`.
- Endpoint: `POST /api/leads` retorna `201 { ok: true }` somente apos webhook `2xx`.

- [ ] **Step 1: Escrever testes de validacao e recalculo**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { validateLead } from "../server.mjs";

const validInput = {
  name: "Maria da Silva",
  whatsapp: "(51) 99999-9999",
  email: "maria@example.com",
  consent: true,
  answers: ["owntime", "owntime", "owntime", "nest", "nest"],
  result: "nest",
  utm: { source: "instagram", ignored: "drop" }
};

test("normalizes a valid lead and recalculates its result", () => {
  const { value } = validateLead(validInput);
  assert.equal(value.whatsapp, "+5551999999999");
  assert.equal(value.email, "maria@example.com");
  assert.equal(value.result, "owntime");
  assert.deepEqual(value.utm, { source: "instagram" });
});

test("rejects invalid identity, consent and answers", () => {
  assert.match(validateLead({ ...validInput, email: "invalid" }).error, /e-mail/i);
  assert.match(validateLead({ ...validInput, consent: false }).error, /contato/i);
  assert.match(validateLead({ ...validInput, answers: ["owntime"] }).error, /respostas/i);
});
```

- [ ] **Step 2: Escrever testes HTTP antes da implementacao**

Criar este helper local no teste para iniciar `createServer(options)` em porta
efemera:

```js
async function withServer(options, callback) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function postLead(baseUrl, body) {
  return fetch(`${baseUrl}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify(body)
  });
}
```

Cobrir estes casos com assertions exatas:

```js
test("exposes only public configuration", async () => {
  await withServer(publicOptions, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/config`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      privacyPolicyUrl: "https://ownerinc.com.br/politica-de-privacidade/",
      owntimeUrl: "https://owntime.com.br/",
      nestUrl: "https://nestgramado.com.br/"
    });
  });
});

test("forwards the recalculated lead and optional bearer token", async () => {
  let forwarded;
  const fetchImplementation = async (_url, options) => {
    forwarded = { headers: options.headers, body: JSON.parse(options.body) };
    return { ok: true };
  };
  await withServer({ ...publicOptions, webhookUrl: "https://example.com/lead", webhookToken: "secret", fetchImplementation }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 201);
  });
  assert.equal(forwarded.headers.Authorization, "Bearer secret");
  assert.equal(forwarded.body.result, "owntime");
  assert.equal(forwarded.body.source, "lp-tijolo");
  assert.equal(forwarded.body.consent.contact, true);
});

test("does not confirm a lead without a successful webhook", async () => {
  await withServer(publicOptions, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 503);
  });
  await withServer({ ...publicOptions, webhookUrl: "https://example.com/lead", fetchImplementation: async () => ({ ok: false }) }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 502);
  });
});
```

Definir no teste:

```js
const publicOptions = {
  privacyPolicyUrl: "https://ownerinc.com.br/politica-de-privacidade/",
  owntimeUrl: "https://owntime.com.br/",
  nestUrl: "https://nestgramado.com.br/"
};
```

Tambem testar JSON acima de `16_384` bytes, `Content-Type` incorreto, `Origin`
estrangeira e metodo nao permitido.

- [ ] **Step 3: Executar os testes para confirmar a falha**

Run: `npm test`

Expected: testes de dominio passam; testes do servidor falham porque os exports
ainda nao existem.

- [ ] **Step 4: Implementar validacao na fronteira**

Reutilizar a estrutura comprovada de `projects/ativacao_tempo/server.mjs` para
`readJson`, `isAllowedOrigin`, headers de seguranca, arquivos estaticos e timeout.
A validacao deve produzir exatamente:

```js
{
  name,
  whatsapp: `+${digits}`,
  email: email.toLowerCase(),
  answers,
  result,
  scores,
  utm
}
```

Regras:

```js
const allowedUtm = new Set(["source", "medium", "campaign", "content", "term"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// name: 2..120; email: <=254; local phone: 10..11 digits; JSON: <=16_384 bytes.
```

Usar CSP restritiva, sem analytics ou hosts externos:

```text
default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self';
form-action 'self'; frame-ancestors 'none'; img-src 'self' data:;
script-src 'self'; style-src 'self'
```

- [ ] **Step 5: Implementar endpoints e encaminhamento**

O webhook deve receber um payload gerado no servidor:

```js
const submittedAt = new Date().toISOString();
const submissionId = randomUUID();
const payload = {
  submissionId,
  source: "lp-tijolo",
  submittedAt,
  ...lead.value,
  consent: { contact: true, acceptedAt: submittedAt }
};
```

Enviar com `Content-Type: application/json`, `X-Idempotency-Key`, Bearer opcional
e `AbortSignal.timeout(10_000)`. Responder `503` sem URL, `502` para resposta nao
`2xx` ou timeout e `201` apenas em sucesso. Nao registrar payload, token ou dados
pessoais.

Validar `privacyPolicyUrl`, `owntimeUrl` e `nestUrl` com `new URL(value)` e
protocolo `https:` dentro de `createServer`. Ausencia ou URL publica invalida deve
lançar `TypeError("Configuracao publica invalida.")` antes de abrir a porta. Adicionar
um teste unitario para esse erro.

- [ ] **Step 6: Confirmar API e arquivos estaticos**

Run: `npm test`

Expected: todos os testes PASS.

Run: `npm run verify`

Expected: PASS.

---

### Task 3: Jornada semantica e formulario

**Files:**
- Create: `public/index.html`
- Create: `public/app.js`
- Create: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `QUESTIONS` e `classifyAnswers` de `./quiz.js`.
- Consumes: `GET /api/config`.
- Produces: fluxo `intro -> quiz -> reveal -> result -> form -> success`.
- Produces: `POST /api/leads` com campos e respostas da sessao.

- [ ] **Step 1: Escrever o teste de contrato HTML que falha**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships one semantic quiz form and one lead form", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /<main/);
  assert.match(html, /<form[^>]+id="quiz-form"/);
  assert.match(html, /<fieldset/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<form[^>]+id="lead-form"/);
  assert.match(html, /type="email"/);
  assert.match(html, /type="checkbox"/);
});
```

- [ ] **Step 2: Executar o teste para confirmar a falha**

Run: `npm test`

Expected: FAIL porque `public/index.html` nao existe.

- [ ] **Step 3: Criar HTML acessivel e estavel sem JavaScript**

Incluir `main`, um `h1`, abertura, `form#quiz-form`, `fieldset`, `legend`, regiao
de progresso textual, dois radios, Voltar, Continuar, `section#result`,
`form#lead-form` e `section#success`. Todo campo possui `label`; erros usam
`role="alert"`; mudancas de etapa usam `aria-live="polite"`.

O consentimento deve dizer:

```html
Autorizo a Ownerinc a entrar em contato sobre os empreendimentos apresentados e
declaro que li a <a data-config="privacyPolicyUrl">Politica de Privacidade</a>.
```

- [ ] **Step 4: Implementar a maquina de estados minima em `app.js`**

Manter apenas:

```js
const state = { step: "intro", questionIndex: 0, answers: Array(QUESTIONS.length).fill(null), result: null };
```

Regras obrigatorias:

- iniciar muda para `quiz` e renderiza a pergunta zero;
- selecionar radio grava pelo indice e habilita Continuar;
- Continuar avanca uma pergunta ou calcula o resultado na quinta;
- Voltar reduz o indice e restaura a selecao;
- o resultado e renderizado antes de revelar o formulario;
- o CTA revela o formulario e move foco para seu titulo;
- o envio desabilita o botao, chama `/api/leads`, preserva campos em erro e
  mostra `success` apenas em `201`;
- os UTMs sao lidos uma vez com o mapa
  `utm_source -> source`, `utm_medium -> medium`, `utm_campaign -> campaign`,
  `utm_content -> content`, `utm_term -> term`;
- links de resultado usam apenas as URLs de `/api/config`.

Usar estes textos sem variacao:

```js
const RESULTS = {
  owntime: {
    title: "Owntime",
    copy: "Seu jeito de viver Gramado encontra o Owntime: natureza, espaco e convivencia para compartilhar o tempo."
  },
  nest: {
    title: "Nest",
    copy: "Seu jeito de viver Gramado encontra o Nest: arquitetura, bem-estar e um refugio contemporaneo na montanha."
  }
};
```

- [ ] **Step 5: Confirmar contrato e comportamento manual basico**

Run: `npm run verify`

Expected: PASS.

Run: `npm run serve`

Expected: servidor em `http://localhost:4182`; cinco perguntas preservam
respostas ao voltar; `3-2` mostra somente a maioria; formulario nao aparece antes
do CTA.

---

### Task 4: Visual mobile-first e revelacao cinematografica

**Files:**
- Create: `public/styles.css`
- Create: `public/assets/brand/ownerinc-logo-white.png`
- Create: `public/assets/brand/ownerinc-icon-white.png`
- Create: `public/assets/fonts/novelin-regular.otf`
- Create: `public/assets/fonts/novelin-bold.otf`
- Create: `public/assets/fonts/signaturia-regular.ttf`
- Require: `public/assets/results/owntime-logo-white.png`
- Require: `public/assets/results/owntime-hero.webp`
- Require: `public/assets/results/nest-logo-white.png`
- Require: `public/assets/results/nest-hero.webp`
- Modify: `public/index.html`
- Modify: `public/app.js`

**Interfaces:**
- Consumes: `data-result="owntime|nest"` no elemento `#result`.
- Produces: layout mobile-first, temas por resultado e parallax progressivo.

- [ ] **Step 1: Confirmar e copiar os assets do contrato**

Verificar que os quatro arquivos de resultado foram entregues e aprovados. Copiar
os cinco assets corporativos listados no `Asset Contract` para os caminhos locais
exatos. Nao referenciar `global assets` em runtime.

- [ ] **Step 2: Implementar tokens e base mobile-first**

```css
@font-face { font-family: Novelin; src: url("/assets/fonts/novelin-regular.otf") format("opentype"); font-weight: 400; font-display: swap; }
@font-face { font-family: Novelin; src: url("/assets/fonts/novelin-bold.otf") format("opentype"); font-weight: 700; font-display: swap; }
@font-face { font-family: Signaturia; src: url("/assets/fonts/signaturia-regular.ttf") format("truetype"); font-weight: 400; font-display: swap; }

:root {
  --ink: #171513;
  --paper: #d7cdc4;
  --cream: #f7f2eb;
  --bronze: #a78557;
  --focus: #ffffff;
  color-scheme: dark;
}
```

Comecar sem media query: uma coluna, largura fluida, `min-height: 100svh`, texto
com `clamp()`, controles `min-height: 48px` e formulario em coluna. Adicionar
somente `@media (min-width: 48rem)` para ampliar grid, tipografia e espaco
negativo; usar `@media (max-height: 40rem)` para permitir rolagem sem corte.

A abertura usa `ownerinc-logo-white.png`, a chamada "Qual refugio combina com o
seu jeito de viver Gramado?" e o CTA "Descobrir meu refugio". Sua entrada usa
somente opacidade e deslocamento de ate `16px` por no maximo `700ms`.

- [ ] **Step 3: Implementar os estados visuais do quiz**

Radios continuam nativos e visualmente associados aos seus labels. Normal,
`hover`, `:focus-visible`, `:checked` e `:disabled` precisam ser diferentes sem
depender apenas de cor. O progresso combina texto `Pergunta N de 5` com cinco
segmentos; segmentos decorativos usam `aria-hidden="true"`.

- [ ] **Step 4: Implementar revelacao e parallax controlado**

Adicionar tres camadas ao resultado: `.result__media`, `.result__veil` e
`.result__content`. `app.js` define somente variaveis CSS, limitadas por
`requestAnimationFrame`:

```js
const progress = Math.min(1, Math.max(0, -result.getBoundingClientRect().top / innerHeight));
result.style.setProperty("--parallax", progress.toFixed(3));
```

CSS usa `transform: translate3d(0, calc(var(--parallax) * 24px), 0) scale(1.06)`
na imagem, no maximo `12px` no overlay e conteudo estavel. A entrada usa mascara
vertical, opacidade e escala durante menos de `900ms`. Owntime usa
`owntime-hero.webp`; Nest usa `nest-hero.webp`. Logos e textos sao escolhidos por
`data-result`, sem duplicar a pagina.

- [ ] **Step 5: Implementar reducao de movimento e fallback**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  .result__media, .result__veil, .result__content { transform: none !important; clip-path: none !important; opacity: 1 !important; }
}
```

`app.js` nao registra o listener de parallax quando essa media query corresponde.

- [ ] **Step 6: Verificar visual e acessibilidade**

Run: `npm run verify`

Expected: PASS.

Checklist manual em `360x640`, `390x844`, `768x1024` e `1440x900`:

- nenhuma pergunta ou acao fica cortada;
- zoom de 200% permanece utilizavel;
- teclado percorre radios, Voltar, Continuar, CTA e formulario em ordem;
- foco permanece visivel sobre fundos claros e escuros;
- parallax nao desloca o texto e permanece suave no celular;
- movimento reduzido mostra o resultado imediatamente;
- Owntime e Nest usam somente seus assets aprovados.

---

### Task 5: Documentacao e verificacao final

**Files:**
- Modify: `README.md`
- Modify: `docs/product/brief.md` somente se URLs ou integracoes confirmadas mudarem

**Interfaces:**
- Consumes: scripts e variaveis implementados nas Tasks 1 a 4.
- Produces: instrucoes reproduziveis de execucao, teste e integracao.

- [ ] **Step 1: Documentar operacao real**

Atualizar `README.md` com Node.js 20+, `npm run serve`, URL local
`http://localhost:4182`, `npm test`, `npm run verify`, contrato de ambiente,
payload do webhook e comportamento de falha. Documentar que `LEAD_WEBHOOK_TOKEN`
e opcional e nunca chega ao navegador.

- [ ] **Step 2: Executar verificacao isolada**

Run: `npm run verify`

Expected: todos os testes de `lp-tijolo` passam.

- [ ] **Step 3: Executar verificacao agregada**

Run: `npm run verify` em `C:\Ownerinc`.

Expected: todos os workspaces passam. Se `interactive_deck` falhar porque a
politica do Windows bloqueia o SWC nativo e o Turbopack recusa WASM, registrar
essa falha preexistente separadamente; nao alterar outro projeto neste plano.

- [ ] **Step 4: Revisar escopo e seguranca**

Run: `git diff --check -- projects/lp_tijolo`

Expected: sem saida.

Confirmar no diff que nenhum `.env`, token, dado pessoal, asset nao aprovado ou
mudanca fora de `projects/lp_tijolo` foi incluido.
