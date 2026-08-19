import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlUrl = new URL("../public/index.html", import.meta.url);
const appUrl = new URL("../public/app.js", import.meta.url);
const stylesUrl = new URL("../public/styles.css", import.meta.url);
const owntimeLogoUrl = new URL("../public/assets/results/owntime-logo-white.png", import.meta.url);
const nestLogoUrl = new URL("../public/assets/results/nest-logo-white.png", import.meta.url);
const owntimeHeroUrl = new URL("../public/assets/results/owntime-hero-official.jpg", import.meta.url);
const nestHeroUrl = new URL("../public/assets/results/nest-hero-official.jpg", import.meta.url);

test("ships one semantic quiz form and one lead form", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<main/);
  assert.match(html, /<link rel="icon" href="\/assets\/brand\/ownerinc-icon-white\.png" type="image\/png">/);
  assert.doesNotMatch(html, /Uma leitura editorial(?: Ownerinc)?/);
  assert.match(html, /<span>Começar<\/span>/);
  assert.match(html, /class="intro__content intro__copy"/);
  assert.match(html, /id="start" class="text-link text-link--button intro__cta" type="button"/);
  assert.match(html, /01 \/ 08/);
  assert.doesNotMatch(html, /01 \/ 05/);
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
  assert.match(html, /class="quiz__progress quiz__meta"/);
  assert.match(html, /<div class="quiz__answers">[\s\S]*class="answer-choice"[\s\S]*<\/div>/);
  assert.match(html, /class="result__copy"/);
  assert.match(html, /class="result__actions"/);
  assert.match(html, /id="quiz-progress"[^>]+aria-live="polite"/);
  assert.doesNotMatch(html, /progress-track/);
});

test("keeps result landing blocks and semantic lead registration intact", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<section[^>]+id="result"[^>]+hidden/);
  assert.match(html, /class="result__hero"/);
  assert.match(html, /id="result-subtitle"/);
  assert.match(html, /id="result-benefits"[^>]*>\s*<\/ul>/);
  assert.match(html, /id="result-trust"/);
  assert.match(html, /class="result__registration"[\s\S]*<form[^>]+id="lead-form"[^>]+hidden/);
  assert.match(html, /<section[^>]+id="success"[^>]+hidden/);
  assert.match(html, /data-config="privacyPolicyUrl"/);
  assert.match(html, /Autorizo a Ownerinc a entrar em contato sobre os empreendimentos apresentados e\s+declaro que li a <a data-config="privacyPolicyUrl">Política de Privacidade<\/a>\./);
  assert.match(html, /propriedade compartilhada/);
  assert.match(html, /id="restart-result"/);
  assert.match(html, /id="restart-success"/);
  assert.match(html, /<label[^>]+for="name"[^>]*>Nome<\/label>[\s\S]*<input id="name" name="name"/);
  assert.match(html, /<label[^>]+for="whatsapp"[^>]*>WhatsApp com DDD<\/label>[\s\S]*<input id="whatsapp" name="whatsapp"/);
  assert.match(html, /<label[^>]+for="email"[^>]*>E-mail<\/label>[\s\S]*<input id="email" name="email"/);
  assert.match(html, /<input id="consent" name="consent" type="checkbox"/);
  assert.match(html, /id="config-status"[^>]+role="status"/);
  assert.match(html, /id="lead-error"[^>]+role="alert"/);
  assert.match(html, /id="submit-lead"[^>]+>Enviar meus dados<\/button>/);
  assert.doesNotMatch(html, /testimonial|depoimento|avaliações|avaliacoes|urgência|urgencia|escassez|últimas vagas|ultimas vagas|timer/i);
});

