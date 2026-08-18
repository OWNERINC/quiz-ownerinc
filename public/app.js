import { AFFINITY_QUESTIONS, QUESTIONS, classifyAnswers } from "./quiz.js";
import { createSubmissionAttempt, toClientSubmission } from "./client-submission.js";

const RESULTS = {
  owntime: {
    title: "Owntime",
    logo: "/assets/results/owntime-logo-white.png",
    copy: "Suas respostas se aproximam editorialmente do Owntime. Um ponto de partida para conhecer uma proposta de espaço, natureza e convivência."
  },
  nest: {
    title: "Nest Mountain Lodge",
    logo: "/assets/results/nest-logo-white.png",
    copy: "Suas respostas se aproximam editorialmente do Nest Mountain Lodge. Um ponto de partida para conhecer uma proposta de arquitetura, bem-estar e contemplação."
  }
};

const state = {
  questionIndex: 0,
  questions: QUESTIONS,
  responses: {},
  result: null,
  submissionAttempt: createSubmissionAttempt()
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
const resultLink = document.querySelector("#result-link");
const leadForm = document.querySelector("#lead-form");
const leadTitle = document.querySelector("#lead-title");
const leadError = document.querySelector("#lead-error");
const configStatus = document.querySelector("#config-status");
const submitLead = document.querySelector("#submit-lead");
const success = document.querySelector("#success");

function renderQuestion({ focus = false } = {}) {
  const question = state.questions[state.questionIndex];
  progress.textContent = `Pergunta ${state.questionIndex + 1} de ${state.questions.length}`;
  prompt.textContent = question.prompt;
  choices.forEach((choice, index) => {
    const option = question.options[index];
    choice.hidden = !option;
    if (!option) return;
    radios[index].value = option.value;
    radios[index].checked = state.responses[question.id] === option.value;
    labels[index].textContent = option.label;
  });
  back.disabled = false;
  back.textContent = state.questionIndex === 0 ? "Início" : "Voltar";
  continueButton.disabled = !state.responses[question.id];
  continueButton.textContent = state.questionIndex === state.questions.length - 1 ? "Ver meu resultado" : "Continuar";
  if (focus) prompt.focus();
}

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
  resultLink.hidden = true;
  const destination = destinationUrls[state.result];
  if (destination) {
    resultLink.href = destination;
    resultLink.hidden = false;
  }
  result.hidden = false;
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
  result.classList.remove("is-revealed");
  result.removeAttribute("data-result");
  leadForm.hidden = true;
  success.hidden = true;
  leadForm.reset();
  leadForm.removeAttribute("aria-busy");
  leadError.hidden = true;
  resultLink.hidden = true;
  intro.hidden = false;
  submitLead.disabled = !configReady;
  submitLead.textContent = configReady ? "Enviar meus dados" : "Carregando…";
  document.querySelector("#intro-title").focus();
  scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelector("#restart-result").addEventListener("click", restartQuiz);
document.querySelector("#restart-success").addEventListener("click", restartQuiz);

document.querySelector("#show-lead-form").addEventListener("click", () => {
  leadForm.hidden = false;
  leadTitle.focus();
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
