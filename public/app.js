import { QUESTIONS, classifyAnswers } from "./quiz.js";

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

const state = { step: "intro", questionIndex: 0, answers: Array(QUESTIONS.length).fill(null), result: null };
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

const intro = document.querySelector("#intro");
const quiz = document.querySelector("#quiz");
const quizForm = document.querySelector("#quiz-form");
const progress = document.querySelector("#quiz-progress");
const prompt = document.querySelector("#question-prompt");
const radios = [...document.querySelectorAll('input[name="answer"]')];
const labels = radios.map((radio) => document.querySelector(`label[for="${radio.id}"]`));
const back = document.querySelector("#back");
const continueButton = document.querySelector("#continue");
const result = document.querySelector("#result");
const resultTitle = document.querySelector("#result-title");
const resultCopy = document.querySelector("#result-copy");
const resultLink = document.querySelector("#result-link");
const leadForm = document.querySelector("#lead-form");
const leadTitle = document.querySelector("#lead-title");
const leadError = document.querySelector("#lead-error");
const submitLead = document.querySelector("#submit-lead");
const success = document.querySelector("#success");
const pageError = document.querySelector("#page-error");

function renderQuestion({ focus = false } = {}) {
  const question = QUESTIONS[state.questionIndex];
  progress.textContent = `Pergunta ${state.questionIndex + 1} de ${QUESTIONS.length}`;
  prompt.textContent = question.prompt;
  question.options.forEach((option, index) => {
    radios[index].value = option.value;
    radios[index].checked = state.answers[state.questionIndex] === option.value;
    labels[index].textContent = option.label;
  });
  back.disabled = state.questionIndex === 0;
  continueButton.disabled = state.answers[state.questionIndex] === null;
  continueButton.textContent = state.questionIndex === QUESTIONS.length - 1 ? "Ver meu resultado" : "Continuar";
  if (focus) prompt.focus();
}

function showResult() {
  state.step = "reveal";
  quiz.hidden = true;
  const classification = classifyAnswers(state.answers);
  state.result = classification.result;
  const content = RESULTS[state.result];
  result.dataset.result = state.result;
  resultTitle.textContent = content.title;
  resultCopy.textContent = content.copy;
  const destination = destinationUrls[state.result];
  if (destination) {
    resultLink.href = destination;
    resultLink.hidden = false;
  }
  result.hidden = false;
  state.step = "result";
  resultTitle.focus();
}

document.querySelector("#start").addEventListener("click", () => {
  state.step = "quiz";
  intro.hidden = true;
  quiz.hidden = false;
  renderQuestion({ focus: true });
});

quizForm.addEventListener("change", (event) => {
  if (event.target.name !== "answer") return;
  state.answers[state.questionIndex] = event.target.value;
  continueButton.disabled = false;
});

quizForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.answers[state.questionIndex] === null) return;
  if (state.questionIndex === QUESTIONS.length - 1) {
    showResult();
    return;
  }
  state.questionIndex += 1;
  renderQuestion({ focus: true });
});

back.addEventListener("click", () => {
  if (state.questionIndex === 0) return;
  state.questionIndex -= 1;
  renderQuestion({ focus: true });
});

document.querySelector("#show-lead-form").addEventListener("click", () => {
  state.step = "form";
  leadForm.hidden = false;
  leadTitle.focus();
});

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  leadError.hidden = true;
  submitLead.disabled = true;

  const fields = new FormData(leadForm);
  const payload = {
    name: fields.get("name"),
    whatsapp: fields.get("whatsapp"),
    email: fields.get("email"),
    consent: fields.get("consent") === "on",
    answers: state.answers,
    result: state.result,
    utm
  };

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.status !== 201) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Nao foi possivel enviar seus dados. Tente novamente.");
    }
    state.step = "success";
    leadForm.hidden = true;
    success.hidden = false;
    document.querySelector("#success-title").focus();
  } catch (error) {
    leadError.textContent = error.message;
    leadError.hidden = false;
  } finally {
    submitLead.disabled = false;
  }
});

fetch("/api/config")
  .then((response) => {
    if (!response.ok) throw new Error();
    return response.json();
  })
  .then((config) => {
    document.querySelector('[data-config="privacyPolicyUrl"]').href = config.privacyPolicyUrl;
    destinationUrls.owntime = config.owntimeUrl;
    destinationUrls.nest = config.nestUrl;
    if (state.result && destinationUrls[state.result]) {
      resultLink.href = destinationUrls[state.result];
      resultLink.hidden = false;
    }
  })
  .catch(() => {
    pageError.textContent = "Nao foi possivel carregar os links oficiais. Atualize a pagina e tente novamente.";
    pageError.hidden = false;
  });
