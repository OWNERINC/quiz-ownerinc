import { AFFINITY_QUESTIONS, QUESTIONS, classifyAnswers } from "./quiz.js";
import { createSubmissionAttempt, toClientSubmission } from "./client-submission.js";

const RESULTS = {
  owntime: {
    title: "Owntime",
    logo: "/assets/results/owntime-logo-white.png",
    copy: "Suas respostas se aproximam editorialmente do Owntime. Um ponto de partida para conhecer uma proposta de espaço, natureza e convivência.",
    subtitle: "Mais tempo para estar junto, com espaço, natureza e hospitalidade em Gramado.",
    benefits: [
      "Ambientes amplos para reunir a família.",
      "Conexão com a natureza e o ritmo de Gramado.",
      "Hospitalidade para tornar cada estadia mais leve."
    ],
    gallery: [
      {
        src: "https://owntime.com.br/wp-content/uploads/2023/06/Imagem-do-WhatsApp-de-2023-06-29-as-14.39.24.jpg",
        alt: "Ambiente do Owntime"
      },
      {
        src: "https://owntime.com.br/wp-content/uploads/2023/06/1-1.jpg",
        alt: "Espaço do Owntime"
      },
      {
        src: "https://owntime.com.br/wp-content/uploads/2023/06/2.jpg",
        alt: "Detalhe do Owntime"
      }
    ],
    leadTitle: "Fale sobre o Owntime"
  },
  nest: {
    title: "Nest Mountain Lodge",
    logo: "/assets/results/nest-logo-white.png",
    copy: "Suas respostas se aproximam editorialmente do Nest Mountain Lodge. Um ponto de partida para conhecer uma proposta de arquitetura, bem-estar e contemplação.",
    subtitle: "Um refúgio de montanha para desacelerar com conforto, bem-estar e praticidade.",
    benefits: [
      "Arquitetura orgânica integrada à paisagem.",
      "Conforto sensorial para momentos de descanso e bem-estar.",
      "Praticidade para aproveitar uma experiência de Mountain Lodge em Gramado."
    ],
    gallery: [
      {
        src: "https://nestgramado.com.br/wp-content/uploads/2025/05/caf4d37d9de95f429df5f8bc6f63ae9f34ae1ea0-02.png",
        alt: "Ambiente do Nest Mountain Lodge"
      },
      {
        src: "https://nestgramado.com.br/wp-content/uploads/2025/05/39f613dc9d467f7faadf5688e4e57838c05a6030-scaled.png",
        alt: "Arquitetura do Nest Mountain Lodge"
      },
      {
        src: "https://nestgramado.com.br/wp-content/uploads/2025/05/5eda4560ff985a6ca68ff1b4304e3d7f3e211bcb.png",
        alt: "Detalhe do Nest Mountain Lodge"
      }
    ],
    leadTitle: "Fale sobre o Nest Mountain Lodge"
  }
};
const EXPECTED_BENEFIT_COUNT = 3;

Object.entries(RESULTS).forEach(([resultKey, content]) => {
  if (!Array.isArray(content.benefits) || content.benefits.length !== EXPECTED_BENEFIT_COUNT) {
    throw new Error(`${resultKey} must define exactly ${EXPECTED_BENEFIT_COUNT} benefits.`);
  }
});

const state = {
  questionIndex: 0,
  questions: QUESTIONS,
  responses: {},
  result: null,
  submissionAttempt: createSubmissionAttempt()
};
const galleryState = {
  activeIndex: 0,
  items: [],
  slides: [],
  announcement: null,
  pointer: null,
  suppressClick: false
};
const utmMap = {
  utm_source: "source",
  utm_medium: "medium",
  utm_campaign: "campaign",
  utm_content: "content",
  utm_term: "term"
};
const params = new URLSearchParams(location.search);
const utm = Object.fromEntries(Object.entries(utmMap)
  .filter(([queryKey]) => params.has(queryKey))
  .map(([queryKey, payloadKey]) => [payloadKey, params.get(queryKey)]));