test("client consumes the established domain and API interfaces", async () => {
  const [html, app] = await Promise.all([readFile(htmlUrl, "utf8"), readFile(appUrl, "utf8")]);
  assert.match(app, /import \{ AFFINITY_QUESTIONS, QUESTIONS, classifyAnswers \} from "\.\/quiz\.js"/);
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

test("renders approved result content safely and navigates to registration", async () => {
  const app = await readFile(appUrl, "utf8");
  const benefitEntries = [...app.matchAll(/benefits:\s*\[((?:\s*"[^"]+"\s*,?)+)\s*\]/g)];
  assert.equal(benefitEntries.length, 2);
  benefitEntries.forEach(([, benefits]) => assert.equal((benefits.match(/"[^"]+"/g) || []).length, 3));
  assert.match(app, /const EXPECTED_BENEFIT_COUNT = 3;/);
  assert.match(app, /content\.benefits\.length !== EXPECTED_BENEFIT_COUNT/);
  assert.equal((app.match(/leadTitle:/g) || []).length, 2);
  assert.match(app, /const resultSubtitle = document\.querySelector\("#result-subtitle"\);/);
  assert.match(app, /const resultBenefits = document\.querySelector\("#result-benefits"\);/);
  assert.match(app, /resultSubtitle\.textContent = content\.subtitle \|\|/);
  assert.match(app, /resultBenefits\.replaceChildren\(\.\.\.\(content\.benefits \|\| \[\]\)\.map\(\(benefit\) => \{/);
  assert.match(app, /const item = document\.createElement\("li"\);[\s\S]*?item\.textContent = benefit;/);
  assert.doesNotMatch(app, /result(?:Subtitle|Benefits)\.innerHTML/);
  assert.match(app, /leadTitle\.textContent = content\.leadTitle \|\| "Fale com a Ownerinc";/);
  assert.match(app, /function scrollResultTo\(element, behavior = getScrollBehavior\(\)\)[\s\S]*?result\.scrollTo\(\{ top: Math\.max\(0, targetTop\), behavior \}\);/);
  assert.match(app, /leadForm\.hidden = false;\s*requestAnimationFrame\(\(\) => \{\s*scrollResultTo\(leadForm, "instant"\);\s*leadTitle\.focus\(\{ preventScroll: true \}\);\s*\}\);/);
  assert.match(app, /leadTitle\.focus\(\{ preventScroll: true \}\);/);
});

test("uses instant scrolling only when reduced motion is requested", async () => {
  const app = await readFile(appUrl, "utf8");
  assert.match(app, /function getScrollBehavior\(\)\s*\{\s*return window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches \? "instant" : "smooth";/);
  assert.match(app, /scrollTo\(\{ top: 0, behavior: getScrollBehavior\(\) \}\);/);
  assert.match(app, /function scrollResultTo\(element, behavior = getScrollBehavior\(\)\)/);
  assert.match(app, /scrollResultTo\(leadForm, "instant"\)/);
});

test("resets the nested result scroll position between quiz runs", async () => {
  const app = await readFile(appUrl, "utf8");
  assert.equal((app.match(/result\.scrollTop = 0;/g) || []).length, 2);
  assert.match(app, /result\.hidden = false;\s*result\.scrollIntoView[\s\S]*?resultTitle\.focus\(\{ preventScroll: true \}\);\s*result\.scrollTop = 0;/);
  assert.match(app, /result\.hidden = true;\s*result\.scrollTop = 0;\s*result\.classList\.remove\("is-revealed"\)/);
});

test("uses an interruptible reduced-motion-safe question transition", async () => {
  const [app, styles] = await Promise.all([readFile(appUrl, "utf8"), readFile(stylesUrl, "utf8")]);
  assert.match(app, /questionContent\.classList\.add\("is-changing"\);[\s\S]*?prompt\.textContent = question\.prompt;/);
  assert.match(app, /if \(questionTransitionFrame\) cancelAnimationFrame\(questionTransitionFrame\);/);
  assert.match(app, /requestAnimationFrame\(\(\) => \{[\s\S]*?questionContent\.classList\.remove\("is-changing"\);/);
  assert.match(styles, /\.quiz__form fieldset\s*\{[\s\S]*?transition:\s*opacity 200ms ease-out, transform 200ms ease-out;/);
  assert.match(styles, /\.quiz__form fieldset\.is-changing\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*translateY\(6px\);/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.quiz__form fieldset[\s\S]*?transition:\s*none !important;[\s\S]*?animation:\s*none !important;/);
});

test("uses the approved result CTA", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<span>Falar com atendente<\/span>/);
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

test("ships stationary result copy and official result assets", async () => {
  const [html, app, styles, owntimeLogo, nestLogo, owntimeHero, nestHero] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(appUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
    readFile(owntimeLogoUrl),
    readFile(nestLogoUrl),
    readFile(owntimeHeroUrl),
    readFile(nestHeroUrl)
  ]);
  assert.match(html, /<img id="result-logo"[^>]+hidden>/);
  assert.match(html, /<span id="result-wordmark"/);
  assert.match(app, /logo: "\/assets\/results\/owntime-logo-white\.png"/);
  assert.match(app, /logo: "\/assets\/results\/nest-logo-white\.png"/);
  assert.match(app, /resultLogo\.addEventListener\("error"/);
  assert.ok(owntimeLogo.length > 1_000);
  assert.ok(nestLogo.length > 1_000);
  assert.ok(owntimeHero.length > 50_000);
  assert.ok(nestHero.length > 50_000);
  assert.match(styles, /--result-hero:\s*url\("\/assets\/results\/owntime-hero-official\.jpg"\)/);
  assert.match(styles, /--result-hero:\s*url\("\/assets\/results\/nest-hero-official\.jpg"\)/);
  assert.doesNotMatch(styles, /hero-placeholder\.svg/);
  assert.doesNotMatch(styles, /\.result\.is-revealed \.result__content/);
  assert.match(styles, /\.text-link\s*\{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 48px;/);
  assert.match(styles, /\.consent label\s*\{[\s\S]*?min-height: 48px;/);
  assert.match(styles, /\.consent a\s*\{[\s\S]*?min-height: 48px;/);
});

test("styles the result as a scrollable three-block landing page", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  assert.match(styles, /\.result\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?min-height:\s*100dvh;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(styles, /\.result__hero\s*\{[\s\S]*?min-height:[\s\S]*?overflow:\s*hidden;/);
  assert.match(styles, /\.result__hero \.result__media\s*\{[\s\S]*?inset:\s*-4%;/);
  assert.match(styles, /\.result__subtitle\s*\{[\s\S]*?color:\s*rgb\(255 255 255 \/ 92%\);/);
  assert.match(styles, /\.result__hero h2\s*\{/);
  assert.doesNotMatch(styles, /\.result h2\s*\{/);
  assert.match(styles, /\.lead-form h2\s*\{[\s\S]*?color:\s*var\(--ink\);/);
  assert.match(styles, /\.result__hero \.button--light\s*\{[\s\S]*?background:\s*#fff;[\s\S]*?color:\s*var\(--ink\);/);
  assert.match(styles, /\.result__concept\s*\{[\s\S]*?background:\s*var\(--surface-raised\);/);
  assert.match(styles, /\.result__benefits\s*\{[\s\S]*?border-top:\s*1px solid var\(--bronze\);[\s\S]*?list-style:\s*disc;/);
  assert.match(styles, /\.result__trust\s*\{[\s\S]*?color:\s*var\(--muted\);/);
  assert.match(styles, /\.result__registration\s*\{[\s\S]*?padding-bottom:[\s\S]*?env\(safe-area-inset-bottom\)/);
  assert.match(styles, /\.result__registration\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(styles, /\.lead-form__header\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(styles, /\.lead-form\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);/);
  assert.match(styles, /\.result__registration \.lead-form\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);/);
  assert.match(styles, /@media \(min-width: 48rem\)[\s\S]*?\.result\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.15fr\) minmax\(0, \.85fr\);/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.result__media,[\s\S]*?\.result__veil,[\s\S]*?\.result__content/);
  assert.doesNotMatch(styles, /testimonial|depoimento|avaliações|avaliacoes|urgência|urgencia|escassez|últimas vagas|ultimas vagas|timer/i);
});

test("keeps the visual system restrained and editorial", async () => {
  const [app, html, styles] = await Promise.all([
    readFile(appUrl, "utf8"),
    readFile(htmlUrl, "utf8"),
    readFile(stylesUrl, "utf8")
  ]);
  assert.equal((styles.match(/@font-face\s*\{/g) || []).length, 2);
  assert.match(styles, /--surface:\s*#f4efe7;[\s\S]*--surface-raised:\s*#fbf8f3;[\s\S]*--ink:\s*#292622;[\s\S]*--muted:\s*#716a61;[\s\S]*--bronze:\s*#9b7a52;[\s\S]*--line:\s*rgb\(41 38 34 \/ 18%\);[\s\S]*--focus:\s*#6d4e2c;[\s\S]*color-scheme:\s*light;/);
  assert.doesNotMatch(styles, /--paper|--cream|color-scheme:\s*dark/);
  assert.match(styles, /font-family: Novelin;[\s\S]*?font-weight: 400;/);
  assert.match(styles, /font-family: Novelin;[\s\S]*?font-weight: 700;/);
  assert.match(app, /choice\.classList\.toggle\("is-selected", isSelected\)/);
  assert.match(styles, /\.answer-choice\.is-selected\s*\{[\s\S]*?background:[\s\S]*?box-shadow:[\s\S]*?var\(--bronze\)/);
  assert.doesNotMatch(styles, /\.answer-choice:has\(input:checked\)/);
  assert.match(styles, /\.answer-choice input\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
  assert.match(styles, /:focus-visible\s*\{[\s\S]*?outline:\s*3px solid var\(--focus\);/);
  assert.match(styles, /\.text-link\s*\{[\s\S]*?text-decoration:\s*underline;/);
  assert.doesNotMatch(`${app}\n${styles}`, /Signaturia|parallax/);
  assert.doesNotMatch(`${html}\n${styles}`, /button__mark|intro::after/);
  assert.doesNotMatch(styles, /inset\s+(?:58vw|0\s+-14rem)/);
  assert.doesNotMatch(styles, /font-size:\s*clamp\(6rem,\s*11vw,\s*10rem\)/);
  assert.match(styles, /\.result__media\s*\{[\s\S]*?background-size:\s*cover;/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none\s*!important;[\s\S]*?animation:\s*none\s*!important;/);
});

test("keeps normal journey stages fixed and restores short-height scrolling", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  assert.match(styles, /html,\s*body,\s*main\s*\{[\s\S]*?height:\s*100%;[\s\S]*?overflow:\s*hidden;/);
  assert.match(styles, /\.intro,\s*\.quiz,\s*\.result,\s*\.lead-form,\s*\.success\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(styles, /@media \(max-height:\s*34rem\)[\s\S]*?html,\s*body,\s*main\s*\{[\s\S]*?height:\s*auto;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(styles, /@media \(max-height:\s*34rem\)[\s\S]*?\.intro,\s*\.quiz,\s*\.result,\s*\.lead-form,\s*\.success\s*\{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*100dvh;/);
});
