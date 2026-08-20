import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlUrl = new URL("../public/index.html", import.meta.url);
const appUrl = new URL("../public/app.js", import.meta.url);
const stylesUrl = new URL("../public/styles.css", import.meta.url);
const vercelUrl = new URL("../vercel.json", import.meta.url);
const packageUrl = new URL("../package.json", import.meta.url);

const officialGalleryUrls = [
  "https://owntime.com.br/wp-content/uploads/2023/06/Imagem-do-WhatsApp-de-2023-06-29-as-14.39.24.jpg",
  "https://owntime.com.br/wp-content/uploads/2023/06/1-1.jpg",
  "https://owntime.com.br/wp-content/uploads/2023/06/2.jpg",
  "https://nestgramado.com.br/wp-content/uploads/2025/05/caf4d37d9de95f429df5f8bc6f63ae9f34ae1ea0-02.png",
  "https://nestgramado.com.br/wp-content/uploads/2025/05/39f613dc9d467f7faadf5688e4e57838c05a6030-scaled.png",
  "https://nestgramado.com.br/wp-content/uploads/2025/05/5eda4560ff985a6ca68ff1b4304e3d7f3e211bcb.png"
];

test("keeps the semantic quiz and lead form contract", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.match(html, /<main id="main-content">/);
  assert.equal((html.match(/<form[^>]+id="quiz-form"/g) || []).length, 1);
  assert.equal((html.match(/<form[^>]+id="lead-form"/g) || []).length, 1);
  for (const field of ["name", "whatsapp", "email", "consent"]) {
    assert.match(html, new RegExp(`id="${field}" name="${field}"`));
  }
  assert.match(html, /id="config-status"[^>]+role="status"/);
  assert.match(html, /id="lead-error"[^>]+role="alert"/);
  assert.match(html, /id="submit-lead"[^>]+>Enviar meus dados<\/button>/);
  assert.match(html, /data-config="privacyPolicyUrl"/);
  assert.match(html, /propriedade compartilhada/);
  assert.doesNotMatch(html, /testimonial|depoimento|urgência|urgencia|escassez|timer/i);
});