const destinationUrls = {};
const retryMessage = "Não conseguimos iniciar o atendimento. Tente novamente.";
let configReady = false;

const intro = document.querySelector("#intro");
const quiz = document.querySelector("#quiz");
const quizForm = document.querySelector("#quiz-form");
const questionContent = quizForm.querySelector("fieldset");
const progress = document.querySelector("#quiz-progress");
const prompt = document.querySelector("#question-prompt");
const choices = [...document.querySelectorAll(".answer-choice")];
const radios = [...document.querySelectorAll('input[name="answer"]')];
const labels = radios.map((radio) => document.querySelector(`label[for="${radio.id}"]`));
const back = document.querySelector("#back");
const continueButton = document.querySelector("#continue");
const result = document.querySelector("#result");
const resultTitle = document.querySelector("#result-title");
const resultLogo = document.querySelector("#result-logo");
const resultWordmark = document.querySelector("#result-wordmark");
const resultCopy = document.querySelector("#result-copy");
const resultSubtitle = document.querySelector("#result-subtitle");
const resultBenefits = document.querySelector("#result-benefits");
const resultGallery = document.querySelector("#result-gallery");
const resultLink = document.querySelector("#result-link");
const resultLeadScreen = document.querySelector("#result-screen-lead");
const leadForm = document.querySelector("#lead-form");
const leadTitle = document.querySelector("#lead-title");
const leadError = document.querySelector("#lead-error");
const configStatus = document.querySelector("#config-status");
const submitLead = document.querySelector("#submit-lead");
const success = document.querySelector("#success");
let questionTransitionFrame;

function getScrollBehavior() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}

function renderQuestion({ focus = false } = {}) {
  const question = state.questions[state.questionIndex];
  if (questionTransitionFrame) cancelAnimationFrame(questionTransitionFrame);
  questionContent.classList.add("is-changing");
  progress.textContent = `Pergunta ${state.questionIndex + 1} de ${state.questions.length}`;
  prompt.textContent = question.prompt;
  choices.forEach((choice, index) => {
    const option = question.options[index];
    choice.hidden = !option;
    if (!option) {
      choice.classList.remove("is-selected");
      radios[index].checked = false;
      return;
    }
    radios[index].value = option.value;
    const isSelected = state.responses[question.id] === option.value;
    radios[index].checked = isSelected;
    choice.classList.toggle("is-selected", isSelected);
    labels[index].textContent = option.label;
  });
  back.hidden = state.questionIndex === 0;
  back.disabled = false;
  back.textContent = "Voltar";
  continueButton.disabled = !state.responses[question.id];
  continueButton.textContent = state.questionIndex === state.questions.length - 1 ? "Ver meu resultado" : "Continuar";
  questionTransitionFrame = requestAnimationFrame(() => {
    questionContent.classList.remove("is-changing");
    questionTransitionFrame = null;
  });
  if (focus) prompt.focus();
}

function wrapGalleryIndex(index) {
  const length = galleryState.items.length;
  return length ? (index + length) % length : 0;
}

function galleryOffset(index) {
  const length = galleryState.items.length;
  let offset = (index - galleryState.activeIndex + length) % length;
  if (offset > length / 2) offset -= length;
  return offset;
}

function updateGallery() {
  galleryState.slides.forEach((slide, index) => {
    const offset = galleryOffset(index);
    const isActive = offset === 0;
    slide.classList.toggle("is-active", isActive);
    slide.classList.toggle("is-previous", offset === -1);
    slide.classList.toggle("is-next", offset === 1);
    slide.classList.toggle("is-hidden", Math.abs(offset) > 1);
    if (isActive) {
      slide.removeAttribute("aria-hidden");
    } else {
      slide.setAttribute("aria-hidden", "true");
    }
    slide.querySelector("button").tabIndex = isActive ? 0 : -1;
  });

  resultGallery.querySelectorAll(".carousel__indicator").forEach((indicator, index) => {
    if (index === galleryState.activeIndex) {
      indicator.setAttribute("aria-current", "true");
    } else {
      indicator.removeAttribute("aria-current");
    }
  });

  if (galleryState.announcement) {
    const { alt } = galleryState.items[galleryState.activeIndex];
    galleryState.announcement.textContent = `Foto ${galleryState.activeIndex + 1} de ${galleryState.items.length}: ${alt}`;
  }
}

