import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlUrl = new URL("../public/index.html", import.meta.url);
const appUrl = new URL("../public/app.js", import.meta.url);
const stylesUrl = new URL("../public/styles.css", import.meta.url);
const owntimeLogoUrl = new URL("../public/assets/results/owntime-logo-white.png", import.meta.url);
const nestLogoUrl = new URL("../public/assets/results/nest-logo-white.png", import.meta.url);

test("ships one semantic quiz form and one lead form", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<main/);
  assert.match(html, /<link rel="icon" href="\/assets\/brand\/ownerinc-icon-white\.png" type="image\/png">/);
  assert.match(html, /<h1/);
  assert.match(html, /<form[^>]+id="quiz-form"/);
  assert.match(html, /<fieldset/);
  assert.match(html, /<legend/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<form[^>]+id="lead-form"/);
  assert.match(html, /<label[^>]+for="name"/);
  assert.match(html, /<label[^>]+for="whatsapp"/);
  assert.match(html, /<label[^>]+for="email"/);
  assert.match(html, /type="email"/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /role="alert"/);
  assert.equal((html.match(/<form[^>]+id="quiz-form"/g) || []).length, 1);
  assert.equal((html.match(/<form[^>]+id="lead-form"/g) || []).length, 1);
  assert.equal((html.match(/class="answer-choice"/g) || []).length, 4);
  assert.match(html, /id="quiz-progress"[^>]+aria-live="polite"/);
  assert.doesNotMatch(html, /progress-track/);
});

test("keeps result, lead form and success as distinct journey stages", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<section[^>]+id="result"[^>]+hidden/);
  assert.match(html, /<form[^>]+id="lead-form"[^>]+hidden/);
  assert.match(html, /<section[^>]+id="success"[^>]+hidden/);
  assert.match(html, /data-config="privacyPolicyUrl"/);
  assert.match(html, /Autorizo a Ownerinc a entrar em contato sobre os empreendimentos apresentados e\s+declaro que li a <a data-config="privacyPolicyUrl">Política de Privacidade<\/a>\./);
  assert.match(html, /propriedade compartilhada/);
  assert.match(html, /id="restart-result"/);
  assert.match(html, /id="restart-success"/);
});

test("client consumes the established domain and API interfaces", async () => {
  const [html, app] = await Promise.all([readFile(htmlUrl, "utf8"), readFile(appUrl, "utf8")]);
  assert.match(app, /import \{ AFFINITY_QUESTIONS, QUESTIONS, classifyAnswers, shuffleQuestions \} from "\.\/quiz\.js"/);
  assert.match(app, /import \{ createSubmissionAttempt, toClientSubmission \} from "\.\/client-submission\.js"/);
  assert.match(app, /fetch\("\/api\/config"/);
  assert.match(app, /fetch\("\/api\/leads"/);
  assert.match(app, /utm_source:\s*"source"/);
  assert.match(app, /response\.status !== 202/);
  assert.match(html, /id="submit-lead"[^>]+disabled/);
  assert.match(app, /Não conseguimos iniciar o atendimento\. Tente novamente\./);
  assert.match(app, /new URL\(value\)\.protocol !== "https:"/);
  assert.match(app, /submitLead\.disabled = false/);
});

test("uses the approved result CTA", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<span>Falar com a equipe Ownerinc<\/span>/);
});

test("frames the result as an editorial preference and improves form recovery", async () => {
  const [html, app, styles] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(appUrl, "utf8"),
    readFile(stylesUrl, "utf8")
  ]);
  assert.match(html, /afinidade editorial/);
  assert.match(html, /id="config-status"[^>]+role="status"/);
  assert.match(html, /id="whatsapp"[^>]+pattern=/);
  assert.match(app, /submitLead\.textContent = "Enviando…"/);
  assert.match(app, /leadForm\.setAttribute\("aria-busy", "true"\)/);
  assert.match(app, /leadError\.focus\(\)/);
  assert.match(app, /function restartQuiz\(\)/);
  assert.match(app, /result\.scrollIntoView\(\{ block: "start", behavior: "instant" \}\)/);
  assert.match(app, /resultTitle\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(styles, /min-width:\s*320px/);
});

test("ships stationary result copy and drop-in official logo fallbacks", async () => {
  const [html, app, styles, owntimeLogo, nestLogo] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(appUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
    readFile(owntimeLogoUrl),
    readFile(nestLogoUrl)
  ]);
  assert.match(html, /<img id="result-logo"[^>]+hidden>/);
  assert.match(html, /<span id="result-wordmark"/);
  assert.match(app, /logo: "\/assets\/results\/owntime-logo-white\.png"/);
  assert.match(app, /logo: "\/assets\/results\/nest-logo-white\.png"/);
  assert.match(app, /resultLogo\.addEventListener\("error"/);
  assert.ok(owntimeLogo.length > 1_000);
  assert.ok(nestLogo.length > 1_000);
  assert.doesNotMatch(styles, /\.result\.is-revealed \.result__content/);
  assert.match(styles, /\.text-link\s*\{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 48px;/);
  assert.match(styles, /\.consent label\s*\{[\s\S]*?min-height: 48px;/);
  assert.match(styles, /\.consent a\s*\{[\s\S]*?min-height: 48px;/);
});

test("keeps the visual system restrained and editorial", async () => {
  const [app, html, styles] = await Promise.all([
    readFile(appUrl, "utf8"),
    readFile(htmlUrl, "utf8"),
    readFile(stylesUrl, "utf8")
  ]);
  assert.equal((styles.match(/@font-face\s*\{/g) || []).length, 2);
  assert.match(styles, /font-family: Novelin;[\s\S]*?font-weight: 400;/);
  assert.match(styles, /font-family: Novelin;[\s\S]*?font-weight: 700;/);
  assert.doesNotMatch(`${app}\n${styles}`, /Signaturia|parallax/);
  assert.doesNotMatch(`${html}\n${styles}`, /button__mark|intro::after/);
  assert.doesNotMatch(styles, /inset\s+(?:58vw|0\s+-14rem)/);
  assert.doesNotMatch(styles, /font-size:\s*clamp\(6rem,\s*11vw,\s*10rem\)/);
  assert.match(styles, /\.result__media\s*\{[\s\S]*?background-size:\s*cover;/);
});

test("keeps normal journey stages fixed and restores short-height scrolling", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  assert.match(styles, /html,\s*body,\s*main\s*\{[\s\S]*?height:\s*100%;[\s\S]*?overflow:\s*hidden;/);
  assert.match(styles, /\.intro,\s*\.quiz,\s*\.result,\s*\.lead-form,\s*\.success\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(styles, /@media \(max-height:\s*34rem\)[\s\S]*?html,\s*body,\s*main\s*\{[\s\S]*?height:\s*auto;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(styles, /@media \(max-height:\s*34rem\)[\s\S]*?\.intro,\s*\.quiz,\s*\.result,\s*\.lead-form,\s*\.success\s*\{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*100dvh;/);
});
