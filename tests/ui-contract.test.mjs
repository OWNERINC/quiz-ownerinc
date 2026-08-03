import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlUrl = new URL("../public/index.html", import.meta.url);
const appUrl = new URL("../public/app.js", import.meta.url);
const stylesUrl = new URL("../public/styles.css", import.meta.url);

test("ships one semantic quiz form and one lead form", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<main/);
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
});

test("keeps result, lead form and success as distinct journey stages", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<section[^>]+id="result"[^>]+hidden/);
  assert.match(html, /<form[^>]+id="lead-form"[^>]+hidden/);
  assert.match(html, /<section[^>]+id="success"[^>]+hidden/);
  assert.match(html, /data-config="privacyPolicyUrl"/);
  assert.match(html, /Autorizo a Ownerinc a entrar em contato sobre os empreendimentos apresentados e\s+declaro que li a <a data-config="privacyPolicyUrl">Politica de Privacidade<\/a>\./);
});

test("client consumes the established domain and API interfaces", async () => {
  const [html, app] = await Promise.all([readFile(htmlUrl, "utf8"), readFile(appUrl, "utf8")]);
  assert.match(app, /import \{ QUESTIONS, classifyAnswers \} from "\.\/quiz\.js"/);
  assert.match(app, /fetch\("\/api\/config"/);
  assert.match(app, /fetch\("\/api\/leads"/);
  assert.match(app, /utm_source:\s*"source"/);
  assert.match(app, /response\.status !== 201/);
  assert.match(html, /id="submit-lead"[^>]+disabled/);
  assert.match(app, /Nao conseguimos iniciar o atendimento\. Tente novamente\./);
  assert.match(app, /new URL\(value\)\.protocol !== "https:"/);
  assert.match(app, /submitLead\.disabled = false/);
});

test("uses the approved result CTA", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<span>Falar com um especialista<\/span>/);
});

test("ships stationary result copy and drop-in official logo fallbacks", async () => {
  const [html, app, styles] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(appUrl, "utf8"),
    readFile(stylesUrl, "utf8")
  ]);
  assert.match(html, /<img id="result-logo"[^>]+hidden>/);
  assert.match(html, /<span id="result-wordmark"/);
  assert.match(app, /logo: "\/assets\/results\/owntime-logo-white\.png"/);
  assert.match(app, /logo: "\/assets\/results\/nest-logo-white\.png"/);
  assert.match(app, /resultLogo\.addEventListener\("error"/);
  const revealCopy = styles.match(/@keyframes reveal-copy\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(revealCopy, /opacity: 0/);
  assert.doesNotMatch(revealCopy, /transform/);
  assert.match(styles, /\.text-link\s*\{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 48px;/);
  assert.match(styles, /\.consent label\s*\{[\s\S]*?min-height: 48px;/);
});

test("keeps mobile parallax below the desktop amplitude and layer count", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  assert.match(styles, /\.result__media\s*\{[\s\S]*?calc\(var\(--parallax\) \* 12px\)/);
  assert.match(styles, /\.result__veil\s*\{[\s\S]*?transform: none;/);
  assert.match(styles, /@media \(min-width: 48rem\)[\s\S]*?\.result__media\s*\{[\s\S]*?calc\(var\(--parallax\) \* 24px\)/);
  assert.match(styles, /@media \(min-width: 48rem\)[\s\S]*?\.result__veil\s*\{[\s\S]*?calc\(var\(--parallax\) \* 12px\)/);
});