function setGallerySlide(index, { focus = false } = {}) {
  if (!galleryState.items.length) return;
  galleryState.activeIndex = wrapGalleryIndex(index);
  updateGallery();
  if (focus) galleryState.slides[galleryState.activeIndex].querySelector("button").focus({ preventScroll: true });
}

function moveGallery(direction, options) {
  setGallerySlide(galleryState.activeIndex + direction, options);
}

function renderResultGallery(items) {
  galleryState.items = items;
  galleryState.activeIndex = 0;

  const viewport = document.createElement("div");
  viewport.className = "carousel__viewport";
  const track = document.createElement("div");
  track.className = "carousel__track";
  galleryState.slides = items.map(({ src, alt }, index) => {
    const figure = document.createElement("figure");
    const card = document.createElement("button");
    const image = document.createElement("img");
    const caption = document.createElement("figcaption");

    figure.className = "carousel__slide";
    figure.id = `result-gallery-slide-${index + 1}`;
    figure.dataset.index = String(index);
    figure.setAttribute("role", "group");
    figure.setAttribute("aria-roledescription", "slide");
    figure.setAttribute("aria-label", `Foto ${index + 1} de ${items.length}: ${alt}`);
    card.className = "carousel__card";
    card.type = "button";
    card.setAttribute("aria-label", `Focar na foto ${index + 1} de ${items.length}: ${alt}`);
    image.src = src;
    image.alt = alt;
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    caption.textContent = `Foto oficial ${index + 1} de ${items.length}`;
    card.append(image, caption);
    figure.append(card);
    track.append(figure);
    return figure;
  });
  viewport.append(track);

  const previous = document.createElement("button");
  previous.className = "carousel__control carousel__control--previous";
  previous.type = "button";
  previous.setAttribute("aria-label", "Foto anterior");
  previous.textContent = "Anterior";
  previous.addEventListener("click", () => moveGallery(-1));

  const next = document.createElement("button");
  next.className = "carousel__control carousel__control--next";
  next.type = "button";
  next.setAttribute("aria-label", "Próxima foto");
  next.textContent = "Próxima";
  next.addEventListener("click", () => moveGallery(1));

  const indicators = document.createElement("div");
  indicators.className = "carousel__indicators";
  indicators.setAttribute("role", "group");
  indicators.setAttribute("aria-label", "Selecionar foto");
  items.forEach(({ alt }, index) => {
    const indicator = document.createElement("button");
    indicator.className = "carousel__indicator";
    indicator.type = "button";
    indicator.setAttribute("aria-label", `Ver foto ${index + 1} de ${items.length}: ${alt}`);
    indicator.setAttribute("aria-controls", `result-gallery-slide-${index + 1}`);
    indicator.textContent = String(index + 1).padStart(2, "0");
    indicator.addEventListener("click", () => setGallerySlide(index));
    indicators.append(indicator);
  });

  const announcement = document.createElement("span");
  announcement.className = "visually-hidden";
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  galleryState.announcement = announcement;
  resultGallery.replaceChildren(viewport, previous, next, indicators, announcement);
  updateGallery();

  viewport.addEventListener("click", (event) => {
    const card = event.target.closest(".carousel__card");
    if (!card) return;
    if (galleryState.suppressClick) {
      event.preventDefault();
      galleryState.suppressClick = false;
      return;
    }
    const slide = card.closest(".carousel__slide");
    setGallerySlide(Number(slide.dataset.index), { focus: true });
  });
}

function handleGalleryKeydown(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const cardIsFocused = event.target.closest?.(".carousel__card") === event.target;
  moveGallery(event.key === "ArrowRight" ? 1 : -1, { focus: cardIsFocused });
}