test("defines exactly three result screens with a visible third-screen form", async () => {
  const html = await readFile(htmlUrl, "utf8");
  assert.equal((html.match(/class="result-screen result-screen--/g) || []).length, 3);
  assert.match(html, /class="result-screen result-screen--hero"/);
  assert.match(html, /class="result-screen result-screen--product"/);
  assert.match(html, /class="result-screen result-screen--lead"[\s\S]*<form id="lead-form" class="lead-form" aria-labelledby="lead-title">/);
  assert.doesNotMatch(html, /<form id="lead-form"[^>]+hidden/);
  assert.match(html, /id="result-gallery"[^>]+role="region"[^>]+aria-roledescription="carousel"[^>]+aria-label="Fotos oficiais do empreendimento"[^>]+tabindex="0"/);
  assert.match(html, /<span>Falar com atendente<\/span>/);
  assert.match(html, /01 \/ 03/);
  assert.match(html, /02 \/ 03/);
  assert.match(html, /03 \/ 03/);
});

test("keeps two results with exactly three benefits and the official galleries", async () => {
  const app = await readFile(appUrl, "utf8");
  const benefitEntries = [...app.matchAll(/benefits:\s*\[((?:\s*"[^"]+"\s*,?)+)\s*\]/g)];
  assert.equal(benefitEntries.length, 2);
  benefitEntries.forEach(([, benefits]) => assert.equal((benefits.match(/"[^"]+"/g) || []).length, 3));
  assert.match(app, /const EXPECTED_BENEFIT_COUNT = 3;/);
  assert.match(app, /content\.benefits\.length !== EXPECTED_BENEFIT_COUNT/);
  assert.equal((app.match(/gallery:\s*\[/g) || []).length, 2);
  officialGalleryUrls.forEach((url) => assert.match(app, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
});

test("renders gallery nodes safely and scrolls the normal document to the form", async () => {
  const app = await readFile(appUrl, "utf8");
  assert.match(app, /function renderResultGallery\(items\)/);
  assert.match(app, /resultGallery\.replaceChildren\(viewport, previous, next, indicators, announcement\)/);
  assert.match(app, /document\.createElement\("figure"\)/);
  assert.match(app, /document\.createElement\("img"\)/);
  assert.match(app, /document\.createElement\("button"\)/);
  assert.match(app, /image\.src = src;/);
  assert.match(app, /image\.alt = alt;/);
  assert.match(app, /caption\.textContent = `Foto oficial/);
  assert.doesNotMatch(app, /resultGallery\.innerHTML|resultGallery\.insertAdjacentHTML/);
  assert.match(app, /resultLeadScreen\.scrollIntoView\(\{ block: "start", behavior: getScrollBehavior\(\) \}\)/);
  assert.doesNotMatch(app, /result\.scrollTop|result\.scrollTo|scrollResultTo/);
});

test("exposes functional carousel controls and slide accessibility state", async () => {
  const app = await readFile(appUrl, "utf8");
  assert.match(app, /aria-roledescription", "slide"/);
  assert.match(app, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(app, /setAttribute\("aria-live", "polite"\)/);
  assert.match(app, /className = `carousel__control carousel__control--\$\{direction\}`/);
  assert.match(app, /createElementNS\("http:\/\/www\.w3\.org\/2000\/svg", "svg"\)/);
  assert.doesNotMatch(app, /previous\.textContent = "Anterior"|next\.textContent = "Próxima"/);
  assert.match(app, /className = "carousel__indicator"/);
  assert.match(app, /addEventListener\("keydown", handleGalleryKeydown\)/);
  assert.match(app, /addEventListener\("pointerdown", handleGalleryPointerDown\)/);
  assert.match(app, /addEventListener\("pointermove", handleGalleryPointerMove\)/);
  assert.match(app, /ArrowRight/);
  assert.match(app, /ArrowLeft/);
  assert.match(app, /wrapGalleryIndex/);
  assert.doesNotMatch(app, /setInterval\(/);
});

test("uses document-flow result screens and preserves reduced-motion rules", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  assert.match(styles, /html,[\s\S]*?body,[\s\S]*?main\s*\{[\s\S]*?overflow-x:\s*hidden;/);
  assert.match(styles, /\.result\s*\{[\s\S]*?background:\s*var\(--surface\);/);
  assert.match(styles, /\.result-screen\s*\{[\s\S]*?min-height:\s*100dvh;[\s\S]*?padding:/);
  assert.match(styles, /\.result-screen--hero\s*\{[\s\S]*?overflow:\s*hidden;/);
  assert.match(styles, /\.result__gallery\s*\{[\s\S]*?perspective:\s*1100px;[\s\S]*?touch-action:\s*pan-y;/);
  assert.match(styles, /\.carousel__slide\.is-active[\s\S]*?translate3d\(-50%, 0, 48px\)/);
  assert.match(styles, /\.carousel__slide\.is-previous[\s\S]*?rotateY\(18deg\)[\s\S]*?scale\(\.76\)/);
  assert.match(styles, /\.carousel__slide\.is-next[\s\S]*?rotateY\(-18deg\)[\s\S]*?scale\(\.76\)/);
  assert.match(styles, /\.carousel__control[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/);
  assert.match(styles, /\.carousel__indicator\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/);
  assert.match(styles, /\.carousel__slide\s*\{[\s\S]*?transition:/);
  assert.doesNotMatch(styles, /\.result\s*\{[^}]*height:\s*100dvh/);
  assert.doesNotMatch(styles, /\.result\s*\{[^}]*overflow-y:\s*auto/);
  assert.doesNotMatch(styles, /\.result__hero|\.result__concept/);
  assert.match(styles, /@media \(min-width: 48rem\)[\s\S]*?\.result-screen--product/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none !important;[\s\S]*?animation: none !important;/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.carousel__slide\s*\{[\s\S]*?transition: none !important;/);
});

test("does not add a runtime dependency for the vanilla carousel", async () => {
  const packageJson = JSON.parse(await readFile(packageUrl, "utf8"));
  assert.equal(packageJson.dependencies, undefined);
  assert.equal(packageJson.devDependencies, undefined);
});

test("allows only the two official gallery hosts in both CSPs", async () => {
  const [vercel, server] = await Promise.all([
    readFile(vercelUrl, "utf8"),
    readFile(new URL("../server.mjs", import.meta.url), "utf8")
  ]);
  for (const source of [vercel, server]) {
    assert.match(source, /img-src 'self' data: https:\/\/owntime\.com\.br https:\/\/nestgramado\.com\.br/);
    assert.doesNotMatch(source, /img-src\s+\*/);
    assert.doesNotMatch(source, /img-src 'self' data:;/);
  }
});

test("preserves the established API and payload flow", async () => {
  const [app, html] = await Promise.all([readFile(appUrl, "utf8"), readFile(htmlUrl, "utf8")]);
  assert.match(app, /import \{ AFFINITY_QUESTIONS, QUESTIONS, classifyAnswers \} from "\.\/quiz\.js"/);
  assert.match(app, /import \{ createSubmissionAttempt, toClientSubmission \} from "\.\/client-submission\.js"/);
  assert.match(app, /fetch\("\/api\/config"/);
  assert.match(app, /fetch\("\/api\/leads"/);
  assert.match(app, /response\.status !== 202/);
  assert.match(app, /submitLead\.textContent = "Enviando…"/);
  assert.match(app, /leadForm\.setAttribute\("aria-busy", "true"\)/);
  assert.match(app, /new URL\(value\)\.protocol !== "https:"/);
  assert.match(html, /id="submit-lead"[^>]+disabled/);
});