function handleGalleryPointerDown(event) {
  if (!event.isPrimary || event.button !== 0 || !event.target.closest(".carousel__viewport")) return;
  galleryState.suppressClick = false;
  galleryState.pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, deltaX: 0, moved: false };
}

function handleGalleryPointerMove(event) {
  const pointer = galleryState.pointer;
  if (!pointer || pointer.id !== event.pointerId) return;
  pointer.deltaX = event.clientX - pointer.startX;
  const deltaY = event.clientY - pointer.startY;
  if (!pointer.moved && Math.abs(pointer.deltaX) > 8 && Math.abs(pointer.deltaX) > Math.abs(deltaY)) pointer.moved = true;
  if (pointer.moved) {
    event.preventDefault();
    resultGallery.classList.add("is-dragging");
  }
}

function handleGalleryPointerUp(event) {
  const pointer = galleryState.pointer;
  if (!pointer || (event.type !== "pointercancel" && pointer.id !== event.pointerId)) return;
  if (pointer.moved) {
    if (Math.abs(pointer.deltaX) >= 32) moveGallery(pointer.deltaX < 0 ? 1 : -1);
    galleryState.suppressClick = true;
  }
  galleryState.pointer = null;
  resultGallery.classList.remove("is-dragging");
}

resultGallery.addEventListener("keydown", handleGalleryKeydown);
resultGallery.addEventListener("pointerdown", handleGalleryPointerDown);
resultGallery.addEventListener("pointermove", handleGalleryPointerMove);
resultGallery.addEventListener("pointerup", handleGalleryPointerUp);
resultGallery.addEventListener("pointercancel", handleGalleryPointerUp);

function showResult() {
  quiz.hidden = true;
  const affinityAnswers = AFFINITY_QUESTIONS.map(({ id }) => state.responses[id]);
  const classification = classifyAnswers(affinityAnswers);
  state.result = classification.result;
  const content = RESULTS[state.result];
  result.dataset.result = state.result;
  resultWordmark.textContent = content.title;
  resultLogo.hidden = true;
  resultTitle.classList.remove("has-official-logo");
  resultLogo.src = content.logo;
  resultCopy.textContent = content.copy;
  resultSubtitle.textContent = content.subtitle || "Uma afinidade editorial para conhecer Gramado do seu jeito.";
  resultBenefits.replaceChildren(...(content.benefits || []).map((benefit) => {
    const item = document.createElement("li");
    item.textContent = benefit;
    return item;
  }));
  renderResultGallery(content.gallery || []);
  leadTitle.textContent = content.leadTitle || "Fale com a Ownerinc";
  resultLink.hidden = true;
  const destination = destinationUrls[state.result];
  if (destination) {
    resultLink.href = destination;
    resultLink.hidden = false;
  }
  result.hidden = false;
  leadForm.hidden = false;
  result.scrollIntoView({ block: "start", behavior: "instant" });
  resultTitle.focus({ preventScroll: true });
}

resultLogo.addEventListener("load", () => {
  resultLogo.hidden = false;
  resultTitle.classList.add("has-official-logo");
});

resultLogo.addEventListener("error", () => {
  resultLogo.hidden = true;
  resultTitle.classList.remove("has-official-logo");
});

document.querySelector("#start").addEventListener("click", () => {
  intro.hidden = true;
  quiz.hidden = false;
  renderQuestion({ focus: true });
});

quizForm.addEventListener("change", (event) => {
  if (event.target.name !== "answer") return;
  state.responses[state.questions[state.questionIndex].id] = event.target.value;
  choices.forEach((choice, index) => choice.classList.toggle("is-selected", radios[index].checked));
  continueButton.disabled = false;
});

quizForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.responses[state.questions[state.questionIndex].id]) return;
  if (state.questionIndex === state.questions.length - 1) {
    showResult();
    return;
  }
  state.questionIndex += 1;
  renderQuestion({ focus: true });
});

back.addEventListener("click", () => {
  if (state.questionIndex === 0) {
    quiz.hidden = true;
    intro.hidden = false;
    document.querySelector("#intro-title").focus();
    return;
  }
  state.questionIndex -= 1;
  renderQuestion({ focus: true });
});

function restartQuiz() {
  state.questionIndex = 0;
  state.questions = QUESTIONS;
  state.responses = {};
  state.result = null;
  state.submissionAttempt = createSubmissionAttempt();
  quiz.hidden = true;
  result.hidden = true;
  result.removeAttribute("data-result");
  leadForm.hidden = false;
  success.hidden = true;
  leadForm.reset();
  leadForm.removeAttribute("aria-busy");
  leadError.hidden = true;
  resultLink.hidden = true;
  intro.hidden = false;
  submitLead.disabled = !configReady;
  submitLead.textContent = configReady ? "Enviar meus dados" : "Carregando…";
  document.querySelector("#intro-title").focus();
  scrollTo({ top: 0, behavior: getScrollBehavior() });
}

document.querySelector("#restart-result").addEventListener("click", restartQuiz);
document.querySelector("#restart-success").addEventListener("click", restartQuiz);

document.querySelector("#show-lead-form").addEventListener("click", () => {
  resultLeadScreen.scrollIntoView({ block: "start", behavior: getScrollBehavior() });
  leadTitle.focus({ preventScroll: true });
});

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  leadError.hidden = true;
  if (!configReady) {
    leadError.textContent = "As configurações de atendimento ainda não foram carregadas. Atualize a página antes de enviar.";
    leadError.hidden = false;
    leadError.focus();
    return;
  }
  submitLead.disabled = true;
  submitLead.textContent = "Enviando…";
  leadForm.setAttribute("aria-busy", "true");

  const fields = new FormData(leadForm);
  const payload = toClientSubmission({
    attempt: state.submissionAttempt,
    contact: {
      name: fields.get("name"),
      whatsapp: fields.get("whatsapp"),
      email: fields.get("email")
    },
    consentGranted: fields.get("consent") === "on",
    responses: state.responses,
    resultKey: state.result,
    campaign: utm
  });

  let responseError;
  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.status !== 202) {
      const body = await response.json().catch(() => ({}));
      responseError = typeof body.error === "string" ? body.error : retryMessage;
      throw new Error();
    }
    leadForm.hidden = true;
    success.hidden = false;
    document.querySelector("#success-title").focus();
  } catch {
    leadError.textContent = responseError || retryMessage;
    leadError.hidden = false;
    leadError.focus();
  } finally {
    leadForm.removeAttribute("aria-busy");
    submitLead.disabled = !configReady;
    submitLead.textContent = configReady ? "Enviar meus dados" : "Carregando…";
  }
});

function requireHttpsUrl(value) {
  if (typeof value !== "string" || new URL(value).protocol !== "https:") throw new Error();
  return value;
}

fetch("/api/config")
  .then((response) => {
    if (!response.ok) throw new Error();
    return response.json();
  })
  .then((config) => {
    const privacyPolicyUrl = requireHttpsUrl(config.privacyPolicyUrl);
    destinationUrls.owntime = requireHttpsUrl(config.owntimeUrl);
    destinationUrls.nest = requireHttpsUrl(config.nestUrl);
    document.querySelector('[data-config="privacyPolicyUrl"]').href = privacyPolicyUrl;
    configReady = true;
    configStatus.hidden = true;
    submitLead.disabled = false;
    submitLead.textContent = "Enviar meus dados";
    if (state.result && destinationUrls[state.result]) {
      resultLink.href = destinationUrls[state.result];
      resultLink.hidden = false;
    }
  })
  .catch(() => {
    configStatus.textContent = "Não foi possível carregar a Política de Privacidade e os links oficiais. Atualize a página para tentar novamente; o envio permanece indisponível.";
    configStatus.setAttribute("role", "alert");
    configStatus.classList.add("form-status--error");
  });
